<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * スタッフアカウントモデル - スタッフ認証・権限管理
 * 
 * tugicalサービスの店舗スタッフを管理するモデル
 * Laravel認証システムと統合し、権限制御・二要素認証を実現
 * 
 * 主要機能:
 * - Laravel認証システム統合（Authenticatable実装）
 * - ロールベース権限管理（owner/manager/staff/viewer）
 * - 二要素認証対応（TOTP、SMS、Email）
 * - ログイン履歴・セキュリティ管理
 * - API トークン管理（Laravel Sanctum）
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - bookings: 作成予約（1対多、創作者として）
 * - notifications: 送信通知（1対多、送信者として）
 * 
 * @property int $id スタッフID
 * @property int $store_id 店舗ID
 * @property string $name スタッフ名
 * @property string $email メールアドレス
 * @property Carbon|null $email_verified_at メール認証日時
 * @property string $password パスワード（ハッシュ化）
 * @property string $role 権限ロール（owner/manager/staff/viewer）
 * @property array $permissions 権限設定（JSON: 機能別アクセス権）
 * @property array $two_factor_auth 二要素認証設定（JSON: 有効状態、設定情報）
 * @property string|null $phone 電話番号
 * @property array|null $profile_settings プロフィール設定（JSON: 表示設定、通知設定）
 * @property Carbon|null $last_login_at 最終ログイン日時
 * @property string|null $last_login_ip 最終ログインIP
 * @property array|null $login_history ログイン履歴（JSON: 最近のログイン記録）
 * @property bool $is_active アクティブ状態
 * @property string|null $remember_token 自動ログイントークン
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $createdBookings 作成した予約一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Notification> $sentNotifications 送信した通知一覧
 */
class StaffAccount extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'staff_accounts';

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    /**
     * 非表示属性（API出力時に除外）
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_auth',
        'login_history',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'permissions' => 'array',
        'two_factor_auth' => 'array',
        'profile_settings' => 'array',
        'login_history' => 'array',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * 権限ロールの定数
     */
    public const ROLE_OWNER = 'owner';
    public const ROLE_MANAGER = 'manager';
    public const ROLE_STAFF = 'staff';
    public const ROLE_VIEWER = 'viewer';

    /**
     * 利用可能権限ロール一覧
     */
    public static function getAvailableRoles(): array
    {
        return [
            self::ROLE_OWNER => [
                'name' => 'オーナー',
                'description' => '全権限（店舗設定、スタッフ管理、課金情報）',
                'level' => 100,
                'permissions' => ['all'],
            ],
            self::ROLE_MANAGER => [
                'name' => 'マネージャー',
                'description' => '管理権限（予約管理、顧客管理、レポート閲覧）',
                'level' => 80,
                'permissions' => [
                    'bookings_all',
                    'customers_all',
                    'resources_all',
                    'menus_all',
                    'reports_view',
                    'notifications_send',
                    'calendar_manage'
                ],
            ],
            self::ROLE_STAFF => [
                'name' => 'スタッフ',
                'description' => '基本権限（自分の予約管理、顧客対応）',
                'level' => 50,
                'permissions' => [
                    'bookings_own',
                    'customers_view',
                    'customers_edit',
                    'resources_view',
                    'menus_view',
                    'notifications_view'
                ],
            ],
            self::ROLE_VIEWER => [
                'name' => '閲覧者',
                'description' => '閲覧権限のみ（予約状況確認、レポート閲覧）',
                'level' => 20,
                'permissions' => [
                    'bookings_view',
                    'customers_view',
                    'resources_view',
                    'menus_view',
                    'reports_view'
                ],
            ],
        ];
    }

    /**
     * 権限アクション一覧
     */
    public static function getPermissionActions(): array
    {
        return [
            'bookings' => [
                'bookings_view' => '予約閲覧',
                'bookings_own' => '自分の予約管理',
                'bookings_all' => '全予約管理',
                'bookings_approve' => '予約承認',
                'bookings_cancel' => '予約キャンセル',
            ],
            'customers' => [
                'customers_view' => '顧客情報閲覧',
                'customers_edit' => '顧客情報編集',
                'customers_all' => '顧客管理',
                'customers_export' => '顧客データエクスポート',
            ],
            'resources' => [
                'resources_view' => 'リソース閲覧',
                'resources_edit' => 'リソース編集',
                'resources_all' => 'リソース管理',
            ],
            'menus' => [
                'menus_view' => 'メニュー閲覧',
                'menus_edit' => 'メニュー編集',
                'menus_all' => 'メニュー管理',
            ],
            'notifications' => [
                'notifications_view' => '通知閲覧',
                'notifications_send' => '通知送信',
                'notifications_all' => '通知管理',
            ],
            'reports' => [
                'reports_view' => 'レポート閲覧',
                'reports_export' => 'レポートエクスポート',
            ],
            'calendar' => [
                'calendar_view' => 'カレンダー閲覧',
                'calendar_manage' => 'カレンダー管理',
            ],
            'settings' => [
                'settings_store' => '店舗設定',
                'settings_staff' => 'スタッフ管理',
                'settings_billing' => '課金情報',
            ],
        ];
    }

    /**
     * モデルの起動時処理
     * 
     * TenantScopeを適用してMulti-tenant分離を実現
     */
    protected static function booted()
    {
        static::addGlobalScope(new TenantScope);

        // 作成時に自動でstore_id設定
        static::creating(function ($staffAccount) {
            if (!$staffAccount->store_id && auth()->check()) {
                $staffAccount->store_id = auth()->user()->store_id;
            }

            // デフォルト権限設定
            if (!$staffAccount->permissions && $staffAccount->role) {
                $staffAccount->permissions = self::getDefaultPermissions($staffAccount->role);
            }

            // デフォルト設定
            $staffAccount->is_active = $staffAccount->is_active ?? true;
            $staffAccount->two_factor_auth = $staffAccount->two_factor_auth ?? [
                'enabled' => false,
                'method' => null,
                'verified' => false,
            ];
        });

        // ログイン情報更新時の処理
        static::updating(function ($staffAccount) {
            // ログイン履歴の管理（最新10件まで保持）
            if ($staffAccount->isDirty('last_login_at')) {
                $loginHistory = $staffAccount->login_history ?? [];
                array_unshift($loginHistory, [
                    'login_at' => $staffAccount->last_login_at,
                    'ip_address' => $staffAccount->last_login_ip,
                    'user_agent' => request()->userAgent(),
                ]);

                // 最新10件まで保持
                $staffAccount->login_history = array_slice($loginHistory, 0, 10);
            }
        });
    }

    /**
     * 所属店舗との関係性
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * 作成した予約との関係性
     */
    public function createdBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'created_by');
    }

    /**
     * 送信した通知との関係性
     */
    public function sentNotifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'sent_by');
    }

    /**
     * 権限チェック
     * 
     * @param string $permission 権限名
     * @return bool 権限がある場合true
     */
    public function hasPermission(string $permission): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $userPermissions = $this->permissions['granted'] ?? [];

        // 全権限チェック
        if (in_array('all', $userPermissions)) {
            return true;
        }

        // 具体的権限チェック
        return in_array($permission, $userPermissions);
    }

    /**
     * 複数権限チェック（AND条件）
     * 
     * @param array $permissions 権限名の配列
     * @return bool 全ての権限がある場合true
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 複数権限チェック（OR条件）
     * 
     * @param array $permissions 権限名の配列
     * @return bool いずれかの権限がある場合true
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * ロール権限レベルチェック
     * 
     * @param string $requiredRole 必要なロール
     * @return bool 権限レベルが十分な場合true
     */
    public function hasRoleLevel(string $requiredRole): bool
    {
        $roles = self::getAvailableRoles();
        $userLevel = $roles[$this->role]['level'] ?? 0;
        $requiredLevel = $roles[$requiredRole]['level'] ?? 100;

        return $userLevel >= $requiredLevel;
    }

    /**
     * 二要素認証有効チェック
     * 
     * @return bool 二要素認証が有効な場合true
     */
    public function hasTwoFactorAuth(): bool
    {
        $twoFactorSettings = $this->two_factor_auth ?? [];
        return ($twoFactorSettings['enabled'] ?? false) &&
            ($twoFactorSettings['verified'] ?? false);
    }

    /**
     * オーナー権限チェック
     * 
     * @return bool オーナー権限がある場合true
     */
    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER && $this->is_active;
    }

    /**
     * マネージャー以上権限チェック
     * 
     * @return bool マネージャー以上の権限がある場合true
     */
    public function isManagerOrAbove(): bool
    {
        return $this->hasRoleLevel(self::ROLE_MANAGER) && $this->is_active;
    }

    /**
     * ログイン情報更新
     * 
     * @param string|null $ipAddress IPアドレス
     * @return void
     */
    public function updateLoginInfo(?string $ipAddress = null): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => $ipAddress ?? request()->ip(),
        ]);
    }

    /**
     * 権限情報取得
     * 
     * @return array 権限詳細情報
     */
    public function getRoleInfo(): array
    {
        $roles = self::getAvailableRoles();
        return $roles[$this->role] ?? [];
    }

    /**
     * API認証用のトークン名取得
     * 
     * @return string トークン名
     */
    public function getTokenName(): string
    {
        return "staff_{$this->id}_{$this->store_id}";
    }

    /**
     * デフォルト権限取得
     * 
     * @param string $role ロール名
     * @return array デフォルト権限設定
     */
    private static function getDefaultPermissions(string $role): array
    {
        $roles = self::getAvailableRoles();
        $roleInfo = $roles[$role] ?? $roles[self::ROLE_VIEWER];

        return [
            'granted' => $roleInfo['permissions'],
            'denied' => [],
            'custom' => [],
        ];
    }

    /**
     * 検索スコープ: アクティブスタッフ
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: ロール別
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * 検索スコープ: 権限レベル以上
     */
    public function scopeWithMinimumRole($query, string $minimumRole)
    {
        $roles = self::getAvailableRoles();
        $minimumLevel = $roles[$minimumRole]['level'] ?? 0;

        $validRoles = array_keys(array_filter($roles, function ($role) use ($minimumLevel) {
            return $role['level'] >= $minimumLevel;
        }));

        return $query->whereIn('role', $validRoles);
    }

    /**
     * 検索スコープ: 最近ログインしたスタッフ
     */
    public function scopeRecentlyActive($query, int $days = 30)
    {
        return $query->where('last_login_at', '>=', now()->subDays($days));
    }

    /**
     * 検索スコープ: 二要素認証有効スタッフ
     */
    public function scopeWithTwoFactor($query)
    {
        return $query->where('two_factor_auth->enabled', true)
            ->where('two_factor_auth->verified', true);
    }
}
