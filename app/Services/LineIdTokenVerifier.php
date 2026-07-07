<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * LINE LIFF ID Token 検証サービス（SEC-L01）
 */
class LineIdTokenVerifier
{
    private const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

    /**
     * ID token を検証し LINE user ID (sub) を返す
     *
     * @throws \InvalidArgumentException 検証失敗時
     */
    public function verify(string $idToken, string $channelId): string
    {
        if ($idToken === '' || $channelId === '') {
            throw new \InvalidArgumentException('ID token または channel ID が未設定です');
        }

        $response = Http::asForm()->post(self::VERIFY_URL, [
            'id_token' => $idToken,
            'client_id' => $channelId,
        ]);

        if (!$response->successful()) {
            Log::warning('LINE ID token 検証失敗', [
                'status' => $response->status(),
                'channel_id' => $channelId,
            ]);
            throw new \InvalidArgumentException('LINE ID token の検証に失敗しました');
        }

        $payload = $response->json();
        $sub = $payload['sub'] ?? null;

        if (!$sub || !is_string($sub)) {
            throw new \InvalidArgumentException('LINE ID token に sub が含まれていません');
        }

        return $sub;
    }
}
