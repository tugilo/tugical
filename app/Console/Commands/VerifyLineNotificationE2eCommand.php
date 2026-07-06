<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Store;
use App\Services\BookingService;
use App\Services\NotificationService;
use Illuminate\Console\Command;

/**
 * LINE 予約通知 E2E 確認コマンド
 *
 * 環境設定の事前チェックと、任意でテスト Push 送信を行う。
 * β 条件「予約確定・変更時に LINE 通知が届く」の P0 確認用。
 */
class VerifyLineNotificationE2eCommand extends Command
{
    protected $signature = 'tugical:verify-line-e2e
                            {--store=1 : 対象店舗 ID}
                            {--customer= : テスト送信先顧客 ID（省略時は line_user_id あり先頭）}
                            {--send : テスト Push を送信する}
                            {--booking= : 予約確定通知テスト用の既存予約 ID}';

    protected $description = 'LINE 予約通知 E2E の事前チェックとテスト送信（P0-1）';

    /**
     * コマンド実行
     */
    public function handle(NotificationService $notificationService, BookingService $bookingService): int
    {
        $storeId = (int) $this->option('store');
        $store = Store::find($storeId);

        if (!$store) {
            $this->error("店舗 ID {$storeId} が見つかりません。");

            return self::FAILURE;
        }

        $this->info('=== tugical LINE 通知 E2E 事前チェック ===');
        $this->line("店舗: [{$store->id}] {$store->name}");
        $this->newLine();

        $checks = $this->runPreflightChecks($store);
        $this->renderChecklist($checks);

        $allReady = collect($checks)->every(fn (array $c) => $c['ok']);

        if (!$allReady) {
            $this->newLine();
            $this->warn('未設定項目があります。backend/docs/LINE_NOTIFICATION_E2E_GUIDE_v1.0.md を参照して設定してください。');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('事前チェック: すべて OK');

        if (!$this->option('send')) {
            $this->line('--send を付けるとテスト Push または予約通知の送信テストを実行します。');

            return self::SUCCESS;
        }

        return $this->runSendTest($store, $notificationService, $bookingService);
    }

    /**
     * 事前チェック項目を収集
     *
     * @return array<string, array{ok: bool, detail: string}>
     */
    private function runPreflightChecks(Store $store): array
    {
        $token = $store->line_access_token
            ?: ($store->line_integration['access_token'] ?? null)
            ?: env('LINE_ACCESS_TOKEN');

        $lineCustomers = Customer::withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->whereNotNull('line_user_id')
            ->where('line_user_id', '!=', '')
            ->count();

        $recentNotifications = Notification::withoutGlobalScopes()
            ->where('store_id', $store->id)
            ->where('channel', 'line')
            ->orderByDesc('id')
            ->limit(3)
            ->get(['id', 'type', 'status', 'created_at']);

        $recentDetail = $recentNotifications->isEmpty()
            ? '送信履歴なし'
            : $recentNotifications->map(fn ($n) => "#{$n->id} {$n->type} ({$n->status})")->implode(', ');

        return [
            'line_channel' => [
                'ok' => $store->hasLineIntegration(),
                'detail' => $store->hasLineIntegration()
                    ? 'line_channel_id / line_channel_secret 設定済み'
                    : 'line_channel_id / line_channel_secret 未設定',
            ],
            'access_token' => [
                'ok' => !empty($token),
                'detail' => !empty($token)
                    ? 'アクセストークン取得可（店舗カラムまたは LINE_ACCESS_TOKEN）'
                    : 'line_access_token および LINE_ACCESS_TOKEN が未設定',
            ],
            'line_customer' => [
                'ok' => $lineCustomers > 0,
                'detail' => $lineCustomers > 0
                    ? "line_user_id 付き顧客 {$lineCustomers} 件"
                    : 'line_user_id 付き顧客なし（LIFF getOrCreateCustomer または手動設定が必要）',
            ],
            'recent_notifications' => [
                'ok' => true,
                'detail' => $recentDetail,
            ],
        ];
    }

    /**
     * チェックリストを表示
     *
     * @param array<string, array{ok: bool, detail: string}> $checks
     */
    private function renderChecklist(array $checks): void
    {
        foreach ($checks as $label => $check) {
            $mark = $check['ok'] ? '<fg=green>✓</>' : '<fg=red>✗</>';
            $this->line(" {$mark} {$label}: {$check['detail']}");
        }
    }

    /**
     * テスト送信を実行
     */
    private function runSendTest(
        Store $store,
        NotificationService $notificationService,
        BookingService $bookingService
    ): int {
        $bookingId = $this->option('booking');

        if ($bookingId) {
            $booking = Booking::withoutGlobalScopes()
                ->with(['customer', 'menu', 'store'])
                ->where('store_id', $store->id)
                ->find($bookingId);

            if (!$booking) {
                $this->error("予約 ID {$bookingId} が見つかりません。");

                return self::FAILURE;
            }

            $this->info("予約確定通知テスト: booking #{$booking->booking_number}");
            $success = $notificationService->sendBookingConfirmation($booking->fresh(['customer', 'menu', 'store']));

            return $this->reportSendResult($success, '予約確定通知');
        }

        $customerId = $this->option('customer');
        $customerQuery = Customer::withoutGlobalScopes()->where('store_id', $store->id);

        $customer = $customerId
            ? $customerQuery->find($customerId)
            : $customerQuery->whereNotNull('line_user_id')->where('line_user_id', '!=', '')->first();

        if (!$customer || empty($customer->line_user_id)) {
            $this->error('送信先顧客（line_user_id 付き）が見つかりません。');

            return self::FAILURE;
        }

        $this->info("テスト Push 送信先: {$customer->name} (line_user_id: {$customer->line_user_id})");

        $success = $notificationService->sendLineMessage(
            $customer->line_user_id,
            [[
                'type' => 'text',
                'text' => '【tugical テスト】LINE 通知 E2E 確認メッセージです。',
            ]],
            $store->id
        );

        return $this->reportSendResult($success, 'テスト Push');
    }

    /**
     * 送信結果を表示
     */
    private function reportSendResult(bool $success, string $label): int
    {
        if ($success) {
            $this->info("{$label}: 送信 API は成功しました。顧客の LINE アプリで受信を確認してください。");
            $this->line('確認結果を MVP_IMPLEMENTATION_PLAN.md MVP-P4-02「確認結果」に Yes/No で記録してください。');

            return self::SUCCESS;
        }

        $this->error("{$label}: 送信に失敗しました。storage/logs/laravel.log を確認してください。");

        return self::FAILURE;
    }
}
