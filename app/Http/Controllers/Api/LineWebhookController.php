<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * LINE Webhook 受信（MVP-P4-01 + P6-05）
 */
class LineWebhookController extends Controller
{
    /**
     * POST /api/v1/line/webhook
     */
    public function handle(Request $request): JsonResponse
    {
        $body = $request->getContent();
        $signature = $request->header('X-Line-Signature', '');
        $payload = json_decode($body, true) ?? [];

        $destination = $payload['destination'] ?? null;
        if (!$destination) {
            Log::warning('LINE Webhook: destination なし');
            return response()->json(['success' => true]);
        }

        $store = Store::where('line_channel_id', $destination)->first();
        if (!$store) {
            Log::warning('LINE Webhook: 店舗未特定', ['destination' => $destination]);
            return response()->json(['success' => true]);
        }

        if (!$this->verifySignature($body, $signature, $store->line_channel_secret ?? '')) {
            Log::warning('LINE Webhook: 署名検証失敗', ['store_id' => $store->id]);
            return response()->json(['success' => false, 'error' => 'invalid signature'], 403);
        }

        foreach ($payload['events'] ?? [] as $event) {
            $this->handleEvent($store, $event);
        }

        return response()->json(['success' => true]);
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function handleEvent(Store $store, array $event): void
    {
        $type = $event['type'] ?? '';

        Log::info('LINE Webhook イベント受信', [
            'store_id' => $store->id,
            'event_type' => $type,
        ]);

        if ($type === 'follow') {
            // 最低限 200 応答（follow 処理の拡張は将来）
            return;
        }

        if ($type === 'message') {
            // メッセージイベントは現 MVP ではログのみ
            return;
        }
    }

    private function verifySignature(string $body, string $signature, string $secret): bool
    {
        if ($secret === '' || $signature === '') {
            return false;
        }

        $hash = base64_encode(hash_hmac('sha256', $body, $secret, true));

        return hash_equals($hash, $signature);
    }
}
