<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\LineConnectionVerifier;
use App\Services\NotificationService;
use App\Support\SensitiveDataMasker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * 店舗 LINE 連携設定 API（MVP-P6-02）
 */
class StoreLineSettingsController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly LineConnectionVerifier $lineConnectionVerifier
    ) {
        $this->middleware('auth:sanctum');
    }

    /**
     * GET /api/v1/store/line-settings
     */
    public function show(Request $request): JsonResponse
    {
        $store = $this->storeForUser();

        return response()->json([
            'success' => true,
            'data' => $this->formatSettings($store, $request),
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * PUT /api/v1/store/line-settings
     */
    public function update(Request $request): JsonResponse
    {
        $store = $this->storeForUser();

        $validated = $request->validate([
            'line_channel_id' => ['nullable', 'string', 'max:100', Rule::unique('stores', 'line_channel_id')->ignore($store->id)],
            'line_channel_secret' => ['nullable', 'string', 'max:500'],
            'line_access_token' => ['nullable', 'string', 'max:2000'],
            'line_liff_id' => ['nullable', 'string', 'max:100'],
            'line_integration_active' => ['nullable', 'boolean'],
        ]);

        $updates = [];
        foreach (['line_channel_id', 'line_liff_id', 'line_integration_active'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updates[$field] = $validated[$field];
            }
        }

        // 空文字は null 扱い（secret/token は未送信なら既存維持）
        if (array_key_exists('line_channel_secret', $validated) && $validated['line_channel_secret'] !== null && $validated['line_channel_secret'] !== '') {
            $updates['line_channel_secret'] = $validated['line_channel_secret'];
        }
        if (array_key_exists('line_access_token', $validated) && $validated['line_access_token'] !== null && $validated['line_access_token'] !== '') {
            $updates['line_access_token'] = $validated['line_access_token'];
        }

        $store->fill($updates);
        $store->save();

        Log::info('店舗 LINE 設定更新', [
            'store_id' => $store->id,
            'user_id' => Auth::id(),
            'changed_fields' => array_keys($updates),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatSettings($store->fresh(), $request),
            'message' => 'LINE 連携設定を保存しました',
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * POST /api/v1/store/line-settings/test-connection
     * Channel Secret / Access Token の疎通確認（保存前のフォーム値も受け付ける）
     */
    public function testConnection(Request $request): JsonResponse
    {
        $store = $this->storeForUser();

        $validated = $request->validate([
            'line_channel_id' => ['nullable', 'string', 'max:100'],
            'line_channel_secret' => ['nullable', 'string', 'max:500'],
            'line_access_token' => ['nullable', 'string', 'max:2000'],
        ]);

        $channelId = $validated['line_channel_id'] ?? $store->line_channel_id;
        $channelSecret = $validated['line_channel_secret'] ?? $store->line_channel_secret;
        $accessToken = $validated['line_access_token'] ?? $store->line_access_token;

        $checks = [];

        if ($channelId && $channelSecret) {
            $checks['channel_credentials'] = $this->lineConnectionVerifier->verifyChannelCredentials(
                $channelId,
                $channelSecret
            );
        } else {
            $checks['channel_credentials'] = [
                'ok' => false,
                'skipped' => true,
                'message' => 'Channel ID / Secret が未入力です',
            ];
        }

        if ($accessToken) {
            $checks['access_token'] = $this->lineConnectionVerifier->verifyAccessToken(
                $accessToken,
                $channelId ?: null
            );
        } else {
            $checks['access_token'] = [
                'ok' => false,
                'skipped' => true,
                'message' => 'Channel Access Token が未入力です',
            ];
        }

        $requiredChecks = array_filter($checks, fn (array $check) => empty($check['skipped']));
        $allOk = $requiredChecks !== [] && collect($requiredChecks)->every(fn (array $check) => $check['ok']);

        Log::info('LINE 認証情報疎通確認', [
            'store_id' => $store->id,
            'user_id' => Auth::id(),
            'channel_credentials_ok' => $checks['channel_credentials']['ok'] ?? false,
            'access_token_ok' => $checks['access_token']['ok'] ?? false,
        ]);

        if ($requiredChecks === []) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LINE_CREDENTIALS_MISSING',
                    'message' => '確認する認証情報がありません。Channel ID / Secret / Token を入力してください。',
                ],
                'data' => ['checks' => $checks],
            ], 422);
        }

        if (!$allOk) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LINE_CONNECTION_FAILED',
                    'message' => '認証情報の疎通確認に失敗しました。各項目の結果を確認してください。',
                ],
                'data' => ['checks' => $checks],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => '認証情報の疎通確認に成功しました',
            'data' => ['checks' => $checks],
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * POST /api/v1/store/line-settings/test-push
     */
    public function testPush(Request $request): JsonResponse
    {
        $store = $this->storeForUser();

        $validated = $request->validate([
            'line_user_id' => ['required', 'string', 'max:255'],
        ]);

        if (!$store->hasLineIntegration()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LINE_NOT_CONFIGURED',
                    'message' => 'LINE 連携が未設定です。Channel ID / Secret / Token を設定してください。',
                ],
            ], 422);
        }

        $messages = [[
            'type' => 'text',
            'text' => 'tugical LINE 接続テスト: 設定は正常です。',
        ]];

        $ok = $this->notificationService->sendLineMessage(
            $validated['line_user_id'],
            $messages,
            $store->id
        );

        if (!$ok) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LINE_PUSH_FAILED',
                    'message' => 'Push 送信に失敗しました。トークンと友だち追加を確認してください。',
                ],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'テスト Push を送信しました',
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    private function storeForUser(): Store
    {
        return Store::findOrFail(Auth::user()->store_id);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSettings(Store $store, Request $request): array
    {
        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');

        return [
            'line_channel_id' => $store->line_channel_id,
            'line_channel_secret_set' => !empty($store->line_channel_secret),
            'line_access_token_set' => !empty($store->line_access_token),
            'line_liff_id' => $store->line_liff_id,
            'line_integration_active' => (bool) $store->line_integration_active,
            'has_line_integration' => $store->hasLineIntegration(),
            'webhook_url' => "{$baseUrl}/api/v1/line/webhook",
            'liff_url' => $store->line_liff_id
                ? "{$baseUrl}/liff?storeId={$store->id}"
                : null,
        ];
    }
}
