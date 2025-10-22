<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Resource;
use App\Models\Store;
use App\Models\Menu;
use App\Models\BusinessCalendar;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * AvailabilityService
 * 
 * tugical空き時間判定・リソース可用性管理サービス
 * 
 * 主要機能:
 * - リアルタイム空き時間枠検索
 * - リソース可用性判定（staff/room/equipment/vehicle）
 * - 営業時間・営業カレンダー考慮
 * - 複数制約同時処理（リソース × メニュー × 時間）
 * - キャッシュ活用による高速応答
 * - マルチテナント対応（store_id分離）
 * 
 * @package App\Services
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class AvailabilityService
{
    /**
     * キャッシュキープレフィックス
     */
    protected const CACHE_PREFIX = 'availability';

    /**
     * キャッシュ有効期間（分）
     */
    protected const CACHE_TTL = 15;

    /**
     * 空き時間枠検索
     * 
     * 指定条件での利用可能時間枠を返す
     * 営業時間・既存予約・リソース制約を考慮
     * 
     * @param int $storeId 店舗ID
     * @param string $date 検索日（Y-m-d）
     * @param int $menuId メニューID
     * @param int|null $resourceId 指定リソースID（null=任意）
     * @return array 利用可能時間枠リスト
     * [
     *   {
     *     "start_time": "09:00",
     *     "end_time": "10:00", 
     *     "available_resources": [1, 2, 3],
     *     "menu_duration": 60
     *   }
     * ]
     */
    public function getAvailableSlots(int $storeId, string $date, int $menuId, ?int $resourceId = null): array
    {
        // キャッシュキー生成
        $cacheKey = $this->getCacheKey('slots', [
            'store_id' => $storeId,
            'date' => $date,
            'menu_id' => $menuId,
            'resource_id' => $resourceId
        ]);

        // キャッシュから取得試行
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            Log::info('Availability slots cache hit', [
                'store_id' => $storeId,
                'date' => $date,
                'cache_key' => $cacheKey
            ]);
            return $cached;
        }

        try {
            // メニュー情報取得
            $menu = Menu::where('store_id', $storeId)
                ->where('id', $menuId)
                ->first();

            if (!$menu) {
                Log::warning('Menu not found for availability calculation', [
                    'store_id' => $storeId,
                    'menu_id' => $menuId
                ]);
                return [];
            }

            // 営業時間内チェック
            if (!$this->isWithinBusinessHours($storeId, $date, '00:00')) {
                Log::info('Date is outside business hours', [
                    'store_id' => $storeId,
                    'date' => $date
                ]);
                return [];
            }

            // 店舗情報取得
            $store = Store::find($storeId);
            $businessHours = $this->getBusinessHoursForDate($store, $date);

            if (!$businessHours) {
                return [];
            }

            // 利用可能リソース取得
            $availableResources = $this->getAvailableResourcesForDate($storeId, $date, $resourceId);
            
            if (empty($availableResources)) {
                return [];
            }

            // メニュー所要時間計算（効率率考慮）
            $totalDuration = $menu->prep_duration + $menu->base_duration + $menu->cleanup_duration;
            
            // 空き時間枠生成
            $slots = $this->generateTimeSlots(
                $storeId,
                $date,
                $businessHours,
                $totalDuration,
                $availableResources
            );

            // キャッシュに保存
            Cache::put($cacheKey, $slots, now()->addMinutes(self::CACHE_TTL));

            Log::info('Generated availability slots', [
                'store_id' => $storeId,
                'date' => $date,
                'menu_id' => $menuId,
                'slots_count' => count($slots)
            ]);

            return $slots;

        } catch (\Exception $e) {
            Log::error('Failed to get available slots', [
                'store_id' => $storeId,
                'date' => $date,
                'menu_id' => $menuId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * リソース可用性チェック
     * 
     * 指定リソースが指定時間に利用可能かチェック
     * 
     * @param int $resourceId リソースID
     * @param string $date 日付（Y-m-d）
     * @param string $startTime 開始時間（H:i）
     * @param string $endTime 終了時間（H:i）
     * @return bool 利用可能な場合true
     */
    public function isResourceAvailable(int $resourceId, string $date, string $startTime, string $endTime): bool
    {
        try {
            // リソース情報取得
            $resource = Resource::with('store')->find($resourceId);
            
            if (!$resource) {
                Log::warning('Resource not found for availability check', [
                    'resource_id' => $resourceId
                ]);
                return false;
            }

            $storeId = $resource->store_id;

            // 営業時間内チェック
            if (!$this->isWithinBusinessHours($storeId, $date, $startTime)) {
                return false;
            }

            // リソース稼働時間チェック
            if (!$this->isResourceWorkingTime($resource, $date, $startTime, $endTime)) {
                return false;
            }

            // 既存予約との競合チェック
            $conflictingBookings = Booking::where('store_id', $storeId)
                ->where('resource_id', $resourceId)
                ->whereDate('booking_date', $date)
                ->whereIn('status', ['confirmed', 'pending'])
                ->where(function($query) use ($startTime, $endTime) {
                    $query->where(function($q) use ($startTime, $endTime) {
                        // 新規予約の開始時間が既存予約と重複
                        $q->where('start_time', '<', $endTime)
                          ->where('end_time', '>', $startTime);
                    });
                })
                ->exists();

            if ($conflictingBookings) {
                Log::info('Resource time conflict detected', [
                    'resource_id' => $resourceId,
                    'date' => $date,
                    'start_time' => $startTime,
                    'end_time' => $endTime
                ]);
                return false;
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Failed to check resource availability', [
                'resource_id' => $resourceId,
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 営業時間内チェック
     * 
     * 指定日時が店舗営業時間内かチェック
     * business_calendarsテーブルの特別営業・定休日も考慮
     * 
     * @param int $storeId 店舗ID
     * @param string $date 日付（Y-m-d）
     * @param string $startTime 開始時間（H:i）
     * @return bool 営業時間内の場合true
     */
    public function isWithinBusinessHours(int $storeId, string $date, string $startTime): bool
    {
        try {
            $store = Store::find($storeId);
            
            if (!$store || !$store->business_hours) {
                Log::warning('Store or business hours not found', [
                    'store_id' => $storeId
                ]);
                return false;
            }

            // 特別営業カレンダーチェック
            $specialCalendar = BusinessCalendar::where('store_id', $storeId)
                ->whereDate('date', $date)
                ->first();

            if ($specialCalendar) {
                // 定休日の場合
                if ($specialCalendar->is_closed) {
                    return false;
                }
                
                // 特別営業時間が設定されている場合
                if ($specialCalendar->special_hours) {
                    return $this->isTimeWithinHours($startTime, $specialCalendar->special_hours);
                }
            }

            // 通常営業時間チェック
            $dayOfWeek = Carbon::parse($date)->format('w'); // 0=日曜日
            $businessHours = $store->business_hours;

            // 曜日別営業時間取得
            $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            $dayName = $dayNames[$dayOfWeek];

            if (!isset($businessHours[$dayName]) || !$businessHours[$dayName]['is_open']) {
                return false;
            }

            $dayHours = $businessHours[$dayName];
            return $this->isTimeWithinHours($startTime, $dayHours);

        } catch (\Exception $e) {
            Log::error('Failed to check business hours', [
                'store_id' => $storeId,
                'date' => $date,
                'start_time' => $startTime,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 月間可用性カレンダー生成
     * 
     * 指定期間での可用性カレンダーを生成
     * LIFF予約画面での月表示等に使用
     * 
     * @param int $storeId 店舗ID
     * @param int $menuId メニューID
     * @param int $days 検索日数（デフォルト30日）
     * @return array 日別可用性情報
     * [
     *   "2025-06-30" => {
     *     "available": true,
     *     "slots_count": 8,
     *     "first_available": "09:00",
     *     "last_available": "17:00"
     *   }
     * ]
     */
    public function getAvailabilityCalendar(int $storeId, int $menuId, int $days = 30): array
    {
        // キャッシュキー生成
        $cacheKey = $this->getCacheKey('calendar', [
            'store_id' => $storeId,
            'menu_id' => $menuId,
            'days' => $days
        ]);

        // キャッシュから取得試行
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $calendar = [];
            $today = Carbon::today();

            for ($i = 0; $i < $days; $i++) {
                $date = $today->copy()->addDays($i);
                $dateString = $date->format('Y-m-d');

                // 過去の日付はスキップ
                if ($date->isPast()) {
                    continue;
                }

                // その日の空き時間枠を取得
                $slots = $this->getAvailableSlots($storeId, $dateString, $menuId);

                $calendar[$dateString] = [
                    'available' => !empty($slots),
                    'slots_count' => count($slots),
                    'first_available' => !empty($slots) ? $slots[0]['start_time'] : null,
                    'last_available' => !empty($slots) ? end($slots)['start_time'] : null
                ];
            }

            // キャッシュに保存（短時間）
            Cache::put($cacheKey, $calendar, now()->addMinutes(5));

            Log::info('Generated availability calendar', [
                'store_id' => $storeId,
                'menu_id' => $menuId,
                'days' => $days,
                'available_days' => count(array_filter($calendar, fn($day) => $day['available']))
            ]);

            return $calendar;

        } catch (\Exception $e) {
            Log::error('Failed to generate availability calendar', [
                'store_id' => $storeId,
                'menu_id' => $menuId,
                'days' => $days,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * 指定日の営業時間取得
     * 
     * @param Store $store 店舗モデル
     * @param string $date 日付
     * @return array|null 営業時間情報
     */
    protected function getBusinessHoursForDate(Store $store, string $date): ?array
    {
        // 特別営業カレンダーをチェック
        $specialCalendar = BusinessCalendar::where('store_id', $store->id)
            ->whereDate('date', $date)
            ->first();

        if ($specialCalendar) {
            if ($specialCalendar->is_closed) {
                return null;
            }
            if ($specialCalendar->special_hours) {
                return $specialCalendar->special_hours;
            }
        }

        // 通常営業時間
        $dayOfWeek = Carbon::parse($date)->format('w');
        $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        $dayName = $dayNames[$dayOfWeek];

        $businessHours = $store->business_hours;
        
        if (!isset($businessHours[$dayName]) || !$businessHours[$dayName]['is_open']) {
            return null;
        }

        return $businessHours[$dayName];
    }

    /**
     * 指定日の利用可能リソース取得
     * 
     * @param int $storeId 店舗ID
     * @param string $date 日付
     * @param int|null $resourceId 指定リソースID
     * @return array リソース一覧
     */
    protected function getAvailableResourcesForDate(int $storeId, string $date, ?int $resourceId = null): array
    {
        $query = Resource::where('store_id', $storeId)
            ->where('is_active', true);

        if ($resourceId) {
            $query->where('id', $resourceId);
        }

        return $query->get()->filter(function($resource) use ($date) {
            // リソースの稼働日チェック
            if ($resource->working_hours) {
                $dayOfWeek = Carbon::parse($date)->format('w');
                $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                $dayName = $dayNames[$dayOfWeek];
                
                return isset($resource->working_hours[$dayName]) && 
                       $resource->working_hours[$dayName]['is_working'];
            }
            
            return true;
        })->toArray();
    }

    /**
     * 時間枠生成
     * 
     * @param int $storeId 店舗ID
     * @param string $date 日付
     * @param array $businessHours 営業時間
     * @param int $duration 所要時間（分）
     * @param array $resources 利用可能リソース
     * @return array 時間枠一覧
     */
    protected function generateTimeSlots(int $storeId, string $date, array $businessHours, int $duration, array $resources): array
    {
        $slots = [];
        $startTime = Carbon::parse($businessHours['start']);
        $endTime = Carbon::parse($businessHours['end']);
        $slotInterval = 15; // 15分間隔で時間枠を生成

        while ($startTime->copy()->addMinutes($duration)->lte($endTime)) {
            $slotStart = $startTime->format('H:i');
            $slotEnd = $startTime->copy()->addMinutes($duration)->format('H:i');

            // この時間枠で利用可能なリソースを取得
            $availableResources = [];
            foreach ($resources as $resource) {
                if ($this->isResourceAvailable($resource['id'], $date, $slotStart, $slotEnd)) {
                    $availableResources[] = $resource['id'];
                }
            }

            // 利用可能なリソースがある場合のみ時間枠に追加
            if (!empty($availableResources)) {
                $slots[] = [
                    'start_time' => $slotStart,
                    'end_time' => $slotEnd,
                    'available_resources' => $availableResources,
                    'menu_duration' => $duration
                ];
            }

            $startTime->addMinutes($slotInterval);
        }

        return $slots;
    }

    /**
     * 時間が営業時間内かチェック
     * 
     * @param string $time チェック時間
     * @param array $hours 営業時間
     * @return bool
     */
    protected function isTimeWithinHours(string $time, array $hours): bool
    {
        $checkTime = Carbon::parse($time);
        $startTime = Carbon::parse($hours['start']);
        $endTime = Carbon::parse($hours['end']);

        return $checkTime->gte($startTime) && $checkTime->lt($endTime);
    }

    /**
     * リソースが稼働時間内かチェック
     * 
     * @param Resource $resource リソース
     * @param string $date 日付
     * @param string $startTime 開始時間
     * @param string $endTime 終了時間
     * @return bool
     */
    protected function isResourceWorkingTime(Resource $resource, string $date, string $startTime, string $endTime): bool
    {
        if (!$resource->working_hours) {
            return true; // 稼働時間設定がない場合は常時利用可能
        }

        $dayOfWeek = Carbon::parse($date)->format('w');
        $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        $dayName = $dayNames[$dayOfWeek];

        if (!isset($resource->working_hours[$dayName]) || !$resource->working_hours[$dayName]['is_working']) {
            return false;
        }

        $workingHours = $resource->working_hours[$dayName];
        
        return $this->isTimeWithinHours($startTime, $workingHours) &&
               $this->isTimeWithinHours($endTime, $workingHours);
    }

    /**
     * キャッシュキー生成
     * 
     * @param string $type キャッシュタイプ
     * @param array $params パラメータ
     * @return string キャッシュキー
     */
    protected function getCacheKey(string $type, array $params): string
    {
        return sprintf(
            '%s:%s:%s',
            self::CACHE_PREFIX,
            $type,
            md5(serialize($params))
        );
    }

    /**
     * キャッシュクリア
     * 
     * 予約作成・更新時にキャッシュを無効化
     * 
     * @param int $storeId 店舗ID
     * @param string|null $date 特定日のみクリア
     * @return void
     */
    public function clearCache(int $storeId, ?string $date = null): void
    {
        try {
            $pattern = self::CACHE_PREFIX . ':*';
            
            if ($date) {
                $pattern .= ':*' . $date . '*';
            }

            // Laravel Cacheはパターンマッチでの削除をサポートしていないため
            // 実装時にはRedisを直接使用するか、キャッシュキーを管理する仕組みが必要
            Cache::flush(); // 暫定的に全キャッシュクリア
            
            Log::info('Availability cache cleared', [
                'store_id' => $storeId,
                'date' => $date
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to clear availability cache', [
                'store_id' => $storeId,
                'date' => $date,
                'error' => $e->getMessage()
            ]);
        }
    }
} 