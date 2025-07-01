<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * 予約モデル - 予約システム核
 * 
 * tugicalサービスの予約システムの中核モデル
 * Hold Token System、ステータス管理、価格計算、時間管理を統合
 * 
 * 主要機能:
 * - Hold Token System（10分間の仮押さえ）
 * - 予約ステータス管理（pending/confirmed/cancelled/completed/no_show）
 * - 自動価格計算（基本料金 + オプション + リソース差額）
 * - 時間競合チェック
 * - 予約承認モード対応（自動承認 / 手動承認）
 * - 予約番号自動生成（TG + 日付 + 連番）
 * - 通知トリガー統合
 * 
 * Hold Token System:
 * - 10分間の排他制御
 * - 暗号学的安全なトークン生成
 * - 自動期限切れクリーンアップ
 * - 競合検知・解決
 * 
 * ステータス遷移:
 * pending → confirmed → completed
 * pending → cancelled
 * confirmed → cancelled
 * confirmed → no_show
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - customer: 顧客（多対1）
 * - menu: メニュー（多対1）
 * - resource: リソース（多対1、optional）
 * - staff_account: 担当スタッフ（多対1、optional）
 * - booking_options: 予約オプション（1対多）
 * 
 * @property int $id 予約ID
 * @property int $store_id 店舗ID
 * @property string $booking_number 予約番号（TG + 日付 + 連番）
 * @property int $customer_id 顧客ID
 * @property int $menu_id メニューID
 * @property int|null $resource_id リソースID（optional）
 * @property int|null $staff_id 担当スタッフID（optional）
 * @property string $booking_date 予約日（YYYY-MM-DD）
 * @property string $start_time 開始時間（HH:MM）
 * @property string $end_time 終了時間（HH:MM）
 * @property int $duration 所要時間（分）
 * @property string $status ステータス（pending/confirmed/cancelled/completed/no_show）
 * @property int $base_price 基本料金（円）
 * @property int $option_price オプション料金（円）
 * @property int $resource_price リソース差額（円）
 * @property int $total_price 総料金（円）
 * @property string|null $hold_token Hold Token（10分間有効）
 * @property Carbon|null $hold_expires_at Hold Token期限
 * @property string|null $customer_notes 顧客メモ
 * @property string|null $staff_notes スタッフメモ
 * @property string|null $cancellation_reason キャンセル理由
 * @property array|null $booking_data 予約データ（JSON: オプション詳細、メニュースナップショット等）
 * @property array|null $notification_history 通知履歴（JSON: 送信済み通知一覧）
 * @property Carbon|null $confirmed_at 確定日時
 * @property Carbon|null $cancelled_at キャンセル日時
 * @property Carbon|null $completed_at 完了日時
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read Customer $customer 顧客
 * @property-read Menu $menu メニュー
 * @property-read Resource|null $resource リソース
 * @property-read StaffAccount|null $staff 担当スタッフ
 * @property-read \Illuminate\Database\Eloquent\Collection<BookingOption> $bookingOptions 予約オプション一覧
 */
class Booking extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'bookings';

    /**
     * 一括代入可能な属性
     */
    protected $fillable = [
        'store_id',
        'booking_number',
        'customer_id',
        'menu_id',
        'resource_id',
        'staff_id',
        'booking_date',
        'start_time',
        'end_time',
        'duration',
        'status',
        'base_price',
        'option_price',
        'resource_price',
        'total_price',
        'hold_token',
        'hold_expires_at',
        'customer_notes',
        'staff_notes',
        'cancellation_reason',
        'booking_data',
        'notification_history',
        'confirmed_at',
        'cancelled_at',
        'completed_at',
    ];

    /**
     * 非表示属性（API出力時に除外）
     */
    protected $hidden = [
        'hold_token',
        'staff_notes',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'booking_date' => 'date',
        'duration' => 'integer',
        'base_price' => 'integer',
        'option_price' => 'integer',
        'resource_price' => 'integer',
        'total_price' => 'integer',
        'booking_data' => 'array',
        'notification_history' => 'array',
        'hold_expires_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * ステータス定数
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_NO_SHOW = 'no_show';

    /**
     * ステータス情報一覧
     */
    public static function getStatusInfo(): array
    {
        return [
            self::STATUS_PENDING => [
                'name' => '申込み中',
                'color' => '#f59e0b',
                'description' => '予約申込み完了、確定待ち',
                'can_cancel' => true,
                'can_modify' => true,
                'can_complete' => false,
            ],
            self::STATUS_CONFIRMED => [
                'name' => '確定',
                'color' => '#10b981',
                'description' => '予約確定済み',
                'can_cancel' => true,
                'can_modify' => true,
                'can_complete' => true,
            ],
            self::STATUS_CANCELLED => [
                'name' => 'キャンセル',
                'color' => '#ef4444',
                'description' => 'キャンセル済み',
                'can_cancel' => false,
                'can_modify' => false,
                'can_complete' => false,
            ],
            self::STATUS_COMPLETED => [
                'name' => '完了',
                'color' => '#6b7280',
                'description' => 'サービス完了',
                'can_cancel' => false,
                'can_modify' => false,
                'can_complete' => false,
            ],
            self::STATUS_NO_SHOW => [
                'name' => '無断キャンセル',
                'color' => '#dc2626',
                'description' => '無断キャンセル',
                'can_cancel' => false,
                'can_modify' => false,
                'can_complete' => false,
            ],
        ];
    }

    /**
     * モデルの起動時処理
     */
    protected static function booted()
    {
        static::addGlobalScope(new TenantScope);

        // 作成時の処理
        static::creating(function ($booking) {
            // 予約番号自動生成
            if (!$booking->booking_number) {
                $booking->booking_number = self::generateBookingNumber($booking->store_id);
            }

            // デフォルトステータス
            $booking->status = $booking->status ?? self::STATUS_PENDING;

            // 基本料金設定
            if (!$booking->base_price && $booking->menu_id) {
                $menu = Menu::find($booking->menu_id);
                $booking->base_price = $menu->base_price ?? 0;
            }

            // 総料金計算
            $booking->total_price = $booking->calculateTotalPrice();

            // Hold Token生成（LIFF予約の場合）
            if (!$booking->hold_token && request()->headers->has('X-LIFF-Request')) {
                $booking->hold_token = self::generateHoldToken();
                $booking->hold_expires_at = now()->addMinutes(10);
            }
        });

        // 更新時の処理
        static::updating(function ($booking) {
            // ステータス変更時の日時記録
            if ($booking->isDirty('status')) {
                $newStatus = $booking->status;
                $now = now();

                switch ($newStatus) {
                    case self::STATUS_CONFIRMED:
                        $booking->confirmed_at = $now;
                        break;
                    case self::STATUS_CANCELLED:
                        $booking->cancelled_at = $now;
                        break;
                    case self::STATUS_COMPLETED:
                        $booking->completed_at = $now;
                        break;
                    case self::STATUS_NO_SHOW:
                        $booking->cancelled_at = $now;
                        break;
                }
            }

            // 料金再計算
            if ($booking->isDirty(['base_price', 'option_price', 'resource_price'])) {
                $booking->total_price = $booking->calculateTotalPrice();
            }
        });
    }

    /**
     * 店舗との関係性
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * 顧客との関係性
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * メニューとの関係性
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    /**
     * リソースとの関係性
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * 担当スタッフとの関係性
     */
    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffAccount::class, 'staff_id');
    }

    /**
     * 予約オプションとの関係性
     */
    public function bookingOptions(): HasMany
    {
        return $this->hasMany(BookingOption::class);
    }

    /**
     * 総料金計算
     */
    public function calculateTotalPrice(): int
    {
        $total = $this->base_price ?? 0;
        $total += $this->option_price ?? 0;
        $total += $this->resource_price ?? 0;

        return max(0, $total);
    }

    /**
     * 予約番号生成
     */
    public static function generateBookingNumber(int $storeId): string
    {
        $date = now()->format('Ymd');
        $prefix = "TG{$date}";
        
        // 当日の最大連番を取得
        $lastNumber = self::where('store_id', $storeId)
                         ->where('booking_number', 'like', $prefix . '%')
                         ->orderBy('booking_number', 'desc')
                         ->value('booking_number');

        if ($lastNumber) {
            $sequence = (int)substr($lastNumber, -3) + 1;
        } else {
            $sequence = 1;
        }

        return $prefix . str_pad($sequence, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Hold Token生成
     */
    public static function generateHoldToken(): string
    {
        return Str::random(32);
    }

    /**
     * Hold Token有効性チェック
     */
    public function isHoldTokenValid(): bool
    {
        return $this->hold_token && 
               $this->hold_expires_at && 
               $this->hold_expires_at->isFuture();
    }

    /**
     * Hold Token期限切れチェック
     */
    public function isHoldTokenExpired(): bool
    {
        return $this->hold_token && 
               $this->hold_expires_at && 
               $this->hold_expires_at->isPast();
    }

    /**
     * インスタンスのステータス情報取得
     *
     * @return array ステータス詳細
     */
    public function getStatusInfoData(): array
    {
        $statusInfo = self::getStatusInfo();
        return $statusInfo[$this->status] ?? [];
    }

    /**
     * キャンセル可能チェック
     */
    public function canCancel(): bool
    {
        $statusInfo = $this->getStatusInfoData();
        return $statusInfo['can_cancel'] ?? false;
    }

    /**
     * 変更可能チェック
     */
    public function canModify(): bool
    {
        $statusInfo = $this->getStatusInfoData();
        return $statusInfo['can_modify'] ?? false;
    }

    /**
     * 完了可能チェック
     */
    public function canComplete(): bool
    {
        $statusInfo = $this->getStatusInfoData();
        return $statusInfo['can_complete'] ?? false;
    }

    /**
     * 予約時間チェック
     */
    public function isInPast(): bool
    {
        $bookingDateTime = Carbon::createFromFormat(
            'Y-m-d H:i',
            $this->booking_date->format('Y-m-d') . ' ' . $this->start_time
        );
        
        return $bookingDateTime->isPast();
    }

    /**
     * 予約開始まで残り時間（分）
     */
    public function getMinutesUntilStart(): int
    {
        $bookingDateTime = Carbon::createFromFormat(
            'Y-m-d H:i',
            $this->booking_date->format('Y-m-d') . ' ' . $this->start_time
        );
        
        return max(0, now()->diffInMinutes($bookingDateTime, false));
    }

    /**
     * 通知履歴記録
     */
    public function recordNotification(string $type, array $data = []): void
    {
        $history = $this->notification_history ?? [];
        $history[] = [
            'type' => $type,
            'data' => $data,
            'sent_at' => now()->toISOString(),
        ];
        
        $this->update(['notification_history' => $history]);
    }

    /**
     * 通知送信済みチェック
     */
    public function hasNotificationSent(string $type): bool
    {
        $history = $this->notification_history ?? [];
        return collect($history)->contains('type', $type);
    }

    /**
     * 検索スコープ: ステータス別
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * 検索スコープ: 日付範囲
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('booking_date', [$startDate, $endDate]);
    }

    /**
     * 検索スコープ: 今日の予約
     */
    public function scopeToday($query)
    {
        return $query->whereDate('booking_date', today());
    }

    /**
     * 検索スコープ: 明日の予約
     */
    public function scopeTomorrow($query)
    {
        return $query->whereDate('booking_date', tomorrow());
    }

    /**
     * 検索スコープ: 今週の予約
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('booking_date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * 検索スコープ: 今月の予約
     */
    public function scopeThisMonth($query)
    {
        return $query->whereMonth('booking_date', now()->month)
                    ->whereYear('booking_date', now()->year);
    }

    /**
     * 検索スコープ: 顧客別
     */
    public function scopeByCustomer($query, int $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    /**
     * 検索スコープ: リソース別
     */
    public function scopeByResource($query, int $resourceId)
    {
        return $query->where('resource_id', $resourceId);
    }

    /**
     * 検索スコープ: スタッフ別
     */
    public function scopeByStaff($query, int $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    /**
     * 検索スコープ: 時間競合チェック
     */
    public function scopeTimeConflict($query, string $date, string $startTime, string $endTime, ?int $resourceId = null, ?int $excludeId = null)
    {
        $query = $query->where('booking_date', $date)
                      ->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED]);

        if ($resourceId) {
            $query->where('resource_id', $resourceId);
        }

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->where(function($q) use ($startTime, $endTime) {
            $q->whereBetween('start_time', [$startTime, $endTime])
              ->orWhereBetween('end_time', [$startTime, $endTime])
              ->orWhere(function($subQuery) use ($startTime, $endTime) {
                  $subQuery->where('start_time', '<=', $startTime)
                           ->where('end_time', '>=', $endTime);
              });
        });
    }

    /**
     * 検索スコープ: Hold Token有効
     */
    public function scopeWithValidHoldToken($query)
    {
        return $query->whereNotNull('hold_token')
                    ->where('hold_expires_at', '>', now());
    }

    /**
     * 検索スコープ: Hold Token期限切れ
     */
    public function scopeWithExpiredHoldToken($query)
    {
        return $query->whereNotNull('hold_token')
                    ->where('hold_expires_at', '<=', now());
    }

    /**
     * 検索スコープ: 料金範囲
     */
    public function scopePriceRange($query, int $minPrice, int $maxPrice)
    {
        return $query->whereBetween('total_price', [$minPrice, $maxPrice]);
    }

    /**
     * 検索スコープ: 予約検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function($q) use ($keyword) {
            $q->where('booking_number', 'like', "%{$keyword}%")
              ->orWhereHas('customer', function($customerQuery) use ($keyword) {
                  $customerQuery->where('name', 'like', "%{$keyword}%")
                               ->orWhere('phone', 'like', "%{$keyword}%");
              });
        });
    }
} 