<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * ログ出力用の機密・PII マスクユーティリティ（MVP-SEC-01）
 */
class SensitiveDataMasker
{
    private const REDACTED = '[REDACTED]';

    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'line_channel_secret',
        'line_access_token',
        'token',
        'api_key',
        'secret',
        'authorization',
    ];

    /** @var list<string> */
    private const PII_KEYS = [
        'phone',
        'email',
        'address',
        'postal_code',
        'prefecture',
        'city',
        'address_line1',
        'address_line2',
        'name',
        'name_kana',
        'birth_date',
        'birthday',
        'notes',
        'line_user_id',
        'line_display_name',
        'line_picture_url',
    ];

    /**
     * 配列内の機密・PII キーを再帰的にマスクする
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function mask(array $data): array
    {
        $masked = [];

        foreach ($data as $key => $value) {
            $normalizedKey = is_string($key) ? strtolower($key) : $key;

            if (is_string($normalizedKey) && self::shouldRedact($normalizedKey)) {
                $masked[$key] = self::REDACTED;
                continue;
            }

            if (is_array($value)) {
                $masked[$key] = self::mask($value);
                continue;
            }

            $masked[$key] = $value;
        }

        return $masked;
    }

    /**
     * HTTP リクエストボディをマスクして返す
     */
    public static function maskRequest(Request $request): array
    {
        return self::mask($request->all());
    }

    /**
     * validated 配列から password 等を除外してログ用に返す
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function maskValidated(array $validated): array
    {
        return self::mask($validated);
    }

    private static function shouldRedact(string $key): bool
    {
        if (in_array($key, self::SENSITIVE_KEYS, true) || in_array($key, self::PII_KEYS, true)) {
            return true;
        }

        foreach (self::SENSITIVE_KEYS as $sensitive) {
            if (str_contains($key, $sensitive)) {
                return true;
            }
        }

        return false;
    }
}
