<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * NotificationResource
 * 
 * tugical通知データAPIリソース
 * 
 * 主要機能:
 * - 通知データの統一レスポンス形式
 * - 関連データの適切な展開
 * - 配信状況・統計情報の整理
 * - 権限別情報表示制御
 * - 日時フォーマットの統一
 * 
 * 出力フィールド:
 * - 基本通知情報（ID、タイプ、ステータス等）
 * - 配信情報（送信日時、配信結果等）
 * - 関連データ（顧客、予約、テンプレート）
 * - メタデータ（再送回数、統計等）
 * 
 * @package App\Http\Resources
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class NotificationResource extends JsonResource
{
    /**
     * リソースを配列に変換
     * 
     * 通知データを統一されたAPI形式に変換
     * 
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            // 基本情報
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'channel' => $this->channel,
            'recipient_type' => $this->recipient_type,
            'recipient_id' => $this->recipient_id,

            // 通知内容
            'title' => $this->title,
            'message' => $this->message,
            'rich_content' => $this->when($this->rich_content, $this->rich_content),

            // 配信情報
            'delivery_info' => [
                'sent_at' => $this->when($this->sent_at, function() {
                    return $this->sent_at?->toISOString();
                }),
                'delivered_at' => $this->when($this->delivered_at, function() {
                    return $this->delivered_at?->toISOString();
                }),
                'read_at' => $this->when($this->read_at, function() {
                    return $this->read_at?->toISOString();
                }),
                'scheduled_at' => $this->when($this->scheduled_at, function() {
                    return $this->scheduled_at?->toISOString();
                }),
                'is_scheduled' => !is_null($this->scheduled_at),
                'delivery_status' => $this->getDeliveryStatusInfo(),
            ],

            // 配信結果・エラー情報
            'result_info' => [
                'response_code' => $this->response_code,
                'response_message' => $this->response_message,
                'error_details' => $this->when($this->error_details, $this->error_details),
                'delivery_attempts' => $this->retry_count + 1,
                'retry_count' => $this->retry_count,
                'max_retry_reached' => $this->retry_count >= 3,
                'last_attempt_at' => $this->when($this->last_retry_at, function() {
                    return $this->last_retry_at?->toISOString();
                }),
            ],

            // 関連データ（条件付き展開）
            'customer' => $this->when($this->relationLoaded('customer') && $this->customer, function() {
                return [
                    'id' => $this->customer->id,
                    'name' => $this->customer->name,
                    'phone' => $this->when(
                        $this->shouldShowSensitiveData(),
                        $this->customer->phone
                    ),
                    'line_user_id' => $this->when(
                        $this->shouldShowSensitiveData(),
                        $this->customer->line_user_id ? substr($this->customer->line_user_id, 0, 8) . '...' : null
                    ),
                    'loyalty_rank' => $this->customer->loyalty_rank,
                ];
            }),

            'booking' => $this->when($this->relationLoaded('booking') && $this->booking, function() {
                return [
                    'id' => $this->booking->id,
                    'booking_number' => $this->booking->booking_number,
                    'booking_date' => $this->booking->booking_date?->format('Y-m-d'),
                    'start_time' => $this->booking->start_time,
                    'status' => $this->booking->status,
                    'menu_name' => $this->booking->menu?->name,
                    'total_price' => $this->booking->total_price,
                ];
            }),

            'template' => $this->when($this->relationLoaded('template') && $this->template, function() {
                return [
                    'id' => $this->template->id,
                    'type' => $this->template->type,
                    'title' => $this->template->title,
                    'industry_type' => $this->template->industry_type,
                    'message_type' => $this->template->message_type,
                ];
            }),

            // テンプレート変数（使用された変数情報）
            'template_variables' => $this->when($this->template_variables, $this->template_variables),

            // メタデータ
            'metadata' => [
                'priority' => $this->priority ?? 'normal',
                'tags' => $this->when($this->tags, $this->tags),
                'campaign_id' => $this->when($this->campaign_id, $this->campaign_id),
                'user_agent' => $this->when($this->user_agent, $this->user_agent),
                'ip_address' => $this->when(
                    $this->shouldShowSensitiveData() && $this->ip_address,
                    $this->ip_address
                ),
            ],

            // 送信者情報
            'sender_info' => [
                'sent_by_user_id' => $this->created_by,
                'sent_by_system' => is_null($this->created_by),
                'is_manual_send' => $this->isManualSend(),
                'is_automated' => $this->isAutomatedSend(),
            ],

            // 通知統計（このタイプの通知の統計）
            'type_stats' => $this->when($request->query('include_stats'), function() {
                return $this->getTypeStats();
            }),

            // アクション可能性
            'actions' => [
                'can_retry' => $this->canRetry(),
                'can_cancel' => $this->canCancel(),
                'can_view_details' => true,
                'can_export' => $this->shouldShowSensitiveData(),
            ],

            // 日時情報
            'timestamps' => [
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
                'expires_at' => $this->when($this->expires_at, function() {
                    return $this->expires_at?->toISOString();
                }),
            ],
        ];
    }

    /**
     * 配信状況詳細情報を取得
     * 
     * @return array 配信状況の詳細情報
     */
    protected function getDeliveryStatusInfo(): array
    {
        $statusMap = [
            'pending' => [
                'label' => '送信待ち',
                'description' => 'まもなく送信されます',
                'color' => 'orange',
            ],
            'sent' => [
                'label' => '送信済み',
                'description' => 'メッセージが送信されました',
                'color' => 'blue',
            ],
            'delivered' => [
                'label' => '配信完了',
                'description' => '相手に正常に配信されました',
                'color' => 'green',
            ],
            'read' => [
                'label' => '既読',
                'description' => '相手が確認しました',
                'color' => 'green',
            ],
            'failed' => [
                'label' => '送信失敗',
                'description' => '送信に失敗しました',
                'color' => 'red',
            ],
            'cancelled' => [
                'label' => 'キャンセル',
                'description' => '送信がキャンセルされました',
                'color' => 'gray',
            ],
        ];

        $currentStatus = $statusMap[$this->status] ?? [
            'label' => '不明',
            'description' => '状態が不明です',
            'color' => 'gray',
        ];

        return array_merge($currentStatus, [
            'status_code' => $this->status,
            'progress_percentage' => $this->getProgressPercentage(),
            'estimated_delivery' => $this->getEstimatedDeliveryTime(),
        ]);
    }

    /**
     * 配信進捗率を計算
     * 
     * @return int 進捗率（0-100）
     */
    protected function getProgressPercentage(): int
    {
        return match($this->status) {
            'pending' => 10,
            'sent' => 50,
            'delivered' => 90,
            'read' => 100,
            'failed', 'cancelled' => 0,
            default => 0,
        };
    }

    /**
     * 配信予想時間を取得
     * 
     * @return string|null 配信予想時間
     */
    protected function getEstimatedDeliveryTime(): ?string
    {
        if ($this->status === 'pending' && $this->scheduled_at) {
            return $this->scheduled_at->toISOString();
        }

        if ($this->status === 'sent') {
            // 送信済みの場合、通常5分以内に配信
            return $this->sent_at?->addMinutes(5)->toISOString();
        }

        return null;
    }

    /**
     * 手動送信かどうかを判定
     * 
     * @return bool
     */
    protected function isManualSend(): bool
    {
        return !is_null($this->created_by) || 
               in_array($this->type, ['manual', 'campaign', 'announcement', 'urgent']);
    }

    /**
     * 自動送信かどうかを判定
     * 
     * @return bool
     */
    protected function isAutomatedSend(): bool
    {
        return is_null($this->created_by) && 
               in_array($this->type, ['booking_confirmed', 'booking_reminder', 'booking_cancelled']);
    }

    /**
     * このタイプの通知統計を取得
     * 
     * @return array 統計情報
     */
    protected function getTypeStats(): array
    {
        if (!$this->store_id) {
            return [];
        }

        $stats = \App\Models\Notification::where('store_id', $this->store_id)
            ->where('type', $this->type)
            ->whereDate('created_at', '>=', now()->subDays(30))
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(CASE WHEN status = "sent" THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed_count,
                ROUND(AVG(CASE WHEN status = "sent" THEN 1 ELSE 0 END) * 100, 2) as success_rate
            ')
            ->first();

        return [
            'period' => '過去30日間',
            'total_notifications' => $stats->total_count ?? 0,
            'success_rate' => $stats->success_rate ?? 0,
            'sent_count' => $stats->sent_count ?? 0,
            'delivered_count' => $stats->delivered_count ?? 0,
            'failed_count' => $stats->failed_count ?? 0,
        ];
    }

    /**
     * 再送可能かどうかを判定
     * 
     * @return bool
     */
    protected function canRetry(): bool
    {
        return $this->status === 'failed' && 
               $this->retry_count < 3 &&
               !is_null($this->recipient_id);
    }

    /**
     * キャンセル可能かどうかを判定
     * 
     * @return bool
     */
    protected function canCancel(): bool
    {
        return $this->status === 'pending' && 
               !is_null($this->scheduled_at) &&
               $this->scheduled_at->isFuture();
    }

    /**
     * 機密情報を表示するかどうかを判定
     * 
     * 管理者権限や詳細表示権限がある場合のみtrue
     * 
     * @return bool
     */
    protected function shouldShowSensitiveData(): bool
    {
        $user = auth()->user();
        
        // 管理者またはシステム管理者の場合
        if ($user && in_array($user->role, ['admin', 'system_admin'])) {
            return true;
        }

        // 同一店舗のマネージャーの場合
        if ($user && $user->role === 'manager' && $user->store_id === $this->store_id) {
            return true;
        }

        return false;
    }
}
