<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * User Model
 * 
 * tugical管理者ユーザーモデル
 * 
 * 機能:
 * - Laravel Sanctum認証対応
 * - マルチテナント（store_id分離）
 * - 役割ベースアクセス制御（RBAC）
 * - アクティビティ追跡
 * - プロフィール・設定管理
 * 
 * リレーション:
 * - Store（所属店舗）
 * 
 * @package App\Models
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    // fillableは削除済み - guardedを使用

    /**
     * シリアル化時に隠す属性
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    /**
     * 属性のキャスト
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'last_login_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'password_updated_at' => 'datetime',
        'is_active' => 'boolean',
        'two_factor_enabled' => 'boolean',
        'profile' => 'array',
        'preferences' => 'array',
    ];

    /**
     * 所属店舗リレーション
     * 
     * @return BelongsTo<Store, User>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    // 一時的なテスト用ダミー店舗情報取得
    public function getStoreAttribute()
    {
        return (object) [
            'id' => $this->store_id,
            'name' => 'テスト店舗',
            'plan_type' => 'standard',
            'is_active' => true,
        ];
    }

    /**
     * 役割チェック
     * 
     * @param string $role 確認する役割
     * @return bool 指定役割かどうか
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * 権限チェック
     * 
     * @param string $permission 確認する権限
     * @return bool 権限があるかどうか
     */
    public function hasPermission(string $permission): bool
    {
        $permissions = [
            'owner' => [
                'booking.manage',
                'booking.create',
                'booking.update',
                'booking.delete',
                'customer.manage',
                'customer.create',
                'customer.update',
                'customer.delete',
                'staff.manage',
                'staff.create',
                'staff.update',
                'staff.delete',
                'menu.manage',
                'menu.create',
                'menu.update',
                'menu.delete',
                'notification.manage',
                'notification.send',
                'settings.manage',
                'analytics.view',
                'export.data',
                'store.settings',
                'user.manage'
            ],
            'manager' => [
                'booking.manage',
                'booking.create',
                'booking.update',
                'customer.manage',
                'customer.create',
                'customer.update',
                'staff.view',
                'menu.view',
                'notification.send',
                'analytics.view'
            ],
            'staff' => [
                'booking.view',
                'booking.update',
                'customer.view',
                'customer.update',
                'notification.view'
            ],
            'reception' => [
                'booking.manage',
                'booking.create',
                'booking.update',
                'customer.view',
                'customer.create',
                'customer.update'
            ]
        ];

        $userPermissions = $permissions[$this->role] ?? [];
        return in_array($permission, $userPermissions);
    }

    /**
     * アクティブアカウントかチェック
     * 
     * @return bool アクティブかどうか
     */
    public function isActive(): bool
    {
        return $this->is_active === true;
    }

    /**
     * オーナーかチェック
     * 
     * @return bool オーナーかどうか
     */
    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /**
     * マネージャー以上かチェック
     * 
     * @return bool マネージャー以上かどうか
     */
    public function isManagerOrAbove(): bool
    {
        return in_array($this->role, ['owner', 'manager']);
    }

    /**
     * プロフィール情報取得
     * 
     * @param string $key プロフィールキー
     * @param mixed $default デフォルト値
     * @return mixed プロフィール値
     */
    public function getProfile(string $key, $default = null)
    {
        return $this->profile[$key] ?? $default;
    }

    /**
     * プロフィール情報設定
     * 
     * @param string $key プロフィールキー
     * @param mixed $value 設定値
     * @return void
     */
    public function setProfile(string $key, $value): void
    {
        $profile = $this->profile ?? [];
        $profile[$key] = $value;
        $this->profile = $profile;
    }

    /**
     * 設定情報取得
     * 
     * @param string $key 設定キー
     * @param mixed $default デフォルト値
     * @return mixed 設定値
     */
    public function getPreference(string $key, $default = null)
    {
        return $this->preferences[$key] ?? $default;
    }

    /**
     * 設定情報設定
     * 
     * @param string $key 設定キー
     * @param mixed $value 設定値
     * @return void
     */
    public function setPreference(string $key, $value): void
    {
        $preferences = $this->preferences ?? [];
        $preferences[$key] = $value;
        $this->preferences = $preferences;
    }

    /**
     * 最終ログイン時間更新
     * 
     * @param string|null $ipAddress IPアドレス
     * @return void
     */
    public function updateLastLogin(?string $ipAddress = null): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => $ipAddress,
        ]);
    }

    /**
     * 最終アクティビティ時間更新
     * 
     * @return void
     */
    public function updateLastActivity(): void
    {
        // 頻繁な更新を避けるため、5分間隔でのみ更新
        if (!$this->last_activity_at || $this->last_activity_at->diffInMinutes(now()) >= 5) {
            $this->update(['last_activity_at' => now()]);
        }
    }

    /**
     * Sanctum Token名生成
     * 
     * @return string トークン名
     */
    public function getTokenName(): string
    {
        return "tugical-{$this->role}-{$this->id}";
    }
}
