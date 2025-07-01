<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * 通知モデル - LINE通知・配信履歴管理
 * 
 * tugicalサービスの通知システムを管理
 * LINE Messaging API と連携した通知送信・配信履歴・再送処理
 * 
 * 主要機能:
 * - LINE通知送信・配信状況管理
 * - 通知テンプレート連携・変数置換
 * - 配信失敗時の自動再送
 * - 配信履歴・統計情報管理
 * - 通知タイプ別分類・分析
 * - エラーハンドリング・ログ管理
 * 
 * 通知タイプ:
 * - booking_created: 予約作成通知
 * - booking_confirmed: 予約確定通知
 * - booking_reminder: 予約リマインダー
 * - booking_cancelled: 予約キャンセル通知
 * - status_changed: ステータス変更通知
 * - promotional: プロモーション通知
 * - system: システム通知
 * 
 * 配信ステータス:
 * - pending: 配信待ち
 * - processing: 配信中
 * - sent: 配信完了
 * - failed: 配信失敗
 * - cancelled: 配信キャンセル
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - customer: 送信先顧客（多対1、optional）
 * - staff_account: 送信者スタッフ（多対1、optional）
 * - booking: 関連予約（多対1、optional）
 * - notification_template: 使用テンプレート（多対1、optional）
 * 
 * @property int $id 通知ID
 * @property int $store_id 店舗ID
 * @property int|null $customer_id 顧客ID（optional、システム通知の場合null）
 * @property int|null $staff_id 送信者スタッフID（optional）
 * @property int|null $booking_id 関連予約ID（optional）
 * @property int|null $template_id 使用テンプレートID（optional）
 * @property string $type 通知タイプ
 * @property string $recipient_type 送信先タイプ（customer/staff/broadcast）
 * @property string $recipient_id 送信先ID（LINE User ID等）
 * @property string $title 通知タイトル
 * @property string $message 通知本文
 * @property string $status 配信ステータス
 * @property array|null $template_variables テンプレート変数（JSON: 置換用データ）
 * @property array|null $line_payload LINE送信ペイロード（JSON: 送信データ）
 * @property array|null $delivery_info 配信情報（JSON: 配信結果、エラー情報等）
 * @property Carbon|null $scheduled_at 配信予定日時
 * @property Carbon|null $sent_at 配信完了日時
 * @property Carbon|null $failed_at 配信失敗日時
 * @property int $retry_count 再送回数
 * @property int $max_retries 最大再送回数
 * @property Carbon|null $next_retry_at 次回再送予定日時
 * @property string|null $error_message エラーメッセージ
 * @property array|null $error_details エラー詳細（JSON: エラー情報）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read Customer|null $customer 送信先顧客
 * @property-read StaffAccount|null $staff 送信者スタッフ
 * @property-read Booking|null $booking 関連予約
 * @property-read NotificationTemplate|null $template 使用テンプレート
 */
class Notification extends Model
{
    use HasFactory;

    /**
     * テーブル名
     */
    protected $table = 'notifications';

    /**
     * 一括代入可能な属性
     */
    protected $fillable = [
        'store_id',
        'customer_id',
        'staff_id',
        'booking_id',
        'template_id',
        'type',
        'recipient_type',
        'recipient_id',
        'title',
        'message',
        'status',
        'template_variables',
        'line_payload',
        'delivery_info',
        'scheduled_at',
        'sent_at',
        'failed_at',
        'retry_count',
        'max_retries',
        'next_retry_at',
        'error_message',
        'error_details',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'template_variables' => 'array',
        'line_payload' => 'array',
        'delivery_info' => 'array',
        'error_details' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'failed_at' => 'datetime',
        'next_retry_at' => 'datetime',
        'retry_count' => 'integer',
        'max_retries' => 'integer',
    ];

    /**
     * 通知タイプ定数
     */
    public const TYPE_BOOKING_CREATED = 'booking_created';
    public const TYPE_BOOKING_CONFIRMED = 'booking_confirmed';
    public const TYPE_BOOKING_REMINDER = 'booking_reminder';
    public const TYPE_BOOKING_CANCELLED = 'booking_cancelled';
    public const TYPE_STATUS_CHANGED = 'status_changed';
    public const TYPE_PROMOTIONAL = 'promotional';
    public const TYPE_SYSTEM = 'system';

    /**
     * 送信先タイプ定数
     */
    public const RECIPIENT_TYPE_CUSTOMER = 'customer';
    public const RECIPIENT_TYPE_STAFF = 'staff';
    public const RECIPIENT_TYPE_BROADCAST = 'broadcast';

    /**
     * 配信ステータス定数
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    /**
     * 通知タイプ情報
     */
    public static function getNotificationTypes(): array
    {
        return [
            self::TYPE_BOOKING_CREATED => [
                'name' => '予約作成通知',
                'description' => '新規予約作成時の自動通知',
                'priority' => 'high',
                'auto_send' => true,
            ],
            self::TYPE_BOOKING_CONFIRMED => [
                'name' => '予約確定通知',
                'description' => '予約確定時の通知',
                'priority' => 'high',
                'auto_send' => true,
            ],
            self::TYPE_BOOKING_REMINDER => [
                'name' => '予約リマインダー',
                'description' => '予約日時の事前リマインダー',
                'priority' => 'medium',
                'auto_send' => true,
            ],
            self::TYPE_BOOKING_CANCELLED => [
                'name' => '予約キャンセル通知',
                'description' => '予約キャンセル時の通知',
                'priority' => 'high',
                'auto_send' => true,
            ],
            self::TYPE_STATUS_CHANGED => [
                'name' => 'ステータス変更通知',
                'description' => '予約ステータス変更通知',
                'priority' => 'medium',
                'auto_send' => true,
            ],
            self::TYPE_PROMOTIONAL => [
                'name' => 'プロモーション通知',
                'description' => 'キャンペーン・お知らせ通知',
                'priority' => 'low',
                'auto_send' => false,
            ],
            self::TYPE_SYSTEM => [
                'name' => 'システム通知',
                'description' => 'システムメンテナンス等の通知',
                'priority' => 'high',
                'auto_send' => false,
            ],
        ];
    }

    /**
     * 配信ステータス情報
     */
    public static function getStatusInfo(): array
    {
        return [
            self::STATUS_PENDING => [
                'name' => '配信待ち',
                'color' => '#f59e0b',
                'description' => '配信キューに登録済み',
            ],
            self::STATUS_PROCESSING => [
                'name' => '配信中',
                'color' => '#3b82f6',
                'description' => '配信処理中',
            ],
            self::STATUS_SENT => [
                'name' => '配信完了',
                'color' => '#10b981',
                'description' => '正常に配信完了',
            ],
            self::STATUS_FAILED => [
                'name' => '配信失敗',
                'color' => '#ef4444',
                'description' => '配信に失敗',
            ],
            self::STATUS_CANCELLED => [
                'name' => '配信キャンセル',
                'color' => '#6b7280',
                'description' => '配信がキャンセルされました',
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
        static::creating(function ($notification) {
            // デフォルト値設定
            $notification->status = $notification->status ?? self::STATUS_PENDING;
            $notification->retry_count = $notification->retry_count ?? 0;
            $notification->max_retries = $notification->max_retries ?? 3;
            
            // 即座に送信する場合
            if (!$notification->scheduled_at) {
                $notification->scheduled_at = now();
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
     * スタッフとの関係性
     */
    public function staff(): BelongsTo
    {
        return $this->belongsTo(StaffAccount::class, 'staff_id');
    }

    /**
     * 予約との関係性
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * テンプレートとの関係性
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(NotificationTemplate::class, 'template_id');
    }

    /**
     * 通知タイプ情報取得
     */
    public function getTypeInfo(): array
    {
        $types = self::getNotificationTypes();
        return $types[$this->type] ?? [];
    }

    /**
     * インスタンスのステータス情報取得
     *
     * @return array ステータス詳細情報
     */
    public function getStatusInfoData(): array
    {
        $statuses = self::getStatusInfo();
        return $statuses[$this->status] ?? [];
    }

    /**
     * 配信可能チェック
     */
    public function canSend(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_FAILED]) &&
               ($this->scheduled_at === null || $this->scheduled_at->isPast()) &&
               $this->retry_count < $this->max_retries;
    }

    /**
     * 再送可能チェック
     */
    public function canRetry(): bool
    {
        return $this->status === self::STATUS_FAILED &&
               $this->retry_count < $this->max_retries &&
               ($this->next_retry_at === null || $this->next_retry_at->isPast());
    }

    /**
     * キャンセル可能チェック
     */
    public function canCancel(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_FAILED]);
    }

    /**
     * 配信開始
     */
    public function markAsProcessing(): void
    {
        $this->update([
            'status' => self::STATUS_PROCESSING,
        ]);
    }

    /**
     * 配信成功記録
     */
    public function markAsSent(array $deliveryInfo = []): void
    {
        $this->update([
            'status' => self::STATUS_SENT,
            'sent_at' => now(),
            'delivery_info' => $deliveryInfo,
            'error_message' => null,
            'error_details' => null,
        ]);
    }

    /**
     * 配信失敗記録
     */
    public function markAsFailed(string $errorMessage, array $errorDetails = []): void
    {
        $this->increment('retry_count');
        
        $nextRetryAt = null;
        if ($this->retry_count < $this->max_retries) {
            // 指数バックオフ（1分, 5分, 30分）
            $retryDelays = [1, 5, 30];
            $delayMinutes = $retryDelays[min($this->retry_count - 1, count($retryDelays) - 1)];
            $nextRetryAt = now()->addMinutes($delayMinutes);
        }

        $this->update([
            'status' => self::STATUS_FAILED,
            'failed_at' => now(),
            'next_retry_at' => $nextRetryAt,
            'error_message' => $errorMessage,
            'error_details' => $errorDetails,
        ]);
    }

    /**
     * 配信キャンセル
     */
    public function markAsCancelled(): void
    {
        $this->update([
            'status' => self::STATUS_CANCELLED,
        ]);
    }

    /**
     * テンプレート変数置換
     */
    public function replaceTemplateVariables(string $content): string
    {
        $variables = $this->template_variables ?? [];
        
        foreach ($variables as $key => $value) {
            $content = str_replace("{{$key}}", $value, $content);
        }
        
        return $content;
    }

    /**
     * LINE ペイロード生成
     */
    public function generateLinePayload(): array
    {
        $payload = [
            'to' => $this->recipient_id,
            'messages' => [
                [
                    'type' => 'text',
                    'text' => $this->message,
                ]
            ]
        ];

        // リッチメッセージの場合
        if ($this->line_payload) {
            $payload['messages'] = $this->line_payload['messages'] ?? $payload['messages'];
        }

        return $payload;
    }

    /**
     * 配信遅延時間取得（分）
     */
    public function getDeliveryDelayMinutes(): ?int
    {
        if (!$this->sent_at || !$this->scheduled_at) {
            return null;
        }

        return $this->scheduled_at->diffInMinutes($this->sent_at);
    }

    /**
     * エラー要約取得
     */
    public function getErrorSummary(): ?string
    {
        if (!$this->error_message) {
            return null;
        }

        $errorDetails = $this->error_details ?? [];
        $httpCode = $errorDetails['http_code'] ?? null;
        $errorCode = $errorDetails['error_code'] ?? null;

        if ($httpCode && $errorCode) {
            return "HTTP {$httpCode}: {$errorCode} - {$this->error_message}";
        }

        return $this->error_message;
    }

    /**
     * 検索スコープ: ステータス別
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * 検索スコープ: 通知タイプ別
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * 検索スコープ: 送信先タイプ別
     */
    public function scopeByRecipientType($query, string $recipientType)
    {
        return $query->where('recipient_type', $recipientType);
    }

    /**
     * 検索スコープ: 配信待ち
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING)
                    ->where(function($q) {
                        $q->whereNull('scheduled_at')
                          ->orWhere('scheduled_at', '<=', now());
                    });
    }

    /**
     * 検索スコープ: 再送対象
     */
    public function scopeForRetry($query)
    {
        return $query->where('status', self::STATUS_FAILED)
                    ->where('retry_count', '<', 'max_retries')
                    ->where(function($q) {
                        $q->whereNull('next_retry_at')
                          ->orWhere('next_retry_at', '<=', now());
                    });
    }

    /**
     * 検索スコープ: 配信完了
     */
    public function scopeSent($query)
    {
        return $query->where('status', self::STATUS_SENT);
    }

    /**
     * 検索スコープ: 配信失敗
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * 検索スコープ: 日付範囲
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * 検索スコープ: 顧客別
     */
    public function scopeByCustomer($query, int $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    /**
     * 検索スコープ: 予約別
     */
    public function scopeByBooking($query, int $bookingId)
    {
        return $query->where('booking_id', $bookingId);
    }

    /**
     * 検索スコープ: 最近の通知
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * 検索スコープ: 自動送信
     */
    public function scopeAutoSend($query)
    {
        $autoSendTypes = collect(self::getNotificationTypes())
            ->filter(fn($type) => $type['auto_send'])
            ->keys()
            ->toArray();

        return $query->whereIn('type', $autoSendTypes);
    }

    /**
     * 検索スコープ: 高優先度
     */
    public function scopeHighPriority($query)
    {
        $highPriorityTypes = collect(self::getNotificationTypes())
            ->filter(fn($type) => $type['priority'] === 'high')
            ->keys()
            ->toArray();

        return $query->whereIn('type', $highPriorityTypes);
    }
} 