<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\Store;
use App\Services\BookingService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * LINE 予約通知の結合テスト（Http::fake による API モック）
 *
 * 実機 E2E の代替として、予約確定・変更時に LINE Push API が呼ばれることを検証する。
 */
class LineBookingNotificationTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * 予約確定時に LINE Push API が呼ばれ、通知レコードが sent になる
     */
    public function test_send_booking_confirmation_calls_line_push_api(): void
    {
        Http::fake([
            'api.line.me/*' => Http::response([]),
        ]);

        $store = Store::findOrFail(1);
        $originalStoreLine = $this->snapshotStoreLineSettings($store);

        $store->update([
            'line_channel_id' => 'test-channel-id',
            'line_channel_secret' => 'test-channel-secret',
            'line_access_token' => 'test-line-token',
        ]);

        $booking = Booking::withoutGlobalScopes()
            ->with(['customer', 'menu', 'store'])
            ->where('store_id', 1)
            ->whereNotNull('customer_id')
            ->first();

        $this->assertNotNull($booking, 'テスト用予約データが必要です');

        $customer = $booking->customer;
        $originalLineUserId = $customer->line_user_id;
        $customer->update(['line_user_id' => 'U_e2e_test_user']);

        $result = app(NotificationService::class)->sendBookingConfirmation(
            $booking->fresh(['customer', 'menu', 'store'])
        );

        $this->assertTrue($result);

        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), 'api.line.me/v2/bot/message/push')
                && ($body['to'] ?? '') === 'U_e2e_test_user'
                && !empty($body['messages']);
        });

        $this->assertDatabaseHas('notifications', [
            'store_id' => 1,
            'type' => 'booking_confirmed',
            'recipient_id' => 'U_e2e_test_user',
            'status' => Notification::STATUS_SENT,
        ]);

        $payload = Http::recorded()[0][0]->data();
        $this->assertNotEmpty($payload['messages']);

        $store->update($originalStoreLine);
        $customer->update(['line_user_id' => $originalLineUserId]);
    }

    /**
     * 予約日時変更時に LINE Push API が呼ばれる
     */
    public function test_booking_update_triggers_line_notification(): void
    {
        Http::fake([
            'api.line.me/*' => Http::response([]),
        ]);

        $store = Store::findOrFail(1);
        $originalStoreLine = $this->snapshotStoreLineSettings($store);

        $store->update([
            'line_channel_id' => 'test-channel-id',
            'line_channel_secret' => 'test-channel-secret',
            'line_access_token' => 'test-line-token',
        ]);

        $booking = Booking::withoutGlobalScopes()
            ->with(['customer', 'menu', 'store'])
            ->where('store_id', 1)
            ->where('status', 'confirmed')
            ->whereNotNull('customer_id')
            ->first();

        $this->assertNotNull($booking);

        $customer = $booking->customer;
        $originalLineUserId = $customer->line_user_id;
        $customer->update(['line_user_id' => 'U_e2e_update_user']);

        app(BookingService::class)->updateBooking($booking, [
            'booking_date' => now()->addDays(14)->format('Y-m-d'),
        ]);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'api.line.me/v2/bot/message/push')
                && ($request->data()['to'] ?? '') === 'U_e2e_update_user';
        });

        $store->update($originalStoreLine);
        $customer->update(['line_user_id' => $originalLineUserId]);
    }

    /**
     * LINE 未連携時は Push を送らず false を返す
     */
    public function test_skips_notification_when_line_not_configured(): void
    {
        Http::fake();

        $store = Store::findOrFail(1);
        $originalStoreLine = $this->snapshotStoreLineSettings($store);

        $store->update([
            'line_channel_id' => null,
            'line_channel_secret' => null,
            'line_access_token' => null,
        ]);

        $booking = Booking::withoutGlobalScopes()
            ->with(['customer', 'menu', 'store'])
            ->where('store_id', 1)
            ->first();

        $this->assertNotNull($booking);

        $result = app(NotificationService::class)->sendBookingConfirmation(
            $booking->fresh(['customer', 'menu', 'store'])
        );

        $this->assertFalse($result);
        Http::assertNothingSent();

        $store->update($originalStoreLine);
    }

    /**
     * 店舗 LINE 設定のスナップショット
     *
     * @return array<string, mixed>
     */
    private function snapshotStoreLineSettings(Store $store): array
    {
        return [
            'line_channel_id' => $store->line_channel_id,
            'line_channel_secret' => $store->line_channel_secret,
            'line_access_token' => $store->line_access_token,
        ];
    }
}
