<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * NotificationTemplateResource
 * 
 * tugical通知テンプレートAPIリソース
 * 
 * 主要機能:
 * - テンプレートデータの統一レスポンス形式
 * - 業種別設定情報の整理
 * - 使用統計・効果測定データ
 * - 変数情報・プレビュー機能
 * - 権限別表示制御
 * 
 * 出力フィールド:
 * - 基本テンプレート情報（ID、タイプ、業種等）
 * - テンプレート内容（タイトル、メッセージ、リッチコンテンツ）
 * - 使用統計（利用回数、成功率等）
 * - 変数情報・プレビュー
 * - メタデータ（作成者、更新履歴等）
 * 
 * @package App\Http\Resources
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class NotificationTemplateResource extends JsonResource
{
    /**
     * リソースを配列に変換
     * 
     * テンプレートデータを統一されたAPI形式に変換
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
            'industry_type' => $this->industry_type,
            'title' => $this->title,
            'message' => $this->message,
            'message_type' => $this->message_type,
            'is_active' => $this->is_active,

            // 詳細情報
            'template_info' => [
                'description' => $this->description,
                'character_count' => mb_strlen($this->message),
                'line_count' => substr_count($this->message, "\n") + 1,
                'estimated_read_time' => $this->getEstimatedReadTime(),
                'template_category' => $this->getTemplateCategory(),
            ],

            // テンプレート内容
            'content' => [
                'title' => $this->title,
                'message' => $this->message,
                'rich_content' => $this->when($this->rich_content, $this->rich_content),
                'message_type' => $this->message_type,
                'supports_rich_content' => $this->message_type === 'rich',
                'supports_variables' => $this->hasVariables(),
            ],

            // 変数情報
            'variables' => [
                'detected_variables' => $this->getDetectedVariables(),
                'available_variables' => $this->getAvailableVariables(),
                'variable_count' => count($this->getDetectedVariables()),
                'sample_variables' => $this->getSampleVariables(),
            ],

            // 業種別設定
            'industry_settings' => [
                'industry_type' => $this->industry_type,
                'industry_name' => $this->getIndustryName(),
                'industry_specific_variables' => $this->getIndustrySpecificVariables(),
                'recommended_timing' => $this->getRecommendedTiming(),
                'compliance_notes' => $this->getComplianceNotes(),
            ],

            // 使用統計
            'usage_stats' => [
                'usage_count' => $this->usage_count ?? 0,
                'last_used_at' => $this->when($this->last_used_at, function() {
                    return $this->last_used_at?->toISOString();
                }),
                'success_rate' => $this->getSuccessRate(),
                'average_delivery_time' => $this->getAverageDeliveryTime(),
                'total_recipients' => $this->getTotalRecipients(),
                'performance_rating' => $this->getPerformanceRating(),
            ],

            // 効果測定データ
            'effectiveness' => $this->when($request->query('include_stats'), function() {
                return $this->getEffectivenessData();
            }),

            // テンプレート状態
            'status_info' => [
                'is_active' => $this->is_active,
                'is_default' => $this->isDefaultTemplate(),
                'is_system_template' => $this->isSystemTemplate(),
                'is_custom_template' => $this->isCustomTemplate(),
                'can_be_deleted' => $this->canBeDeleted(),
                'can_be_modified' => $this->canBeModified(),
            ],

            // プレビュー情報
            'preview' => [
                'sample_preview' => $this->when($request->query('include_preview'), function() {
                    return $this->generateSamplePreview();
                }),
                'preview_url' => route('api.notification-templates.preview', $this->id),
                'supports_preview' => true,
            ],

            // 関連データ
            'related_notifications' => $this->when($this->relationLoaded('notifications'), function() {
                return [
                    'recent_count' => $this->notifications->where('created_at', '>=', now()->subDays(7))->count(),
                    'total_count' => $this->notifications->count(),
                    'last_notification_at' => $this->notifications->max('created_at')?->toISOString(),
                ];
            }),

            // メタデータ
            'metadata' => [
                'created_by' => $this->created_by,
                'updated_by' => $this->updated_by,
                'version' => $this->version ?? 1,
                'template_hash' => $this->getTemplateHash(),
                'locale' => 'ja',
                'timezone' => 'Asia/Tokyo',
            ],

            // 管理情報
            'management' => [
                'tags' => $this->when($this->tags, $this->tags),
                'category' => $this->category ?? 'general',
                'priority' => $this->priority ?? 'normal',
                'compliance_checked' => $this->compliance_checked ?? false,
                'last_review_at' => $this->when($this->last_review_at, function() {
                    return $this->last_review_at?->toISOString();
                }),
            ],

            // アクション可能性
            'actions' => [
                'can_edit' => $this->canEdit(),
                'can_delete' => $this->canDelete(),
                'can_duplicate' => true,
                'can_test_send' => $this->is_active,
                'can_export' => true,
                'can_generate_preview' => true,
            ],

            // 日時情報
            'timestamps' => [
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
                'published_at' => $this->when($this->published_at, function() {
                    return $this->published_at?->toISOString();
                }),
            ],
        ];
    }

    /**
     * 推定読了時間を計算（秒）
     * 
     * @return int 推定読了時間
     */
    protected function getEstimatedReadTime(): int
    {
        $characterCount = mb_strlen($this->message);
        // 日本語は1分間に400文字程度の読解速度
        return max(5, intval($characterCount / 400 * 60));
    }

    /**
     * テンプレートカテゴリを取得
     * 
     * @return string カテゴリ名
     */
    protected function getTemplateCategory(): string
    {
        $categoryMap = [
            'booking_confirmed' => '予約確定',
            'booking_reminder' => 'リマインダー',
            'booking_cancelled' => 'キャンセル',
            'booking_updated' => '変更通知',
            'payment_completed' => '決済完了',
            'campaign' => 'キャンペーン',
            'announcement' => 'お知らせ',
            'urgent' => '緊急連絡',
        ];

        return $categoryMap[$this->type] ?? 'その他';
    }

    /**
     * 変数を含むかどうかを判定
     * 
     * @return bool 変数含有フラグ
     */
    protected function hasVariables(): bool
    {
        return preg_match('/\{[a-zA-Z_][a-zA-Z0-9_]*\}/', $this->title . $this->message) > 0;
    }

    /**
     * 検出された変数を取得
     * 
     * @return array 検出された変数リスト
     */
    protected function getDetectedVariables(): array
    {
        $content = $this->title . ' ' . $this->message;
        preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $content, $matches);
        return array_unique($matches[1]);
    }

    /**
     * 利用可能な変数を取得
     * 
     * @return array 利用可能な変数リスト
     */
    protected function getAvailableVariables(): array
    {
        return [
            'customer_name' => '顧客名',
            'booking_number' => '予約番号',
            'booking_date' => '予約日',
            'booking_time' => '予約時間',
            'menu_name' => 'メニュー名',
            'total_price' => '合計金額',
            'store_name' => '店舗名',
            'staff_name' => 'スタッフ名',
            'cancellation_reason' => 'キャンセル理由',
        ];
    }

    /**
     * サンプル変数を取得
     * 
     * @return array サンプル変数値
     */
    protected function getSampleVariables(): array
    {
        return [
            'customer_name' => '山田太郎',
            'booking_number' => 'TG20250630001',
            'booking_date' => '2025年6月30日',
            'booking_time' => '14:00',
            'menu_name' => 'カット+カラー',
            'total_price' => '¥8,000',
            'store_name' => 'サンプル美容院',
            'staff_name' => '田中美容師',
            'cancellation_reason' => '都合により',
        ];
    }

    /**
     * 業種名を取得
     * 
     * @return string 業種名
     */
    protected function getIndustryName(): string
    {
        $industryMap = [
            'beauty' => '美容・ネイル',
            'clinic' => 'クリニック・治療院',
            'rental' => 'レンタルスペース',
            'school' => 'スクール・習い事',
            'activity' => 'アクティビティ・体験',
        ];

        return $industryMap[$this->industry_type] ?? '一般';
    }

    /**
     * 業種固有変数を取得
     * 
     * @return array 業種固有変数
     */
    protected function getIndustrySpecificVariables(): array
    {
        $specificVars = [
            'beauty' => ['stylist_name', 'treatment_type', 'next_recommended_date'],
            'clinic' => ['doctor_name', 'treatment_room', 'next_appointment_date'],
            'rental' => ['room_name', 'equipment_list', 'capacity'],
            'school' => ['instructor_name', 'lesson_type', 'homework'],
            'activity' => ['guide_name', 'activity_level', 'weather_notice'],
        ];

        return $specificVars[$this->industry_type] ?? [];
    }

    /**
     * 推奨送信タイミングを取得
     * 
     * @return array 推奨タイミング情報
     */
    protected function getRecommendedTiming(): array
    {
        $timingMap = [
            'booking_confirmed' => ['timing' => '予約完了直後', 'delay' => '0分'],
            'booking_reminder' => ['timing' => '予約前日・当日', 'delay' => '24時間前・3時間前'],
            'booking_cancelled' => ['timing' => 'キャンセル直後', 'delay' => '0分'],
            'campaign' => ['timing' => '営業時間内', 'delay' => '10:00-18:00'],
        ];

        return $timingMap[$this->type] ?? ['timing' => '随時', 'delay' => 'なし'];
    }

    /**
     * コンプライアンス注意事項を取得
     * 
     * @return array コンプライアンス情報
     */
    protected function getComplianceNotes(): array
    {
        $notes = [
            'beauty' => ['個人情報保護', '特定商取引法', '景品表示法'],
            'clinic' => ['医療法', '個人情報保護法', 'プライバシー配慮'],
            'general' => ['個人情報保護法', '迷惑メール防止法'],
        ];

        return $notes[$this->industry_type] ?? $notes['general'];
    }

    /**
     * 成功率を計算
     * 
     * @return float 成功率（%）
     */
    protected function getSuccessRate(): float
    {
        if (!$this->usage_count || $this->usage_count === 0) {
            return 0.0;
        }

        $successCount = \App\Models\Notification::where('template_id', $this->id)
            ->whereIn('status', ['sent', 'delivered'])
            ->count();

        return round(($successCount / $this->usage_count) * 100, 2);
    }

    /**
     * 平均配信時間を取得
     * 
     * @return string|null 平均配信時間
     */
    protected function getAverageDeliveryTime(): ?string
    {
        $avgSeconds = \App\Models\Notification::where('template_id', $this->id)
            ->whereNotNull('sent_at')
            ->whereNotNull('delivered_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(SECOND, sent_at, delivered_at)) as avg_seconds')
            ->value('avg_seconds');

        if (!$avgSeconds) {
            return null;
        }

        return gmdate('H:i:s', $avgSeconds);
    }

    /**
     * 総受信者数を取得
     * 
     * @return int 受信者数
     */
    protected function getTotalRecipients(): int
    {
        return \App\Models\Notification::where('template_id', $this->id)
            ->distinct('recipient_id')
            ->count();
    }

    /**
     * パフォーマンス評価を取得
     * 
     * @return string パフォーマンス評価
     */
    protected function getPerformanceRating(): string
    {
        $successRate = $this->getSuccessRate();
        
        if ($successRate >= 95) return 'excellent';
        if ($successRate >= 90) return 'good';
        if ($successRate >= 80) return 'average';
        if ($successRate >= 70) return 'poor';
        return 'very_poor';
    }

    /**
     * 効果測定データを取得
     * 
     * @return array 効果測定データ
     */
    protected function getEffectivenessData(): array
    {
        if (!$this->usage_count) {
            return ['no_data' => true];
        }

        $notifications = \App\Models\Notification::where('template_id', $this->id)
            ->where('created_at', '>=', now()->subDays(30))
            ->get();

        return [
            'period' => '過去30日間',
            'total_sent' => $notifications->count(),
            'delivery_rate' => $notifications->where('status', 'delivered')->count() / max(1, $notifications->count()) * 100,
            'open_rate' => $notifications->where('status', 'read')->count() / max(1, $notifications->count()) * 100,
            'response_rate' => 0, // TODO: レスポンス率の計算（今後実装）
            'peak_hours' => $this->getPeakDeliveryHours($notifications),
            'device_breakdown' => $this->getDeviceBreakdown($notifications),
        ];
    }

    /**
     * ピーク配信時間を取得
     * 
     * @param \Illuminate\Support\Collection $notifications
     * @return array ピーク時間
     */
    protected function getPeakDeliveryHours($notifications): array
    {
        $hourCounts = $notifications->groupBy(function($notification) {
            return $notification->sent_at?->format('H') ?? 'unknown';
        })->map->count();

        return $hourCounts->sortDesc()->take(3)->toArray();
    }

    /**
     * デバイス別内訳を取得
     * 
     * @param \Illuminate\Support\Collection $notifications
     * @return array デバイス内訳
     */
    protected function getDeviceBreakdown($notifications): array
    {
        // 現在は LINE のみだが、将来的にデバイス情報を取得
        return [
            'line' => $notifications->where('channel', 'line')->count(),
            'email' => $notifications->where('channel', 'email')->count(),
            'sms' => $notifications->where('channel', 'sms')->count(),
        ];
    }

    /**
     * デフォルトテンプレートかどうかを判定
     * 
     * @return bool
     */
    protected function isDefaultTemplate(): bool
    {
        return !is_null($this->is_default) && $this->is_default;
    }

    /**
     * システムテンプレートかどうかを判定
     * 
     * @return bool
     */
    protected function isSystemTemplate(): bool
    {
        return is_null($this->created_by);
    }

    /**
     * カスタムテンプレートかどうかを判定
     * 
     * @return bool
     */
    protected function isCustomTemplate(): bool
    {
        return !is_null($this->created_by);
    }

    /**
     * 削除可能かどうかを判定
     * 
     * @return bool
     */
    protected function canBeDeleted(): bool
    {
        return !$this->isSystemTemplate() && $this->usage_count == 0;
    }

    /**
     * 編集可能かどうかを判定
     * 
     * @return bool
     */
    protected function canBeModified(): bool
    {
        return !$this->isSystemTemplate() || auth()->user()?->hasRole('system_admin');
    }

    /**
     * サンプルプレビューを生成
     * 
     * @return array プレビューデータ
     */
    protected function generateSamplePreview(): array
    {
        $sampleVars = $this->getSampleVariables();
        $preview = $this->replaceVariables($sampleVars);

        return [
            'title' => $preview['title'],
            'message' => $preview['message'],
            'character_count' => mb_strlen($preview['message']),
            'line_count' => substr_count($preview['message'], "\n") + 1,
            'estimated_read_time' => $this->getEstimatedReadTime(),
        ];
    }

    /**
     * テンプレートハッシュを取得
     * 
     * @return string ハッシュ値
     */
    protected function getTemplateHash(): string
    {
        return md5($this->title . $this->message . $this->message_type);
    }

    /**
     * 編集権限確認
     * 
     * @return bool
     */
    protected function canEdit(): bool
    {
        $user = auth()->user();
        return $user && ($user->store_id === $this->store_id || $user->hasRole('system_admin'));
    }

    /**
     * 削除権限確認
     * 
     * @return bool
     */
    protected function canDelete(): bool
    {
        return $this->canEdit() && $this->canBeDeleted();
    }
}
