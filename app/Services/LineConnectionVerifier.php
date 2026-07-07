<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * LINE Messaging API 認証情報の疎通確認
 *
 * - Channel ID + Secret: OAuth2 client_credentials で検証
 * - Channel Access Token: GET /v2/bot/info で検証
 */
class LineConnectionVerifier
{
    private const LEGACY_OAUTH_TOKEN_URL = 'https://api.line.me/v2/oauth/accessToken';

    private const TOKEN_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

    private const BOT_INFO_URL = 'https://api.line.me/v2/bot/info';

    /**
     * Channel ID / Secret の有効性を確認
     *
     * @return array{ok: bool, message: string}
     */
    public function verifyChannelCredentials(string $channelId, string $channelSecret): array
    {
        $response = Http::asForm()
            ->timeout(15)
            ->post(self::LEGACY_OAUTH_TOKEN_URL, [
                'grant_type' => 'client_credentials',
                'client_id' => $channelId,
                'client_secret' => $channelSecret,
            ]);

        if ($response->successful()) {
            return [
                'ok' => true,
                'message' => 'Channel ID / Secret は有効です',
            ];
        }

        return [
            'ok' => false,
            'message' => $this->formatLineError(
                $response,
                'Channel ID または Channel Secret が不正です'
            ),
        ];
    }

    /**
     * Channel Access Token の有効性を確認
     *
     * @return array{ok: bool, message: string, bot_display_name?: string|null, bot_basic_id?: string|null, channel_id_match?: bool|null}
     */
    public function verifyAccessToken(string $accessToken, ?string $expectedChannelId = null): array
    {
        $verifyResponse = Http::timeout(15)
            ->get(self::TOKEN_VERIFY_URL, ['access_token' => $accessToken]);

        if (!$verifyResponse->successful()) {
            $botInfoResponse = Http::withToken($accessToken)
                ->timeout(15)
                ->get(self::BOT_INFO_URL);

            if (!$botInfoResponse->successful()) {
                return [
                    'ok' => false,
                    'message' => $this->formatLineError(
                        $botInfoResponse,
                        'Channel Access Token が不正または期限切れです'
                    ),
                ];
            }

            $data = $botInfoResponse->json();

            return [
                'ok' => true,
                'message' => 'Channel Access Token は有効です',
                'bot_display_name' => $data['displayName'] ?? null,
                'bot_basic_id' => $data['basicId'] ?? null,
            ];
        }

        $verifyData = $verifyResponse->json();
        $tokenChannelId = isset($verifyData['client_id']) ? (string) $verifyData['client_id'] : null;
        $expiresIn = $verifyData['expires_in'] ?? null;

        if ($expiresIn !== null && (int) $expiresIn <= 0) {
            return [
                'ok' => false,
                'message' => 'Channel Access Token の有効期限が切れています',
            ];
        }

        $channelIdMatch = null;
        if ($expectedChannelId !== null && $tokenChannelId !== null) {
            $channelIdMatch = $expectedChannelId === $tokenChannelId;
        }

        $botInfoResponse = Http::withToken($accessToken)
            ->timeout(15)
            ->get(self::BOT_INFO_URL);

        $botDisplayName = null;
        $botBasicId = null;
        if ($botInfoResponse->successful()) {
            $botData = $botInfoResponse->json();
            $botDisplayName = $botData['displayName'] ?? null;
            $botBasicId = $botData['basicId'] ?? null;
        }

        if ($channelIdMatch === false) {
            return [
                'ok' => false,
                'message' => 'Channel Access Token が Channel ID と一致しません',
                'bot_display_name' => $botDisplayName,
                'bot_basic_id' => $botBasicId,
                'channel_id_match' => false,
            ];
        }

        $message = 'Channel Access Token は有効です';
        if ($channelIdMatch === true) {
            $message .= '（Channel ID と一致）';
        }

        return [
            'ok' => true,
            'message' => $message,
            'bot_display_name' => $botDisplayName,
            'bot_basic_id' => $botBasicId,
            'channel_id_match' => $channelIdMatch,
        ];
    }

    private function formatLineError(Response $response, string $fallback): string
    {
        $body = $response->json();
        $description = $body['error_description'] ?? $body['message'] ?? null;

        if (is_string($description) && $description !== '') {
            return $description;
        }

        return $fallback;
    }
}
