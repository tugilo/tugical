<?php

namespace Tests\Feature;

use App\Models\Store;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class LineWebhookTest extends TestCase
{
    use DatabaseTransactions;

    public function test_webhook_rejects_invalid_signature(): void
    {
        $store = Store::findOrFail(1);
        $original = [
            'line_channel_id' => $store->line_channel_id,
            'line_channel_secret' => $store->line_channel_secret,
        ];

        $store->update([
            'line_channel_id' => '2000000099',
            'line_channel_secret' => 'webhook-secret',
        ]);

        $body = json_encode([
            'destination' => '2000000099',
            'events' => [['type' => 'follow']],
        ]);

        $this->call('POST', '/api/v1/line/webhook', [], [], [], [
            'HTTP_X-Line-Signature' => 'invalid',
            'CONTENT_TYPE' => 'application/json',
        ], $body)
            ->assertStatus(403);

        $store->update($original);
    }

    public function test_webhook_accepts_valid_signature(): void
    {
        $store = Store::findOrFail(1);
        $original = [
            'line_channel_id' => $store->line_channel_id,
            'line_channel_secret' => $store->line_channel_secret,
        ];

        $secret = 'webhook-secret-valid';
        $store->update([
            'line_channel_id' => '2000000100',
            'line_channel_secret' => $secret,
        ]);

        $body = json_encode([
            'destination' => '2000000100',
            'events' => [['type' => 'follow']],
        ]);

        $signature = base64_encode(hash_hmac('sha256', $body, $secret, true));

        $this->call('POST', '/api/v1/line/webhook', [], [], [], [
            'HTTP_X-Line-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body)
            ->assertOk()
            ->assertJson(['success' => true]);

        $store->update($original);
    }
}
