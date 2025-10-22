<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Store;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

/**
 * NotificationService
 * 
 * tugical通知管理サービス
 * 
 * 主要機能:
 * - LINE Messaging API統合
 * - メール通知送信
 * - 通知テンプレート管理・変数置換
 * - 業種別テンプレート対応
 * - 自動リトライ・エラーハンドリング
 * - 配信追跡・配信結果管理
 * - 一括通知・スケジュール通知
 * 
 * 対応通知タイプ:
 * - booking_confirmed (予約確定)
 * - booking_reminder (予約リマインダー)
 * - booking_cancelled (予約キャンセル)
 * - booking_updated (予約変更)
 * - payment_completed (決済完了)
 * 
 * @package App\Services
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class NotificationService
{
    /**
     * LINE Messaging API Base URL
     */
    protected const LINE_API_URL = 'https://api.line.me/v2/bot/message';

    /**
     * 通知リトライ最大回数
     */
    protected const MAX_RETRY_COUNT = 3;

    /**
     * リトライ間隔（秒）
     */
    protected const RETRY_INTERVALS = [30, 300, 1800]; // 30秒, 5分, 30分

    /**
     * 予約確定通知送信
     * 
     * 予約作成・承認時の自動通知
     * 
     * @param Booking $booking 予約情報
     * @return bool 送信成功可否
     */
    public function sendBookingConfirmation(Booking $booking): bool
    {
        /**
         * 予約確定時 LINE 通知送信処理
         * 
         * 1. テンプレート取得
         * 2. 変数置換
         * 3. LINE メッセージ送信
         * 4. 通知レコード作成
         * 5. 予約モデルに通知履歴追記
         */

        $store = $booking->store;
        $customer = $booking->customer;

        // LINE連携必須チェック
        if (!$customer || empty($customer->line_user_id) || !$store->hasLineIntegration()) {
            $this->logNotification('booking_confirmed', 'line', $customer->line_user_id ?? 'unknown', 'failed', [
                'reason' => 'LINE連携未設定',
            ]);
            return false;
        }

        // 変数準備
        $variables = [
            'customer_name'   => $customer->name,
            'booking_number'  => $booking->booking_number,
            'booking_date'    => $booking->booking_date?->format('Y年m月d日'),
            'booking_time'    => $booking->start_time,
            'menu_name'       => $booking->menu?->name,
            'total_price'     => '¥' . number_format($booking->total_price),
            'store_name'      => $store->name,
        ];

        // テンプレートレンダリング
        $template = $this->renderNotificationTemplate($store->id, NotificationTemplate::TYPE_BOOKING_CONFIRMED, $variables);

        $success = $this->sendLineMessage(
            $customer->line_user_id,
            $template['line_messages'],
            $store->id
        );

        // 通知レコード保存
        $notification = $this->recordNotification(
            $store->id,
            Notification::TYPE_BOOKING_CONFIRMED,
            'line',
            $customer->line_user_id,
            $success ? Notification::STATUS_SENT : Notification::STATUS_FAILED,
            [
                'booking_id' => $booking->id,
                'template_id' => $template['template_id'] ?? null,
            ]
        );

        // 予約に履歴追加
        if ($success) {
            $booking->recordNotification('booking_confirmed', ['notification_id' => $notification->id]);
        }

        return $success;
    }

    /**
     * 予約リマインダー通知送信
     * 
     * 予約前日・当日の自動リマインダー
     * 
     * @param Booking $booking 予約情報
     * @param string $timing リマインダータイミング ('1day', '3hours', '30minutes')
     * @return bool 送信成功可否
     */
    public function sendBookingReminder(Booking $booking, string $timing): bool
    {
        $store = $booking->store;
        $customer = $booking->customer;

        if (!$customer || empty($customer->line_user_id) || !$store->hasLineIntegration()) {
            return false;
        }

        $variables = [
            'customer_name'  => $customer->name,
            'booking_number' => $booking->booking_number,
            'booking_date'   => $booking->booking_date?->format('Y年m月d日'),
            'booking_time'   => $booking->start_time,
            'menu_name'      => $booking->menu?->name,
            'store_name'     => $store->name,
        ];

        $template = $this->renderNotificationTemplate($store->id, NotificationTemplate::TYPE_BOOKING_REMINDER, $variables);

        $success = $this->sendLineMessage($customer->line_user_id, $template['line_messages'], $store->id);

        $this->recordNotification(
            $store->id,
            Notification::TYPE_BOOKING_REMINDER,
            'line',
            $customer->line_user_id,
            $success ? Notification::STATUS_SENT : Notification::STATUS_FAILED,
            ['booking_id' => $booking->id]
        );

        if ($success) {
            $booking->recordNotification('booking_reminder');
        }

        return $success;
    }

    /**
     * 予約キャンセル通知送信
     * 
     * @param Booking $booking 予約情報
     * @param string|null $reason キャンセル理由
     * @return bool 送信成功可否
     */
    public function sendBookingCancellation(Booking $booking, ?string $reason = null): bool
    {
        $store = $booking->store;
        $customer = $booking->customer;

        if (!$customer || empty($customer->line_user_id) || !$store->hasLineIntegration()) {
            return false;
        }

        $variables = [
            'customer_name'       => $customer->name,
            'booking_number'      => $booking->booking_number,
            'booking_date'        => $booking->booking_date?->format('Y年m月d日'),
            'booking_time'        => $booking->start_time,
            'cancellation_reason' => $reason ?? '未設定',
            'store_name'          => $store->name,
        ];

        $template = $this->renderNotificationTemplate($store->id, NotificationTemplate::TYPE_BOOKING_CANCELLED, $variables);

        $success = $this->sendLineMessage($customer->line_user_id, $template['line_messages'], $store->id);

        $this->recordNotification(
            $store->id,
            Notification::TYPE_BOOKING_CANCELLED,
            'line',
            $customer->line_user_id,
            $success ? Notification::STATUS_SENT : Notification::STATUS_FAILED,
            ['booking_id' => $booking->id]
        );

        if ($success) {
            $booking->recordNotification('booking_cancelled');
        }

        return $success;
    }

    /**
     * 予約変更通知送信
     * 
     * @param Booking $booking 変更後予約情報
     * @param array $changes 変更内容
     * @return bool 送信成功可否
     */
    public function sendBookingUpdate(Booking $booking, array $changes): bool
    {
        // Booking Update は予約確定とほぼ同様のテンプレートを利用する
        $store = $booking->store;
        $customer = $booking->customer;

        if (!$customer || empty($customer->line_user_id) || !$store->hasLineIntegration()) {
            return false;
        }

        $variables = [
            'customer_name'  => $customer->name,
            'booking_number' => $booking->booking_number,
            'booking_date'   => $booking->booking_date?->format('Y年m月d日'),
            'booking_time'   => $booking->start_time,
            'menu_name'      => $booking->menu?->name,
            'store_name'     => $store->name,
            'changes'        => json_encode($changes, JSON_UNESCAPED_UNICODE),
        ];

        // booking_updated 用テンプレートが無ければ booking_confirmed を再利用
        $templateType = NotificationTemplate::TYPE_BOOKING_CONFIRMED;
        $template = $this->renderNotificationTemplate($store->id, $templateType, $variables);

        $success = $this->sendLineMessage($customer->line_user_id, $template['line_messages'], $store->id);

        $this->recordNotification(
            $store->id,
            Notification::TYPE_STATUS_CHANGED,
            'line',
            $customer->line_user_id,
            $success ? Notification::STATUS_SENT : Notification::STATUS_FAILED,
            ['booking_id' => $booking->id]
        );

        if ($success) {
            $booking->recordNotification('booking_updated');
        }

        return $success;
    }

    /**
     * LINE メッセージ送信（汎用）
     * 
     * @param string $lineUserId LINE User ID
     * @param array $messages メッセージ配列
     * @param int $storeId 店舗ID（アクセストークン特定用）
     * @return bool 送信成功可否
     */
    public function sendLineMessage(string $lineUserId, array $messages, int $storeId): bool
    {
        $accessToken = $this->getLineAccessToken($storeId);

        if (!$accessToken) {
            $this->logNotification('system', 'line', $lineUserId, 'failed', ['reason' => 'アクセストークン未設定']);
            return false;
        }

        // メッセージフォーマット（LINE API仕様）
        $payload = [
            'to' => $lineUserId,
            'messages' => $messages,
        ];

        try {
            $response = Http::withToken($accessToken)
                ->post(self::LINE_API_URL . '/push', $payload);

            if ($response->successful()) {
                $this->logNotification('system', 'line', $lineUserId, 'sent', ['payload' => $payload]);
                return true;
            }

            $this->logNotification('system', 'line', $lineUserId, 'failed', [
                'response' => $response->json(),
                'status'   => $response->status(),
            ]);

            return false;
        } catch (\Throwable $e) {
            $this->logNotification('system', 'line', $lineUserId, 'failed', [
                'exception' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * メール通知送信
     * 
     * @param string $email メールアドレス
     * @param string $subject 件名
     * @param string $body 本文
     * @param int $storeId 店舗ID
     * @return bool 送信成功可否
     */
    public function sendEmailNotification(string $email, string $subject, string $body, int $storeId): bool
    {
        try {
            \Mail::raw($body, function ($message) use ($email, $subject) {
                $message->to($email)->subject($subject);
            });

            $this->recordNotification($storeId, 'email', 'email', $email, Notification::STATUS_SENT);
            return true;
        } catch (\Throwable $e) {
            $this->recordNotification($storeId, 'email', 'email', $email, Notification::STATUS_FAILED, [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * 通知テンプレート取得・変数置換
     * 
     * @param int $storeId 店舗ID
     * @param string $templateType テンプレートタイプ
     * @param array $variables 置換変数
     * @return array 処理済みテンプレート
     * [
     *   'subject' => string,
     *   'body' => string,
     *   'line_messages' => array
     * ]
     */
    public function renderNotificationTemplate(int $storeId, string $templateType, array $variables): array
    {
        // 1. 店舗別カスタムテンプレート > システムテンプレート の順で検索
        $template = NotificationTemplate::where('store_id', $storeId)
            ->active()
            ->byType($templateType)
            ->first();

        $store = Store::find($storeId);

        // 2. 業種別デフォルトテンプレート（店舗にない場合）
        if (!$template && $store) {
            $industry = $store->industry_type ?? NotificationTemplate::INDUSTRY_BEAUTY;
            $defaultTemplates = NotificationTemplate::getDefaultTemplates();
            $default = $defaultTemplates[$industry][$templateType] ?? null;

            if ($default) {
                $template = new NotificationTemplate([
                    'store_id'      => $storeId,
                    'type'          => $templateType,
                    'industry_type' => $industry,
                    'title'         => $default['title'],
                    'message'       => $default['message'],
                    'message_type'  => NotificationTemplate::MESSAGE_TYPE_TEXT,
                    'is_active'     => true,
                ]);
            }
        }

        if (!$template) {
            // テンプレートが見つからない場合は簡易メッセージ
            $subject = $variables['store_name'] ?? 'tugical';
            $body    = $this->replaceVariables('{customer_name} 様、ご予約ありがとうございます。', $variables);
            return [
                'subject'      => $subject,
                'body'         => $body,
                'line_messages'=> [['type' => 'text', 'text' => $body]],
            ];
        }

        // 3. 変数置換
        $replaced = $template->replaceVariables($variables);

        // LINEメッセージ生成
        $lineMessages = [];
        if ($template->message_type === NotificationTemplate::MESSAGE_TYPE_RICH) {
            $rich = $template->generateRichMessage($variables);
            if ($rich) {
                $lineMessages = $rich['messages'] ?? [];
            }
        }

        // フォールバック: テキストメッセージ
        if (empty($lineMessages)) {
            $lineMessages[] = [
                'type' => 'text',
                'text' => $replaced['message'],
            ];
        }

        // 使用回数増加（永続テンプレートのみ）
        if ($template->exists) {
            $template->incrementUsage();
        }

        return [
            'template_id'  => $template->id ?? null,
            'subject'      => $replaced['title'],
            'body'         => $replaced['message'],
            'line_messages'=> $lineMessages,
        ];
    }

    /**
     * 一括通知送信
     * 
     * キャンペーン・緊急連絡等の一括配信
     * 
     * @param int $storeId 店舗ID
     * @param array $customerIds 対象顧客IDリスト
     * @param array $message メッセージ内容
     * @return array 送信結果
     * [
     *   'success_count' => int,
     *   'failed_count' => int,
     *   'failed_customers' => array
     * ]
     */
    public function sendBulkNotification(int $storeId, array $customerIds, array $message): array
    {
        $success = 0;
        $failed  = 0;
        $failedCustomers = [];

        $customers = Customer::whereIn('id', $customerIds)->get();

        foreach ($customers as $customer) {
            if (empty($customer->line_user_id)) {
                $failed++;
                $failedCustomers[] = $customer->id;
                continue;
            }

            $result = $this->sendLineMessage($customer->line_user_id, $message, $storeId);
            if ($result) {
                $success++;
            } else {
                $failed++;
                $failedCustomers[] = $customer->id;
            }
        }

        return [
            'success_count'   => $success,
            'failed_count'    => $failed,
            'failed_customers'=> $failedCustomers,
        ];
    }

    /**
     * スケジュール通知設定
     * 
     * 指定日時での通知予約
     * 
     * @param int $storeId 店舗ID
     * @param string $scheduleAt 送信日時（Y-m-d H:i:s）
     * @param string $notificationType 通知タイプ
     * @param array $targetData 対象データ
     * @return bool 設定成功可否
     */
    public function scheduleNotification(int $storeId, string $scheduleAt, string $notificationType, array $targetData): bool
    {
        try {
            Notification::create([
                'store_id'     => $storeId,
                'type'         => $notificationType,
                'recipient_type' => Notification::RECIPIENT_TYPE_CUSTOMER,
                'recipient_id' => $targetData['line_user_id'] ?? '',
                'title'        => $targetData['title'] ?? '',
                'message'      => $targetData['message'] ?? '',
                'status'       => Notification::STATUS_PENDING,
                'scheduled_at' => $scheduleAt,
                'template_variables' => $targetData['variables'] ?? [],
            ]);
            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to schedule notification', [
                'store_id' => $storeId,
                'error'    => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * 通知配信結果記録
     * 
     * @param int $storeId 店舗ID
     * @param string $notificationType 通知タイプ
     * @param string $channel 配信チャネル ('line', 'email', 'sms')
     * @param string $recipient 受信者（LINE User ID / Email）
     * @param string $status 配信ステータス ('sent', 'failed', 'pending')
     * @param array $metadata 追加情報
     * @return Notification 作成された通知レコード
     */
    public function recordNotification(
        int $storeId,
        string $notificationType,
        string $channel,
        string $recipient,
        string $status,
        array $metadata = []
    ): Notification {
        return Notification::create(array_merge([
            'store_id'     => $storeId,
            'type'         => $notificationType,
            'recipient_type' => $channel === 'line' ? Notification::RECIPIENT_TYPE_CUSTOMER : Notification::RECIPIENT_TYPE_BROADCAST,
            'recipient_id' => $recipient,
            'title'        => $metadata['title'] ?? '',
            'message'      => $metadata['message'] ?? '',
            'status'       => $status,
            'template_id'  => $metadata['template_id'] ?? null,
            'booking_id'   => $metadata['booking_id'] ?? null,
            'template_variables' => $metadata['variables'] ?? null,
            'line_payload' => $metadata['line_payload'] ?? null,
            'delivery_info'=> $metadata['delivery_info'] ?? null,
        ], [
            'max_retries' => self::MAX_RETRY_COUNT,
        ]));
    }

    /**
     * 配信失敗時の自動リトライ
     * 
     * @param Notification $notification 失敗した通知
     * @return bool リトライ実行可否
     */
    public function retryFailedNotification(Notification $notification): bool
    {
        if (!$notification->canRetry()) {
            return false;
        }

        // バックオフ計算
        $delaySeconds = self::RETRY_INTERVALS[min($notification->retry_count, count(self::RETRY_INTERVALS) - 1)];

        // キュー投入 (簡易処理として即時呼び出し)
        $success = $this->sendLineMessage($notification->recipient_id, $notification->line_payload['messages'] ?? [[
            'type' => 'text',
            'text' => $notification->message,
        ]], $notification->store_id);

        if ($success) {
            $notification->markAsSent(['retry' => true]);
        } else {
            $notification->markAsFailed('Retry failed');
        }

        return $success;
    }

    /**
     * 通知統計情報取得
     * 
     * @param int $storeId 店舗ID
     * @param string|null $startDate 開始日
     * @param string|null $endDate 終了日
     * @return array 統計情報
     * [
     *   'total_sent' => int,
     *   'success_rate' => float,
     *   'channel_breakdown' => array,
     *   'type_breakdown' => array
     * ]
     */
    public function getNotificationStats(int $storeId, ?string $startDate = null, ?string $endDate = null): array
    {
        $query = Notification::where('store_id', $storeId)->sent();

        if ($startDate && $endDate) {
            $query->dateRange($startDate, $endDate);
        }

        $totalSent = $query->count();

        $channelBreakdown = Notification::select('recipient_type', \DB::raw('count(*) as cnt'))
            ->where('store_id', $storeId)
            ->groupBy('recipient_type')
            ->pluck('cnt', 'recipient_type')
            ->toArray();

        $typeBreakdown = Notification::select('type', \DB::raw('count(*) as cnt'))
            ->where('store_id', $storeId)
            ->groupBy('type')
            ->pluck('cnt', 'type')
            ->toArray();

        return [
            'total_sent'        => $totalSent,
            'channel_breakdown' => $channelBreakdown,
            'type_breakdown'    => $typeBreakdown,
        ];
    }

    /**
     * LINE Webhook処理
     * 
     * LINE側からのイベント受信処理
     * 
     * @param array $events LINEイベント配列
     * @return bool 処理成功可否
     */
    public function handleLineWebhook(array $events): bool
    {
        // このメソッドでは受信したLINEイベントをログに記録し、
        // 必要に応じて後続処理（自動応答や既読処理）へ委譲する。

        try {
            foreach ($events as $event) {
                Log::info('Received LINE event', [
                    'type'   => $event['type'] ?? 'unknown',
                    'userId' => $event['source']['userId'] ?? null,
                    'event'  => $event,
                ]);
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to handle LINE webhook', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * 変数置換処理
     * 
     * テンプレート内の変数を実際の値に置換
     * 
     * @param string $template テンプレート文字列
     * @param array $variables 変数配列
     * @return string 置換後文字列
     */
    protected function replaceVariables(string $template, array $variables): string
    {
        foreach ($variables as $key => $value) {
            $template = str_replace("{{$key}}", $value, $template);
        }
        return $template;
    }

    /**
     * LINEアクセストークン取得
     * 
     * 店舗別のLINE APIアクセストークンを取得
     * 
     * @param int $storeId 店舗ID
     * @return string|null アクセストークン
     */
    protected function getLineAccessToken(int $storeId): ?string
    {
        $store = Store::find($storeId);
        if (!$store) {
            return null;
        }

        $lineSettings = $store->line_integration ?? [];
        return $lineSettings['access_token'] ?? env('LINE_ACCESS_TOKEN');
    }

    /**
     * 通知送信ログ記録
     * 
     * @param string $type 通知タイプ
     * @param string $channel 配信チャネル
     * @param string $recipient 受信者
     * @param string $status ステータス
     * @param array $details 詳細情報
     * @return void
     */
    protected function logNotification(string $type, string $channel, string $recipient, string $status, array $details): void
    {
        Log::info('Notification sent', [
            'type' => $type,
            'channel' => $channel,
            'recipient' => $channel === 'line' ? substr($recipient, 0, 8) . '****' : $recipient,
            'status' => $status,
            'details' => $details,
            'timestamp' => now()->toISOString(),
        ]);
    }
} 