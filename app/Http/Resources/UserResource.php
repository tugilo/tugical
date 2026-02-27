<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource
 * 
 * tugical ユーザー情報APIリソース
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md Section 1 (認証API)
 * - ユーザー情報の統一レスポンス形式
 * - 機密情報の除外・適切なデータ変換
 * 
 * 出力フィールド:
 * - 基本情報: id, email, role, name
 * - アカウント状態: is_active, email_verified_at
 * - アクティビティ: last_login_at, created_at
 * - 除外: password, remember_token等の機密情報
 * 
 * @package App\Http\Resources
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class UserResource extends JsonResource
{
    /**
     * ユーザーリソースの変換
     * 
     * tugical_api_specification_v1.0.md Section 1.1-1.3 準拠
     * 
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            // 基本情報
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'role' => $this->role,

            // アカウント状態
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toISOString(),

            // 店舗関連（基本情報のみ）
            'store_id' => $this->store_id,

            // アクティビティ情報
            'last_login_at' => $this->last_login_at?->toISOString(),
            'last_login_ip' => $this->last_login_ip,
            'last_activity_at' => $this->last_activity_at?->toISOString(),

            // プロフィール情報（オプション）
            'profile' => $this->when($this->profile, [
                'display_name' => $this->profile['display_name'] ?? null,
                'phone' => $this->profile['phone'] ?? null,
                'avatar_url' => $this->profile['avatar_url'] ?? null,
                'timezone' => $this->profile['timezone'] ?? 'Asia/Tokyo',
                'language' => $this->profile['language'] ?? 'ja',
            ]),

            // 設定情報（オプション）
            'preferences' => $this->when($this->preferences, [
                'notifications' => $this->preferences['notifications'] ?? true,
                'email_notifications' => $this->preferences['email_notifications'] ?? true,
                'dashboard_layout' => $this->preferences['dashboard_layout'] ?? 'default',
                'date_format' => $this->preferences['date_format'] ?? 'Y-m-d',
                'time_format' => $this->preferences['time_format'] ?? 'H:i',
            ]),

            // アカウント作成・更新時間
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),

            // 追加の権限情報（詳細表示時）
            'role_display_name' => $this->getRoleDisplayName(),
            'permissions_summary' => $this->getPermissionsSummary(),

            // セキュリティ情報（管理者のみ）
            'security_info' => $this->when(
                $request->user()?->role === 'owner',
                [
                    'login_attempts_today' => $this->getLoginAttemptsToday(),
                    'password_updated_at' => $this->password_updated_at?->toISOString(),
                    'two_factor_enabled' => $this->two_factor_enabled ?? false,
                ]
            ),
        ];
    }

    /**
     * 役割表示名を取得
     * 
     * 日本語での役割名表示
     * 
     * @return string 役割表示名
     */
    private function getRoleDisplayName(): string
    {
        $roleNames = [
            'owner' => 'オーナー',
            'manager' => 'マネージャー',
            'staff' => 'スタッフ',
            'reception' => '受付',
        ];

        return $roleNames[$this->role] ?? '不明';
    }

    /**
     * 権限サマリーを取得
     * 
     * 主要権限の概要情報
     * 
     * @return array 権限サマリー
     */
    private function getPermissionsSummary(): array
    {
        $permissionLevels = [
            'owner' => [
                'level' => 'full',
                'description' => '全機能アクセス可能',
                'can_manage_users' => true,
                'can_manage_settings' => true,
                'can_view_analytics' => true,
            ],
            'manager' => [
                'level' => 'management',
                'description' => '管理機能アクセス可能',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_view_analytics' => true,
            ],
            'staff' => [
                'level' => 'operation',
                'description' => '運用機能アクセス可能',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_view_analytics' => false,
            ],
            'reception' => [
                'level' => 'front',
                'description' => '受付機能アクセス可能',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_view_analytics' => false,
            ],
        ];

        return $permissionLevels[$this->role] ?? $permissionLevels['staff'];
    }

    /**
     * 本日のログイン試行回数を取得
     * 
     * セキュリティ監視用
     * 
     * @return int ログイン試行回数
     */
    private function getLoginAttemptsToday(): int
    {
        // 実装例（ログテーブルがある場合）
        // return LoginAttempt::where('user_id', $this->id)
        //     ->whereDate('created_at', today())
        //     ->count();

        // 暫定実装（ログファイルベース）
        return 0; // TODO: ログイン試行履歴テーブル実装後に修正
    }

    /**
     * 追加メタデータ
     * 
     * レスポンスに含める追加情報
     * 
     * @param Request $request
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'resource_type' => 'user',
                'version' => '1.0',
                'generated_at' => now()->toISOString(),
            ],
        ];
    }
}
