<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDetail;
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
                    $menuOption = \App\Models\MenuOption::find($optionId);
                    if ($menuOption) {
                        $booking->bookingOptions()->create([
                            'menu_option_id' => $optionId,
                            'option_name' => $menuOption->name,
                            'option_description' => $menuOption->description,
                            'unit_price' => $menuOption->price,
                            'duration' => $menuOption->duration,
                            'quantity' => 1,
                            'total_price' => $menuOption->price,
                            'option_type' => 'addon',
                        ]);
                    }
                }
            }

            // 6. LINE通知自動送信（非同期）
            $this->notificationService->sendBookingConfirmation($booking);

            Log::info('予約作成完了', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'total_price' => $totalPrice
            ]);

            // リレーションをロードして返す
            return $booking->load(['customer', 'menu', 'resource', 'bookingOptions']);
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
        Log::info('予約更新開始', [
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'update_data' => $updateData,
            'store_id' => $booking->store_id
        ]);

        return DB::transaction(function () use ($booking, $updateData) {
            // 時間変更時の競合チェック
            if (isset($updateData['booking_date']) || isset($updateData['start_time']) || isset($updateData['resource_id'])) {
                $checkData = [
                    'resource_id' => $updateData['resource_id'] ?? $booking->resource_id,
                    'booking_date' => $updateData['booking_date'] ?? $booking->booking_date,
                    'start_time' => $updateData['start_time'] ?? $booking->start_time,
                    'end_time' => $updateData['end_time'] ?? $booking->end_time
                ];

                if ($this->checkTimeConflict($booking->store_id, $checkData, $booking->id)) {
                    throw new \Exception('変更後の時間で予約競合が発生しています');
                }
            }

            // オプション更新
            if (isset($updateData['option_ids'])) {
                // 既存オプションを削除
                $booking->bookingOptions()->delete();

                // 新しいオプションを作成
                foreach ($updateData['option_ids'] as $optionId) {
                    $menuOption = \App\Models\MenuOption::find($optionId);
                    if ($menuOption) {
                        $booking->bookingOptions()->create([
                            'menu_option_id' => $optionId,
                            'option_name' => $menuOption->name,
                            'option_description' => $menuOption->description,
                            'unit_price' => $menuOption->price,
                            'duration' => $menuOption->duration,
                            'quantity' => 1,
                            'total_price' => $menuOption->price,
                            'option_type' => 'addon',
                        ]);
                    }
                }

                unset($updateData['option_ids']);
            }

            // 基本データ更新
            $booking->update($updateData);

            // 変更通知送信
            if (isset($updateData['booking_date']) || isset($updateData['start_time'])) {
                $this->notificationService->sendBookingUpdate($booking);
            }

            Log::info('予約更新完了', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number
            ]);

            return $booking->fresh();
        });
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
        Log::info('予約キャンセル開始', [
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'reason' => $reason,
            'store_id' => $booking->store_id
        ]);

        try {
            return DB::transaction(function () use ($booking, $reason) {
                // ステータス更新
                $booking->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'staff_notes' => $booking->staff_notes . "\n" . 'キャンセル理由: ' . ($reason ?? '理由未記載')
                ]);

                // キャンセル通知送信
                $this->notificationService->sendBookingCancellation($booking);

                Log::info('予約キャンセル完了', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number
                ]);

                return true;
            });
        } catch (\Exception $e) {
            Log::error('予約キャンセルエラー', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
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

        // 営業時間の存在チェック（openとcloseキーが存在するかチェック）
        if (!isset($dayHours['open']) || !isset($dayHours['close'])) {
            Log::info('営業時間外（営業時間設定なし）', [
                'store_id' => $storeId,
                'date' => $date,
                'day_of_week' => $dayName,
                'day_hours' => $dayHours
            ]);
            return false;
        }

        // 営業時間内チェック
        $isWithinBusinessHours = $startTime >= $dayHours['open'] &&
            $endTime <= $dayHours['close'];

        Log::info('通常営業時間チェック', [
            'store_id' => $storeId,
            'date' => $date,
            'day_of_week' => $dayName,
            'business_start' => $dayHours['open'],
            'business_end' => $dayHours['close'],
            'booking_start' => $startTime,
            'booking_end' => $endTime,
            'is_within' => $isWithinBusinessHours
        ]);

        return $isWithinBusinessHours;
    }

    /**
     * 終了時間計算
     * 
     * tugical仕様書準拠の正しい時間計算：
     * 総所要時間 = base_duration + prep_duration + cleanup_duration + buffer_duration + オプション時間
     * 
     * @param array $bookingData 予約データ
     * @return string 終了時間（H:i）
     * @throws \Exception メニューが見つからない場合
     */
    protected function calculateEndTime(array $bookingData): string
    {
        $startTime = $bookingData['start_time'];
        $menuId = $bookingData['menu_id'];
        $optionIds = $bookingData['option_ids'] ?? [];

        Log::info('終了時間計算開始', [
            'start_time' => $startTime,
            'menu_id' => $menuId,
            'option_ids' => $optionIds
        ]);

        // メニュー取得
        $menu = Menu::find($menuId);
        if (!$menu) {
            throw new \Exception('メニューが見つかりません: ID ' . $menuId);
        }

        // 正しい総所要時間計算（仕様書準拠）
        $totalDuration = $menu->calculateTotalDuration($optionIds);

        Log::info('時間計算詳細', [
            'menu_name' => $menu->name,
            'base_duration' => $menu->base_duration,
            'prep_duration' => $menu->prep_duration,
            'cleanup_duration' => $menu->cleanup_duration,
            'buffer_duration' => $menu->buffer_duration ?? 0,
            'option_duration' => $totalDuration - ($menu->base_duration + $menu->prep_duration + $menu->cleanup_duration),
            'total_duration' => $totalDuration
        ]);

        // 開始時間に総所要時間を加算
        $startDateTime = Carbon::createFromFormat('H:i', $startTime);
        $endDateTime = $startDateTime->addMinutes($totalDuration);

        $endTime = $endDateTime->format('H:i');

        Log::info('終了時間計算完了', [
            'start_time' => $startTime,
            'total_duration' => $totalDuration,
            'end_time' => $endTime
        ]);

        return $endTime;
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
        Log::info('予約一覧取得開始', [
            'store_id' => $storeId,
            'filters' => $filters
        ]);

        $query = Booking::where('store_id', $storeId);

        // フィルタリング
        if (isset($filters['date'])) {
            $query->whereDate('booking_date', $filters['date']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['resource_id'])) {
            $query->where('resource_id', $filters['resource_id']);
        }

        if (isset($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }

        // Eager Loading
        $query->with(['customer', 'menu', 'resource', 'bookingOptions']);

        // ソート
        $query->orderBy('booking_date', 'asc')
            ->orderBy('start_time', 'asc');

        // ページング
        $perPage = $filters['per_page'] ?? 20;
        $page = $filters['page'] ?? 1;

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * 複数メニュー組み合わせ計算 (v1.2 新機能)
     * 
     * 電話予約時にリアルタイムで料金・時間を計算
     * 
     * @param int $storeId 店舗ID
     * @param array $menuIds メニューID一覧
     * @param int|null $resourceId リソースID
     * @param string $bookingDate 予約日
     * @param array $selectedOptions 選択されたオプション
     * @return array 計算結果
     */
    public function calculateCombinationPricing(
        int $storeId,
        array $menuIds,
        ?int $resourceId = null,
        string $bookingDate = null,
        array $selectedOptions = []
    ): array {
        Log::info('複数メニュー組み合わせ計算開始', [
            'store_id' => $storeId,
            'menu_ids' => $menuIds,
            'resource_id' => $resourceId,
            'booking_date' => $bookingDate,
            'selected_options' => $selectedOptions
        ]);

        // メニュー取得
        $menus = Menu::where('store_id', $storeId)
            ->whereIn('id', $menuIds)
            ->get();

        if ($menus->count() !== count($menuIds)) {
            throw new \Exception('指定されたメニューが存在しません');
        }

        // リソース取得
        $resource = null;
        if ($resourceId) {
            $resource = Resource::where('store_id', $storeId)->find($resourceId);
            if (!$resource) {
                throw new \Exception('指定されたリソースが存在しません');
            }
        }

        // 基本料金計算
        $baseTotalPrice = 0;
        $totalDuration = 0;
        $priceBreakdown = [];
        $timeBreakdown = [];
        $currentOffset = 0;

        foreach ($menus as $index => $menu) {
            $menuOptions = $selectedOptions[$menu->id] ?? [];
            $menuOptionPrice = 0;
            $menuOptionDuration = 0;

            // メニューオプション価格・時間計算
            if (!empty($menuOptions)) {
                $options = $menu->menuOptions()->whereIn('id', $menuOptions)->get();
                $menuOptionPrice = $options->sum('price');
                $menuOptionDuration = $options->sum('duration');
            }

            $menuPrice = $menu->base_price + $menuOptionPrice;
            $menuDuration = $menu->base_duration + $menu->prep_duration + $menu->cleanup_duration + $menuOptionDuration;

            $baseTotalPrice += $menuPrice;
            $totalDuration += $menuDuration;

            // 料金内訳
            $priceBreakdown[] = [
                'service' => $menu->name,
                'base_price' => $menu->base_price,
                'options_price' => $menuOptionPrice,
                'subtotal' => $menuPrice
            ];

            // 時間内訳
            $timeBreakdown[] = [
                'service' => $menu->name,
                'duration' => $menuDuration,
                'start_offset' => $currentOffset,
                'end_offset' => $currentOffset + $menuDuration
            ];

            $currentOffset += $menuDuration;
        }

        // セット割引計算
        $setDiscounts = $this->calculateSetDiscounts($menus, $baseTotalPrice);
        $setDiscountAmount = collect($setDiscounts)->sum('amount');

        // 自動追加サービス取得
        $autoAddedServices = $this->getAutoAddedServices($menus);
        foreach ($autoAddedServices as $autoService) {
            $totalDuration += $autoService['duration'];
            $priceBreakdown[] = [
                'service' => $autoService['service'],
                'base_price' => $autoService['price'],
                'options_price' => 0,
                'auto_added' => true
            ];
            $timeBreakdown[] = [
                'service' => $autoService['service'],
                'duration' => $autoService['duration'],
                'start_offset' => $currentOffset,
                'end_offset' => $currentOffset + $autoService['duration']
            ];
            $currentOffset += $autoService['duration'];
        }

        // 最終料金計算
        $totalPrice = $baseTotalPrice - $setDiscountAmount;

        // 推定終了時間計算
        $estimatedEndTime = null;
        if ($bookingDate) {
            $startTime = '09:00'; // デフォルト開始時間
            $endDateTime = Carbon::createFromFormat('Y-m-d H:i', $bookingDate . ' ' . $startTime)
                ->addMinutes($totalDuration);
            $estimatedEndTime = $endDateTime->format('H:i');
        }

        $result = [
            'total_price' => $totalPrice,
            'base_total_price' => $baseTotalPrice,
            'set_discount_amount' => $setDiscountAmount,
            'total_duration' => $totalDuration,
            'estimated_end_time' => $estimatedEndTime,
            'price_breakdown' => $priceBreakdown,
            'time_breakdown' => $timeBreakdown,
            'applied_discounts' => $setDiscounts,
            'auto_added_services' => $autoAddedServices
        ];

        Log::info('複数メニュー組み合わせ計算完了', $result);

        return $result;
    }

    /**
     * 複数メニュー組み合わせ予約作成 (v1.2 新機能)
     * 
     * @param int $storeId 店舗ID
     * @param array $bookingData 予約データ
     * @return Booking 作成された予約
     */
    public function createCombinationBooking(int $storeId, array $bookingData): Booking
    {
        Log::info('複数メニュー組み合わせ予約作成開始', [
            'store_id' => $storeId,
            'booking_data' => $bookingData
        ]);

        return DB::transaction(function () use ($storeId, $bookingData) {
            // 料金・時間計算
            $calculation = $this->calculateCombinationPricing(
                $storeId,
                collect($bookingData['menus'])->pluck('menu_id')->toArray(),
                $bookingData['primary_resource_id'] ?? null,
                $bookingData['booking_date'],
                $bookingData['selected_options'] ?? []
            );

            // 予約作成
            $booking = Booking::create([
                'store_id' => $storeId,
                'customer_id' => $bookingData['customer_id'],
                'resource_id' => $bookingData['resource_id'] ?? null,
                'booking_type' => 'combination',
                'booking_date' => $bookingData['booking_date'],
                'start_time' => $bookingData['start_time'],
                'end_time' => $calculation['estimated_end_time'],
                'total_price' => $calculation['total_price'],
                'base_total_price' => $calculation['base_total_price'],
                'set_discount_amount' => $calculation['set_discount_amount'],
                'auto_added_services' => $calculation['auto_added_services'],
                'combination_rules' => [
                    'applied_discounts' => $calculation['applied_discounts'],
                    'auto_additions' => $calculation['auto_added_services']
                ],
                'status' => 'confirmed',
                'customer_notes' => $bookingData['customer_notes'] ?? null,
                'staff_notes' => $bookingData['staff_notes'] ?? null,
                'booking_source' => $bookingData['booking_source'] ?? 'staff',
                'phone_booking_context' => $bookingData['phone_booking_context'] ?? null
            ]);

            // 予約明細作成
            foreach ($bookingData['menus'] as $index => $menuData) {
                $menu = Menu::where('store_id', $storeId)->find($menuData['menu_id']);
                if (!$menu) {
                    continue;
                }

                $timeBreakdown = collect($calculation['time_breakdown'])
                    ->where('service', $menu->name)
                    ->first();

                BookingDetail::create([
                    'booking_id' => $booking->id,
                    'menu_id' => $menu->id,
                    'resource_id' => $menuData['resource_id'] ?? $bookingData['resource_id'] ?? null,
                    'sequence_order' => $menuData['sequence_order'] ?? $index + 1,
                    'service_name' => $menu->name,
                    'service_description' => $menu->description,
                    'base_price' => $menu->base_price,
                    'base_duration' => $menu->base_duration,
                    'prep_duration' => $menu->prep_duration,
                    'cleanup_duration' => $menu->cleanup_duration,
                    'total_duration' => $timeBreakdown['duration'] ?? 0,
                    'start_time_offset' => $timeBreakdown['start_offset'] ?? 0,
                    'end_time_offset' => $timeBreakdown['end_offset'] ?? 0,
                    'selected_options' => $menuData['selected_options'] ?? [],
                    'completion_status' => BookingDetail::COMPLETION_STATUS_PENDING
                ]);
            }

            // 自動追加サービス明細作成
            foreach ($calculation['auto_added_services'] as $index => $autoService) {
                $timeBreakdown = collect($calculation['time_breakdown'])
                    ->where('service', $autoService['service'])
                    ->first();

                BookingDetail::create([
                    'booking_id' => $booking->id,
                    'menu_id' => $autoService['menu_id'] ?? null,
                    'sequence_order' => 100 + $index, // 自動追加は後順位
                    'service_name' => $autoService['service'],
                    'service_description' => $autoService['description'] ?? null,
                    'base_price' => $autoService['price'],
                    'total_duration' => $autoService['duration'],
                    'start_time_offset' => $timeBreakdown['start_offset'] ?? 0,
                    'end_time_offset' => $timeBreakdown['end_offset'] ?? 0,
                    'is_auto_added' => true,
                    'auto_add_reason' => $autoService['reason'],
                    'completion_status' => BookingDetail::COMPLETION_STATUS_PENDING
                ]);
            }

            // 通知送信
            $this->notificationService->sendBookingConfirmation($booking);

            Log::info('複数メニュー組み合わせ予約作成完了', [
                'booking_id' => $booking->id,
                'details_count' => $booking->bookingDetails()->count()
            ]);

            return $booking->load(['customer', 'bookingDetails.menu', 'bookingDetails.resource']);
        });
    }

    /**
     * 電話予約最適化 空き時間取得 (v1.2 新機能)
     * 
     * 美容師が電話中に瞬時に空き時間を確認
     * 
     * @param int $storeId 店舗ID
     * @param int|null $resourceId リソースID
     * @param int $duration 所要時間（分）
     * @param string $dateFrom 開始日
     * @param string $dateTo 終了日
     * @return array 空き時間情報
     */
    public function getPhoneBookingAvailability(
        int $storeId,
        ?int $resourceId = null,
        int $duration = 60,
        string $dateFrom = null,
        string $dateTo = null
    ): array {
        $dateFrom = $dateFrom ?? now()->toDateString();
        $dateTo = $dateTo ?? now()->addDays(7)->toDateString();

        Log::info('電話予約最適化 空き時間取得開始', [
            'store_id' => $storeId,
            'resource_id' => $resourceId,
            'duration' => $duration,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ]);

        $availability = [];
        $current = Carbon::parse($dateFrom);
        $end = Carbon::parse($dateTo);

        while ($current->lte($end)) {
            $dateString = $current->toDateString();
            $dateLabel = $this->getDateLabel($dateString);

            // 電話予約最適化では任意時間枠を検索するため、ダミーメニューIDを使用
            // 実際のメニューは予約作成時に指定される
            $dummyMenuId = 1; // カット（最も一般的なメニュー）を基準とする

            // 空き時間取得
            $availableSlots = $this->availabilityService->getAvailableSlots(
                $storeId,
                $dateString,
                $dummyMenuId,
                $resourceId
            );

            // 指定された時間で利用可能な枠のみフィルタリング
            $availableSlots = $this->filterSlotsByDuration($availableSlots, $duration);

            if (!empty($availableSlots)) {
                $availability[$dateString] = [
                    'date_label' => $dateLabel,
                    'available_slots' => $availableSlots
                ];
            }

            $current->addDay();
        }

        return [
            'availability' => $availability,
            'duration_minutes' => $duration,
            'resource_id' => $resourceId
        ];
    }

    /**
     * セット割引計算
     * 
     * @param \Illuminate\Database\Eloquent\Collection $menus メニュー一覧
     * @param int $baseTotalPrice 基本合計金額
     * @return array 割引情報
     */
    protected function calculateSetDiscounts($menus, int $baseTotalPrice): array
    {
        $discounts = [];

        // カット+カラーセット割引
        $hasHaircut = $menus->where('category', 'haircut')->isNotEmpty();
        $hasColor = $menus->where('category', 'color')->isNotEmpty();

        if ($hasHaircut && $hasColor) {
            $discounts[] = [
                'rule' => 'カット+カラーセット',
                'amount' => 500,
                'description' => 'カット+カラーの組み合わせ割引'
            ];
        }

        // 3メニュー以上割引
        if ($menus->count() >= 3) {
            $discounts[] = [
                'rule' => '3メニュー以上割引',
                'amount' => 1000,
                'description' => '3つ以上のメニュー組み合わせ割引'
            ];
        }

        return $discounts;
    }

    /**
     * 自動追加サービス取得
     * 
     * @param \Illuminate\Database\Eloquent\Collection $menus メニュー一覧
     * @return array 自動追加サービス一覧
     */
    protected function getAutoAddedServices($menus): array
    {
        $autoServices = [];

        // カラー施術時のシャンプー自動追加
        if ($menus->where('category', 'color')->isNotEmpty()) {
            $autoServices[] = [
                'service' => 'シャンプー',
                'price' => 0,
                'duration' => 15,
                'reason' => 'カラー施術必須',
                'description' => 'カラー施術に伴う必須シャンプー'
            ];
        }

        // 3メニュー以上の場合のブロー自動追加
        if ($menus->count() >= 3) {
            $autoServices[] = [
                'service' => 'ブロー',
                'price' => 0,
                'duration' => 20,
                'reason' => 'セット仕上げ',
                'description' => '複数メニュー仕上げブロー'
            ];
        }

        return $autoServices;
    }

    /**
     * 時間枠を指定時間でフィルタリング
     * 
     * @param array $slots 時間枠一覧
     * @param int $requiredDuration 必要時間（分）
     * @return array フィルタリング済み時間枠
     */
    protected function filterSlotsByDuration(array $slots, int $requiredDuration): array
    {
        return array_filter($slots, function ($slot) use ($requiredDuration) {
            // 時間枠の長さを計算（分）
            $startTime = Carbon::createFromFormat('H:i', $slot['start_time'] ?? '00:00');
            $endTime = Carbon::createFromFormat('H:i', $slot['end_time'] ?? '00:00');
            $slotDuration = $endTime->diffInMinutes($startTime);

            // 必要時間以上の枠のみ返す
            return $slotDuration >= $requiredDuration;
        });
    }

    /**
     * 日付ラベル取得
     * 
     * @param string $dateString 日付文字列
     * @return string 日付ラベル
     */
    protected function getDateLabel(string $dateString): string
    {
        $date = Carbon::parse($dateString);
        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();

        if ($dateString === $today) {
            return '今日';
        } elseif ($dateString === $tomorrow) {
            return '明日';
        } else {
            return $date->format('m月d日') . '(' . $date->isoFormat('ddd') . ')';
        }
    }
}
