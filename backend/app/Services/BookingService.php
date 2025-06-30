<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Customer;
use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * BookingService
 * 
 * tugical予約システムの中核となるビジネスロジックサービス
 * 
 * 主要機能:
 * - 予約作成・更新・キャンセル処理
 * - 時間競合検出・回避システム
 * - 動的料金計算（ベース + オプション + リソース差額）
 * - Hold Token統合による10分間排他制御
 * - LINE通知自動送信連携
 * - マルチテナント対応（完全store_id分離）
 * 
 * @package App\Services
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class BookingService
{
    /**
     * Hold Token Service
     * 10分間の仮押さえ管理
     */
    protected HoldTokenService $holdTokenService;

    /**
     * Notification Service
     * LINE通知・メール通知管理
     */
    protected NotificationService $notificationService;

    /**
     * Availability Service
     * 空き時間判定・可用性チェック
     */
    protected AvailabilityService $availabilityService;

    /**
     * コンストラクタ
     * 
     * @param HoldTokenService $holdTokenService
     * @param NotificationService $notificationService
     * @param AvailabilityService $availabilityService
     */
    public function __construct(
        HoldTokenService $holdTokenService,
        NotificationService $notificationService,
        AvailabilityService $availabilityService
    ) {
        $this->holdTokenService = $holdTokenService;
        $this->notificationService = $notificationService;
        $this->availabilityService = $availabilityService;
    }

    /**
     * 予約作成
     * 
     * tugical予約方程式: 予約 = リソース × 時間枠 × メニュー
     * 
     * 処理フロー:
     * 1. Hold Token検証・解放
     * 2. 時間競合チェック
     * 3. 営業時間内チェック
     * 4. 料金計算（ベース + オプション + リソース差額）
     * 5. 予約レコード作成
     * 6. LINE通知自動送信
     * 
     * @param int $storeId 店舗ID（マルチテナント分離）
     * @param array $bookingData 予約データ
     * @return Booking 作成された予約
     * @throws \App\Exceptions\BookingConflictException 予約競合時
     * @throws \App\Exceptions\HoldTokenExpiredException Hold Token期限切れ時
     * @throws \App\Exceptions\OutsideBusinessHoursException 営業時間外時
     */
    public function createBooking(int $storeId, array $bookingData): Booking
    {
        Log::info('予約作成開始', [
            'store_id' => $storeId,
            'booking_data' => $bookingData
        ]);

        return DB::transaction(function () use ($storeId, $bookingData) {
            // 1. Hold Token検証・解放
            if (isset($bookingData['hold_token'])) {
                $this->validateAndReleaseHoldToken(
                    $bookingData['hold_token'],
                    $storeId,
                    $bookingData['resource_id'] ?? null,
                    $bookingData['booking_date'],
                    $bookingData['start_time']
                );
            }

            // 2. 時間競合チェック
            if ($this->checkTimeConflict($storeId, $bookingData)) {
                Log::warning('予約競合検出', [
                    'store_id' => $storeId,
                    'resource_id' => $bookingData['resource_id'] ?? null,
                    'booking_date' => $bookingData['booking_date'],
                    'start_time' => $bookingData['start_time']
                ]);
                
                throw new \Exception('指定時間は既に予約されています');
            }

            // 3. 営業時間内チェック
            if (!$this->isWithinBusinessHours(
                $storeId,
                $bookingData['booking_date'],
                $bookingData['start_time'],
                $bookingData['end_time'] ?? $this->calculateEndTime($bookingData)
            )) {
                throw new \Exception('営業時間外の予約は受け付けできません');
            }

            // 4. 料金計算
            $menu = Menu::where('store_id', $storeId)
                       ->findOrFail($bookingData['menu_id']);
            
            $resource = null;
            if (!empty($bookingData['resource_id'])) {
                $resource = Resource::where('store_id', $storeId)
                                  ->findOrFail($bookingData['resource_id']);
            }

            $totalPrice = $this->calculateTotalPrice(
                $menu,
                $bookingData['option_ids'] ?? [],
                $resource
            );

            // 5. 予約レコード作成
            $booking = Booking::create([
                'store_id' => $storeId,
                'booking_number' => $this->generateBookingNumber($storeId),
                'customer_id' => $bookingData['customer_id'],
                'menu_id' => $bookingData['menu_id'],
                'resource_id' => $bookingData['resource_id'] ?? null,
                'booking_date' => $bookingData['booking_date'],
                'start_time' => $bookingData['start_time'],
                'end_time' => $bookingData['end_time'] ?? $this->calculateEndTime($bookingData),
                'status' => $bookingData['auto_approval'] ?? true ? 'confirmed' : 'pending',
                'total_price' => $totalPrice,
                'customer_notes' => $bookingData['customer_notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // オプション関連付け
            if (!empty($bookingData['option_ids'])) {
                foreach ($bookingData['option_ids'] as $optionId) {
                    $booking->options()->attach($optionId);
                }
            }

            // 6. LINE通知自動送信（非同期）
            $this->notificationService->sendBookingConfirmation($booking);

            Log::info('予約作成完了', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'total_price' => $totalPrice
            ]);

            return $booking;
        });
    }

    /**
     * 予約更新
     * 
     * 既存予約の変更処理（時間変更・オプション変更等）
     * 
     * @param Booking $booking 更新対象予約
     * @param array $updateData 更新データ
     * @return Booking 更新された予約
     * @throws \App\Exceptions\BookingConflictException 変更後時間で競合時
     */
    public function updateBooking(Booking $booking, array $updateData): Booking
    {
        // TODO: 実装予定
        throw new \Exception('BookingService::updateBooking() - 実装予定');
    }

    /**
     * 予約キャンセル
     * 
     * キャンセル処理・通知送信・Hold Token解放
     * 
     * @param Booking $booking キャンセル対象予約
     * @param string|null $reason キャンセル理由
     * @return bool キャンセル成功可否
     */
    public function cancelBooking(Booking $booking, ?string $reason = null): bool
    {
        // TODO: 実装予定
        throw new \Exception('BookingService::cancelBooking() - 実装予定');
    }

    /**
     * 時間競合チェック
     * 
     * 指定時間枠でのリソース予約競合を検出
     * マルチテナント対応（同一store_id内でのみチェック）
     * 
     * @param int $storeId 店舗ID
     * @param array $bookingData 予約データ（resource_id, booking_date, start_time, end_time）
     * @param int|null $excludeBookingId 除外する予約ID（更新時用）
     * @return bool 競合がある場合true
     */
    public function checkTimeConflict(int $storeId, array $bookingData, ?int $excludeBookingId = null): bool
    {
        $resourceId = $bookingData['resource_id'] ?? null;
        $bookingDate = $bookingData['booking_date'];
        $startTime = $bookingData['start_time'];
        $endTime = $bookingData['end_time'] ?? $this->calculateEndTime($bookingData);

        // リソース指定がない場合は店舗全体での競合チェック
        $query = Booking::where('store_id', $storeId)
                       ->whereDate('booking_date', $bookingDate)
                       ->whereIn('status', ['confirmed', 'pending']);

        // リソース指定がある場合はそのリソースのみチェック
        if ($resourceId) {
            $query->where('resource_id', $resourceId);
        }

        // 更新時は既存予約を除外
        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        // 時間重複チェック
        // 条件: 新規予約の開始時間が既存予約の時間帯と重複する
        $conflictingBookings = $query->where(function ($timeQuery) use ($startTime, $endTime) {
            $timeQuery
                // ケース1: 新規開始時間が既存予約時間内
                ->whereBetween('start_time', [$startTime, $endTime])
                // ケース2: 新規終了時間が既存予約時間内
                ->orWhereBetween('end_time', [$startTime, $endTime])
                // ケース3: 新規予約が既存予約を完全に包含
                ->orWhere(function ($innerQuery) use ($startTime, $endTime) {
                    $innerQuery->where('start_time', '<=', $startTime)
                              ->where('end_time', '>=', $endTime);
                })
                // ケース4: 既存予約が新規予約を完全に包含
                ->orWhere(function ($innerQuery) use ($startTime, $endTime) {
                    $innerQuery->where('start_time', '>=', $startTime)
                              ->where('end_time', '<=', $endTime);
                });
        })->exists();

        if ($conflictingBookings) {
            Log::warning('時間競合検出', [
                'store_id' => $storeId,
                'resource_id' => $resourceId,
                'booking_date' => $bookingDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'exclude_booking_id' => $excludeBookingId
            ]);
        }

        return $conflictingBookings;
    }

    /**
     * 動的料金計算
     * 
     * tugical料金方程式:
     * 総額 = ベース料金 + オプション料金 + リソース差額 + 指名料
     * 
     * @param Menu $menu メニューオブジェクト
     * @param array $optionIds オプションIDリスト
     * @param Resource|null $resource リソースオブジェクト（指名時）
     * @return int 計算された総額（税込み円）
     */
    public function calculateTotalPrice(Menu $menu, array $optionIds = [], ?Resource $resource = null): int
    {
        // 1. ベース料金
        $totalPrice = $menu->price;

        Log::info('料金計算開始', [
            'menu_id' => $menu->id,
            'base_price' => $menu->price,
            'option_ids' => $optionIds,
            'resource_id' => $resource?->id
        ]);

        // 2. オプション料金加算
        if (!empty($optionIds)) {
            $options = \App\Models\MenuOption::whereIn('id', $optionIds)
                                             ->where('menu_id', $menu->id)
                                             ->get();
            
            foreach ($options as $option) {
                $totalPrice += $option->price;
                Log::debug('オプション料金加算', [
                    'option_id' => $option->id,
                    'option_name' => $option->name,
                    'option_price' => $option->price,
                    'running_total' => $totalPrice
                ]);
            }
        }

        // 3. リソース差額計算（指名料・スキル差額）
        if ($resource) {
            // リソース別料金差額（hourly_rate_diff）
            if ($resource->hourly_rate_diff && $resource->hourly_rate_diff != 0) {
                // メニュー時間に基づいて時間料金を計算
                $durationMinutes = $menu->duration;
                $hourlyDiff = ($durationMinutes / 60) * $resource->hourly_rate_diff;
                $totalPrice += intval($hourlyDiff);

                Log::debug('リソース差額加算', [
                    'resource_id' => $resource->id,
                    'resource_name' => $resource->name,
                    'hourly_rate_diff' => $resource->hourly_rate_diff,
                    'duration_minutes' => $durationMinutes,
                    'calculated_diff' => $hourlyDiff,
                    'running_total' => $totalPrice
                ]);
            }

            // 指名料（attributes.nomination_fee）
            $attributes = is_string($resource->attributes) 
                ? json_decode($resource->attributes, true) 
                : $resource->attributes;
            
            if (isset($attributes['nomination_fee']) && $attributes['nomination_fee'] > 0) {
                $totalPrice += $attributes['nomination_fee'];
                
                Log::debug('指名料加算', [
                    'resource_id' => $resource->id,
                    'nomination_fee' => $attributes['nomination_fee'],
                    'running_total' => $totalPrice
                ]);
            }
        }

        // 4. 業種別料金調整（将来拡張用）
        // $totalPrice = $this->applyIndustryPricing($menu, $totalPrice);

        Log::info('料金計算完了', [
            'menu_id' => $menu->id,
            'final_total_price' => $totalPrice,
            'breakdown' => [
                'base_price' => $menu->price,
                'options_count' => count($optionIds),
                'resource_applied' => !is_null($resource)
            ]
        ]);

        return max(0, intval($totalPrice)); // 負の値は0にクリップ
    }

    /**
     * Hold Token検証・解放
     * 
     * 仮押さえトークンの有効性確認と解放処理
     * 
     * @param string $holdToken Hold Token文字列
     * @param int $storeId 店舗ID
     * @param int|null $resourceId リソースID
     * @param string $date 予約日
     * @param string $startTime 開始時間
     * @return bool 検証・解放成功可否
     * @throws \Exception Token期限切れ・データ不整合時
     */
    private function validateAndReleaseHoldToken(
        string $holdToken, 
        int $storeId, 
        ?int $resourceId, 
        string $date, 
        string $startTime
    ): bool {
        Log::info('Hold Token検証開始', [
            'hold_token' => substr($holdToken, 0, 10) . '...',
            'store_id' => $storeId,
            'resource_id' => $resourceId,
            'date' => $date,
            'start_time' => $startTime
        ]);

        try {
            // HoldTokenServiceで検証
            $tokenData = $this->holdTokenService->validateHoldToken($holdToken);

            // トークンデータと予約データの整合性チェック
            if ($tokenData['store_id'] !== $storeId) {
                throw new \Exception('Hold Token: 店舗IDが一致しません');
            }

            if ($tokenData['resource_id'] !== $resourceId) {
                throw new \Exception('Hold Token: リソースIDが一致しません');
            }

            if ($tokenData['date'] !== $date) {
                throw new \Exception('Hold Token: 予約日が一致しません');
            }

            if ($tokenData['start_time'] !== $startTime) {
                throw new \Exception('Hold Token: 開始時間が一致しません');
            }

            // トークン解放
            $released = $this->holdTokenService->releaseHoldToken($holdToken);

            if ($released) {
                Log::info('Hold Token解放成功', [
                    'hold_token' => substr($holdToken, 0, 10) . '...',
                    'store_id' => $storeId,
                    'resource_id' => $resourceId
                ]);
                return true;
            } else {
                Log::warning('Hold Token解放失敗', [
                    'hold_token' => substr($holdToken, 0, 10) . '...',
                    'reason' => 'releaseHoldToken returned false'
                ]);
                throw new \Exception('Hold Token解放に失敗しました');
            }

        } catch (\Exception $e) {
            Log::error('Hold Token検証エラー', [
                'hold_token' => substr($holdToken, 0, 10) . '...',
                'error' => $e->getMessage(),
                'store_id' => $storeId,
                'resource_id' => $resourceId
            ]);
            
            throw new \Exception('Hold Token検証失敗: ' . $e->getMessage());
        }
    }

    /**
     * 営業時間内チェック
     * 
     * 指定日時が店舗営業時間内かチェック
     * business_calendarsテーブルの特別営業時間も考慮
     * 
     * @param int $storeId 店舗ID
     * @param string $date 予約日（Y-m-d）
     * @param string $startTime 開始時間（H:i）
     * @param string $endTime 終了時間（H:i）
     * @return bool 営業時間内の場合true
     */
    protected function isWithinBusinessHours(int $storeId, string $date, string $startTime, string $endTime): bool
    {
        // 1. 特別営業時間チェック（business_calendars）
        $specialCalendar = \App\Models\BusinessCalendar::where('store_id', $storeId)
            ->whereDate('date', $date)
            ->first();

        if ($specialCalendar) {
            // 休業日チェック
            if (!$specialCalendar->is_open) {
                Log::info('営業時間外（休業日）', [
                    'store_id' => $storeId,
                    'date' => $date,
                    'reason' => 'special_holiday'
                ]);
                return false;
            }

            // 特別営業時間チェック
            if ($specialCalendar->start_time && $specialCalendar->end_time) {
                $isWithinSpecialHours = $startTime >= $specialCalendar->start_time && 
                                       $endTime <= $specialCalendar->end_time;
                
                Log::info('特別営業時間チェック', [
                    'store_id' => $storeId,
                    'date' => $date,
                    'special_start' => $specialCalendar->start_time,
                    'special_end' => $specialCalendar->end_time,
                    'booking_start' => $startTime,
                    'booking_end' => $endTime,
                    'is_within' => $isWithinSpecialHours
                ]);
                
                return $isWithinSpecialHours;
            }
        }

        // 2. 通常営業時間チェック（stores.business_hours）
        $store = Store::findOrFail($storeId);
        $businessHours = is_string($store->business_hours) 
            ? json_decode($store->business_hours, true) 
            : $store->business_hours;

        if (!$businessHours) {
            Log::warning('営業時間設定なし', [
                'store_id' => $storeId,
                'date' => $date
            ]);
            return true; // 営業時間設定がない場合は通す
        }

        // 曜日取得 (0=日曜, 1=月曜, ..., 6=土曜)
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        $dayName = $dayNames[$dayOfWeek];

        // 該当曜日の営業時間チェック
        if (!isset($businessHours[$dayName])) {
            Log::info('営業時間外（曜日設定なし）', [
                'store_id' => $storeId,
                'date' => $date,
                'day_of_week' => $dayName
            ]);
            return false;
        }

        $dayHours = $businessHours[$dayName];
        
        // 休業日チェック
        if (!$dayHours['is_open']) {
            Log::info('営業時間外（定休日）', [
                'store_id' => $storeId,
                'date' => $date,
                'day_of_week' => $dayName
            ]);
            return false;
        }

        // 営業時間内チェック
        $isWithinBusinessHours = $startTime >= $dayHours['start_time'] && 
                                 $endTime <= $dayHours['end_time'];

        Log::info('通常営業時間チェック', [
            'store_id' => $storeId,
            'date' => $date,
            'day_of_week' => $dayName,
            'business_start' => $dayHours['start_time'],
            'business_end' => $dayHours['end_time'],
            'booking_start' => $startTime,
            'booking_end' => $endTime,
            'is_within' => $isWithinBusinessHours
        ]);

        return $isWithinBusinessHours;
    }

    /**
     * 終了時間計算
     * 
     * メニュー時間から予約終了時間を算出
     * 
     * @param array $bookingData 予約データ
     * @return string 終了時間（H:i）
     */
    protected function calculateEndTime(array $bookingData): string
    {
        $startTime = $bookingData['start_time'];
        $menuId = $bookingData['menu_id'];
        
        // メニュー取得
        $menu = Menu::find($menuId);
        if (!$menu) {
            throw new \Exception('メニューが見つかりません');
        }

        // 開始時間に所要時間を加算
        $startDateTime = Carbon::createFromFormat('H:i', $startTime);
        $endDateTime = $startDateTime->addMinutes($menu->duration);
        
        return $endDateTime->format('H:i');
    }

    /**
     * 予約番号生成
     * 
     * 形式: TG{YYYYMMDD}{店舗ID:3桁}{連番:3桁}
     * 例: TG20250630001001
     * 
     * @param int $storeId 店舗ID
     * @return string 予約番号
     */
    protected function generateBookingNumber(int $storeId): string
    {
        $date = now()->format('Ymd');
        $storeIdPadded = str_pad($storeId, 3, '0', STR_PAD_LEFT);
        
        // 本日の店舗予約数を取得
        $todayBookingsCount = Booking::where('store_id', $storeId)
            ->whereDate('created_at', now()->toDateString())
            ->count();
        
        $sequence = str_pad($todayBookingsCount + 1, 3, '0', STR_PAD_LEFT);
        
        return "TG{$date}{$storeIdPadded}{$sequence}";
    }

    /**
     * 予約ステータス更新
     * 
     * 予約承認・完了・no_show等のステータス変更
     * 
     * @param Booking $booking 対象予約
     * @param string $status 新ステータス
     * @param string|null $note 変更理由・備考
     * @return bool 更新成功可否
     */
    public function updateBookingStatus(Booking $booking, string $status, ?string $note = null): bool
    {
        // TODO: 実装予定
        throw new \Exception('BookingService::updateBookingStatus() - 実装予定');
    }

    /**
     * 予約一覧取得（店舗別・フィルター対応）
     * 
     * @param int $storeId 店舗ID
     * @param array $filters フィルター条件
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function getBookings(int $storeId, array $filters = [])
    {
        // TODO: 実装予定
        throw new \Exception('BookingService::getBookings() - 実装予定');
    }
} 