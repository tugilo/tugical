<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * HoldTokenService
 * 
 * tugical Hold Token（仮押さえ）管理サービス
 * 
 * 主要機能:
 * - 10分間の排他制御システム
 * - 暗号学的に安全なトークン生成
 * - Redis TTL活用による自動期限管理
 * - 同時予約競合の完全回避
 * - トークン延長・早期解放機能
 * - 期限切れトークン自動クリーンアップ
 * 
 * Hold Token仕様:
 * - 有効期間: 10分（600秒）
 * - 形式: 32文字ランダム文字列
 * - 保存先: Redis（TTL付き）
 * - キー形式: tugical:hold:{store_id}:{token}
 * 
 * @package App\Services
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class HoldTokenService
{
    /**
     * Hold Token有効期間（秒）
     * 10分間の仮押さえ
     */
    protected const HOLD_DURATION = 600;

    /**
     * Redisキープレフィックス
     */
    protected const REDIS_PREFIX = 'tugical:hold';

    /**
     * トークン長（文字数）
     */
    protected const TOKEN_LENGTH = 32;

    /**
     * Hold Token作成
     * 
     * 指定時間枠の仮押さえトークンを生成
     * Redis TTLにより自動期限管理
     * 
     * @param int $storeId 店舗ID（マルチテナント分離）
     * @param array $slotData 仮押さえ時間枠データ
     * [
     *   'resource_id' => int,
     *   'booking_date' => string (Y-m-d),
     *   'start_time' => string (H:i),
     *   'end_time' => string (H:i),
     *   'menu_id' => int,
     *   'customer_id' => int
     * ]
     * @return string 生成されたHold Token
     * @throws \Exception 既に仮押さえ済み時・Redis接続エラー時
     */
    public function createHoldToken(int $storeId, array $slotData): string
    {
        try {
            Log::info('Hold Token作成開始', [
                'store_id' => $storeId,
                'resource_id' => $slotData['resource_id'] ?? null,
                'booking_date' => $slotData['booking_date'] ?? null,
                'start_time' => $slotData['start_time'] ?? null,
                'end_time' => $slotData['end_time'] ?? null,
            ]);

            // 1. 既存Hold Token重複チェック
            if ($this->hasTimeConflict($storeId, $slotData)) {
                throw new \Exception('指定時間は既に仮押さえされています');
            }

            // 2. 暗号学的に安全なトークン生成
            $token = $this->generateSecureToken();
            
            // 3. 仮押さえデータ準備
            $holdData = [
                'store_id' => $storeId,
                'resource_id' => $slotData['resource_id'],
                'booking_date' => $slotData['booking_date'],
                'start_time' => $slotData['start_time'],
                'end_time' => $slotData['end_time'],
                'menu_id' => $slotData['menu_id'],
                'customer_id' => $slotData['customer_id'] ?? null,
                'created_at' => Carbon::now()->toISOString(),
                'expires_at' => Carbon::now()->addSeconds(self::HOLD_DURATION)->toISOString(),
            ];

            // 4. Redis保存（TTL付き）
            $redisKey = $this->getRedisKey($storeId, $token);
            $success = Redis::setex($redisKey, self::HOLD_DURATION, json_encode($holdData));

            if (!$success) {
                throw new \Exception('Hold Token保存に失敗しました');
            }

            // 5. 作成ログ記録
            $this->logHoldTokenCreated($storeId, $token, $slotData);

            Log::info('Hold Token作成完了', [
                'store_id' => $storeId,
                'token' => substr($token, 0, 8) . '...',
                'redis_key' => $redisKey,
                'ttl' => self::HOLD_DURATION,
            ]);

            return $token;

        } catch (\Exception $e) {
            Log::error('Hold Token作成エラー', [
                'store_id' => $storeId,
                'slot_data' => $slotData,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Hold Token検証
     * 
     * トークンの有効性・期限・データ整合性をチェック
     * 
     * @param string $token 検証対象Hold Token
     * @return bool 有効な場合true
     * @throws \Exception Token期限切れ時・Token無効時
     */
    public function validateHoldToken(string $token): bool
    {
        try {
            Log::info('Hold Token検証開始', [
                'token' => substr($token, 0, 8) . '...',
            ]);

            // 1. Token形式チェック
            if (strlen($token) !== self::TOKEN_LENGTH) {
                Log::warning('Hold Token形式無効', [
                    'token' => substr($token, 0, 8) . '...',
                    'length' => strlen($token),
                    'expected_length' => self::TOKEN_LENGTH,
                ]);
                return false;
            }

            // 2. Redisキー検索（全店舗対象）
            $pattern = self::REDIS_PREFIX . ':*:' . $token;
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                Log::warning('Hold Token不存在または期限切れ', [
                    'token' => substr($token, 0, 8) . '...',
                    'pattern' => $pattern,
                ]);
                return false;
            }

            // 3. データ取得・整合性チェック
            $redisKey = $keys[0]; // 最初のマッチキー
            $holdDataJson = Redis::get($redisKey);

            if (!$holdDataJson) {
                Log::warning('Hold Tokenデータ取得失敗', [
                    'token' => substr($token, 0, 8) . '...',
                    'redis_key' => $redisKey,
                ]);
                return false;
            }

            $holdData = json_decode($holdDataJson, true);
            if (!$holdData || !isset($holdData['expires_at'])) {
                Log::warning('Hold Tokenデータ形式無効', [
                    'token' => substr($token, 0, 8) . '...',
                    'data' => $holdDataJson,
                ]);
                return false;
            }

            // 4. 期限チェック（追加安全性確認）
            $expiresAt = Carbon::parse($holdData['expires_at']);
            if ($expiresAt->isPast()) {
                Log::info('Hold Token期限切れ検出・削除', [
                    'token' => substr($token, 0, 8) . '...',
                    'expires_at' => $holdData['expires_at'],
                    'now' => Carbon::now()->toISOString(),
                ]);
                
                Redis::del($redisKey);
                return false;
            }

            Log::info('Hold Token検証成功', [
                'token' => substr($token, 0, 8) . '...',
                'store_id' => $holdData['store_id'],
                'remaining_seconds' => $expiresAt->diffInSeconds(Carbon::now()),
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Hold Token検証エラー', [
                'token' => substr($token, 0, 8) . '...',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Hold Token延長
     * 
     * 既存トークンの有効期限を延長
     * 予約フォーム入力時間延長等で使用
     * 
     * @param string $token 延長対象Hold Token
     * @param int $minutes 延長時間（分）デフォルト10分
     * @return bool 延長成功可否
     * @throws \Exception Token期限切れ時
     */
    public function extendHoldToken(string $token, int $minutes = 10): bool
    {
        try {
            Log::info('Hold Token延長開始', [
                'token' => substr($token, 0, 8) . '...',
                'extend_minutes' => $minutes,
            ]);

            // 1. Token存在確認
            if (!$this->validateHoldToken($token)) {
                throw new \Exception('延長対象のHold Tokenが見つからないか期限切れです');
            }

            // 2. Redisキー検索
            $pattern = self::REDIS_PREFIX . ':*:' . $token;
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                throw new \Exception('Hold Token延長失敗：キーが見つかりません');
            }

            $redisKey = $keys[0];
            $holdDataJson = Redis::get($redisKey);
            $holdData = json_decode($holdDataJson, true);

            // 3. 延長期限計算・データ更新
            $newExpiresAt = Carbon::now()->addMinutes($minutes);
            $holdData['expires_at'] = $newExpiresAt->toISOString();
            $holdData['extended_at'] = Carbon::now()->toISOString();
            $holdData['extension_minutes'] = $minutes;

            // 4. TTL更新
            $extendSeconds = $minutes * 60;
            $success = Redis::setex($redisKey, $extendSeconds, json_encode($holdData));

            if (!$success) {
                throw new \Exception('Hold Token延長保存失敗');
            }

            Log::info('Hold Token延長完了', [
                'token' => substr($token, 0, 8) . '...',
                'new_expires_at' => $newExpiresAt->toISOString(),
                'extension_minutes' => $minutes,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Hold Token延長エラー', [
                'token' => substr($token, 0, 8) . '...',
                'minutes' => $minutes,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Hold Token解放
     * 
     * 予約完了・キャンセル時のトークン早期解放
     * 
     * @param string $token 解放対象Hold Token
     * @return bool 解放成功可否
     */
    public function releaseHoldToken(string $token): bool
    {
        try {
            Log::info('Hold Token解放開始', [
                'token' => substr($token, 0, 8) . '...',
            ]);

            // 1. Redisキー検索
            $pattern = self::REDIS_PREFIX . ':*:' . $token;
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                Log::warning('解放対象Hold Token未発見', [
                    'token' => substr($token, 0, 8) . '...',
                    'pattern' => $pattern,
                ]);
                return false; // 既に期限切れまたは削除済み
            }

            // 2. データ取得（ログ用）
            $redisKey = $keys[0];
            $holdDataJson = Redis::get($redisKey);
            $holdData = $holdDataJson ? json_decode($holdDataJson, true) : null;

            // 3. Redis削除
            $deletedCount = Redis::del($redisKey);

            if ($deletedCount > 0) {
                Log::info('Hold Token解放完了', [
                    'token' => substr($token, 0, 8) . '...',
                    'redis_key' => $redisKey,
                    'store_id' => $holdData['store_id'] ?? 'unknown',
                    'resource_id' => $holdData['resource_id'] ?? 'unknown',
                    'booking_date' => $holdData['booking_date'] ?? 'unknown',
                ]);
                return true;
            } else {
                Log::warning('Hold Token削除失敗', [
                    'token' => substr($token, 0, 8) . '...',
                    'redis_key' => $redisKey,
                ]);
                return false;
            }

        } catch (\Exception $e) {
            Log::error('Hold Token解放エラー', [
                'token' => substr($token, 0, 8) . '...',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Hold Token情報取得
     * 
     * トークンに紐づく仮押さえ情報を取得
     * 
     * @param string $token Hold Token
     * @return array|null 仮押さえ情報（期限切れの場合null）
     * [
     *   'store_id' => int,
     *   'resource_id' => int,
     *   'booking_date' => string,
     *   'start_time' => string,
     *   'end_time' => string,
     *   'menu_id' => int,
     *   'customer_id' => int,
     *   'created_at' => string,
     *   'expires_at' => string,
     *   'remaining_seconds' => int
     * ]
     */
    public function getHoldTokenData(string $token): ?array
    {
        try {
            // 1. Token検証
            if (!$this->validateHoldToken($token)) {
                return null;
            }

            // 2. Redisデータ取得
            $pattern = self::REDIS_PREFIX . ':*:' . $token;
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                return null;
            }

            $redisKey = $keys[0];
            $holdDataJson = Redis::get($redisKey);

            if (!$holdDataJson) {
                return null;
            }

            $holdData = json_decode($holdDataJson, true);
            if (!$holdData) {
                return null;
            }

            // 3. 残り時間計算
            $expiresAt = Carbon::parse($holdData['expires_at']);
            $holdData['remaining_seconds'] = max(0, $expiresAt->diffInSeconds(Carbon::now()));

            return $holdData;

        } catch (\Exception $e) {
            Log::error('Hold Tokenデータ取得エラー', [
                'token' => substr($token, 0, 8) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 期限切れToken自動削除
     * 
     * スケジューラーで定期実行
     * 期限切れトークンのクリーンアップ
     * 
     * @return int 削除されたToken数
     */
    public function cleanupExpiredTokens(): int
    {
        try {
            Log::info('期限切れHold Token自動削除開始');

            $deletedCount = 0;
            
            // 1. 全Hold Token検索
            $pattern = self::REDIS_PREFIX . ':*:*';
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                Log::info('削除対象Hold Token無し');
                return 0;
            }

            // 2. 各Tokenの期限チェック・削除
            foreach ($keys as $redisKey) {
                try {
                    $holdDataJson = Redis::get($redisKey);
                    
                    if (!$holdDataJson) {
                        // 既に削除済み
                        continue;
                    }

                    $holdData = json_decode($holdDataJson, true);
                    
                    if (!$holdData || !isset($holdData['expires_at'])) {
                        // 無効なデータは削除
                        Redis::del($redisKey);
                        $deletedCount++;
                        continue;
                    }

                    $expiresAt = Carbon::parse($holdData['expires_at']);
                    
                    if ($expiresAt->isPast()) {
                        // 期限切れは削除
                        Redis::del($redisKey);
                        $deletedCount++;
                        
                        Log::info('期限切れHold Token削除', [
                            'redis_key' => $redisKey,
                            'store_id' => $holdData['store_id'] ?? 'unknown',
                            'expires_at' => $holdData['expires_at'],
                        ]);
                    }

                } catch (\Exception $e) {
                    Log::warning('Hold Token削除処理エラー', [
                        'redis_key' => $redisKey,
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }

            Log::info('期限切れHold Token自動削除完了', [
                'total_checked' => count($keys),
                'deleted_count' => $deletedCount,
            ]);

            return $deletedCount;

        } catch (\Exception $e) {
            Log::error('期限切れHold Token自動削除エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return 0;
        }
    }

    /**
     * 店舗別Hold Token一覧取得
     * 
     * 管理画面での仮押さえ状況確認用
     * 
     * @param int $storeId 店舗ID
     * @return array Hold Token一覧
     */
    public function getStoreHoldTokens(int $storeId): array
    {
        try {
            Log::info('店舗別Hold Token一覧取得', [
                'store_id' => $storeId,
            ]);

            $storeTokens = [];

            // 1. 店舗別Token検索
            $pattern = self::REDIS_PREFIX . ':' . $storeId . ':*';
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                Log::info('店舗Hold Token無し', [
                    'store_id' => $storeId,
                ]);
                return [];
            }

            // 2. 各Tokenデータ取得
            foreach ($keys as $redisKey) {
                try {
                    $holdDataJson = Redis::get($redisKey);
                    
                    if (!$holdDataJson) {
                        continue;
                    }

                    $holdData = json_decode($holdDataJson, true);
                    
                    if (!$holdData) {
                        continue;
                    }

                    // トークン抽出（redisKeyから）
                    $keyParts = explode(':', $redisKey);
                    $token = end($keyParts);

                    // 残り時間計算
                    $expiresAt = Carbon::parse($holdData['expires_at']);
                    $holdData['token'] = substr($token, 0, 8) . '...'; // 一部のみ表示
                    $holdData['remaining_seconds'] = max(0, $expiresAt->diffInSeconds(Carbon::now()));

                    $storeTokens[] = $holdData;

                } catch (\Exception $e) {
                    Log::warning('店舗Hold Tokenデータ取得エラー', [
                        'store_id' => $storeId,
                        'redis_key' => $redisKey,
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }

            Log::info('店舗別Hold Token一覧取得完了', [
                'store_id' => $storeId,
                'token_count' => count($storeTokens),
            ]);

            return $storeTokens;

        } catch (\Exception $e) {
            Log::error('店舗別Hold Token一覧取得エラー', [
                'store_id' => $storeId,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Hold Token統計情報取得
     * 
     * @param int $storeId 店舗ID
     * @param string|null $date 対象日（null=今日）
     * @return array 統計情報
     * [
     *   'total_created' => int,
     *   'total_converted' => int, (予約完了)
     *   'total_expired' => int,
     *   'conversion_rate' => float,
     *   'average_hold_time' => int (秒)
     * ]
     */
    public function getHoldTokenStats(int $storeId, ?string $date = null): array
    {
        try {
            $targetDate = $date ? Carbon::parse($date) : Carbon::today();

            Log::info('Hold Token統計情報取得', [
                'store_id' => $storeId,
                'target_date' => $targetDate->toDateString(),
            ]);

            // 注意: 実際の統計は別途実装が必要（ログ解析・DB記録）
            // ここでは現在のアクティブToken情報のみ返却
            $activeTokens = $this->getStoreHoldTokens($storeId);

            $stats = [
                'store_id' => $storeId,
                'target_date' => $targetDate->toDateString(),
                'active_tokens_count' => count($activeTokens),
                'total_created' => 0, // 要実装: ログ解析またはDB記録
                'total_converted' => 0, // 要実装: 予約完了数
                'total_expired' => 0, // 要実装: 期限切れ数
                'conversion_rate' => 0.0, // 要実装: 変換率計算
                'average_hold_time' => 0, // 要実装: 平均保持時間
                'note' => '統計機能は今後実装予定',
            ];

            Log::info('Hold Token統計情報取得完了', [
                'store_id' => $storeId,
                'stats' => $stats,
            ]);

            return $stats;

        } catch (\Exception $e) {
            Log::error('Hold Token統計情報取得エラー', [
                'store_id' => $storeId,
                'date' => $date,
                'error' => $e->getMessage(),
            ]);

            return [
                'store_id' => $storeId,
                'target_date' => $date ?? Carbon::today()->toDateString(),
                'error' => '統計情報取得エラー',
                'active_tokens_count' => 0,
                'total_created' => 0,
                'total_converted' => 0,
                'total_expired' => 0,
                'conversion_rate' => 0.0,
                'average_hold_time' => 0,
            ];
        }
    }

    /**
     * 暗号学的に安全なトークン生成
     * 
     * @return string 32文字ランダム文字列
     */
    protected function generateSecureToken(): string
    {
        return Str::random(self::TOKEN_LENGTH);
    }

    /**
     * Redisキー生成
     * 
     * @param int $storeId 店舗ID
     * @param string $token Hold Token
     * @return string Redisキー
     */
    protected function getRedisKey(int $storeId, string $token): string
    {
        return sprintf('%s:%d:%s', self::REDIS_PREFIX, $storeId, $token);
    }

    /**
     * 時間競合チェック
     * 
     * 既存Hold Tokenとの時間重複をチェック
     * 
     * @param int $storeId 店舗ID
     * @param array $slotData 仮押さえ時間枠データ
     * @return bool 競合がある場合true
     */
    protected function hasTimeConflict(int $storeId, array $slotData): bool
    {
        try {
            // 店舗の全Hold Token検索
            $pattern = self::REDIS_PREFIX . ':' . $storeId . ':*';
            $keys = Redis::keys($pattern);

            if (empty($keys)) {
                return false; // 競合なし
            }

            $targetStart = Carbon::parse($slotData['booking_date'] . ' ' . $slotData['start_time']);
            $targetEnd = Carbon::parse($slotData['booking_date'] . ' ' . $slotData['end_time']);

            foreach ($keys as $redisKey) {
                $holdDataJson = Redis::get($redisKey);
                
                if (!$holdDataJson) {
                    continue;
                }

                $holdData = json_decode($holdDataJson, true);
                
                if (!$holdData || 
                    $holdData['resource_id'] != $slotData['resource_id'] ||
                    $holdData['booking_date'] != $slotData['booking_date']) {
                    continue;
                }

                $existingStart = Carbon::parse($holdData['booking_date'] . ' ' . $holdData['start_time']);
                $existingEnd = Carbon::parse($holdData['booking_date'] . ' ' . $holdData['end_time']);

                // 時間重複チェック
                if ($targetStart->lt($existingEnd) && $targetEnd->gt($existingStart)) {
                    Log::warning('Hold Token時間競合検出', [
                        'store_id' => $storeId,
                        'resource_id' => $slotData['resource_id'],
                        'target_slot' => $slotData['start_time'] . '-' . $slotData['end_time'],
                        'existing_slot' => $holdData['start_time'] . '-' . $holdData['end_time'],
                    ]);
                    return true;
                }
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Hold Token時間競合チェックエラー', [
                'store_id' => $storeId,
                'slot_data' => $slotData,
                'error' => $e->getMessage(),
            ]);
            return true; // エラー時は安全側に倒して競合ありとする
        }
    }

    /**
     * Hold Token作成ログ記録
     * 
     * @param int $storeId 店舗ID
     * @param string $token Hold Token
     * @param array $slotData 時間枠データ
     * @return void
     */
    protected function logHoldTokenCreated(int $storeId, string $token, array $slotData): void
    {
        Log::info('Hold Token作成ログ', [
            'action' => 'hold_token_created',
            'store_id' => $storeId,
            'token_preview' => substr($token, 0, 8) . '...',
            'resource_id' => $slotData['resource_id'],
            'booking_date' => $slotData['booking_date'],
            'start_time' => $slotData['start_time'],
            'end_time' => $slotData['end_time'],
            'menu_id' => $slotData['menu_id'],
            'customer_id' => $slotData['customer_id'] ?? null,
            'created_at' => Carbon::now()->toISOString(),
            'expires_at' => Carbon::now()->addSeconds(self::HOLD_DURATION)->toISOString(),
            'duration_seconds' => self::HOLD_DURATION,
        ]);
    }
} 