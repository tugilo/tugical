<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * テナントモデル - 事業者管理
 * 
 * tugicalサービスの事業者（契約者）を管理するモデル
 * プラン別制限、契約情報、課金管理を統合管理
 * 
 * 主要機能:
 * - 店舗数制限・予約数制限管理
 * - プラン変更・アップグレード管理
 * - 課金サイクル・支払い状況管理
 * - 契約開始・更新・解約管理
 * - 業種テンプレート・機能制限管理
 * 
 * 関連テーブル:
 * - stores: 配下店舗（1対多）
 * 
 * @property int $id テナントID
 * @property string $name 事業者名
 * @property string $plan_type プランタイプ（basic/standard/premium/enterprise）
 * @property array $plan_limits プラン制限（JSON: 店舗数、予約数、ストレージ等）
 * @property array $billing_info 課金情報（JSON: 金額、支払い方法、次回更新日等）
 * @property Carbon $contract_start_date 契約開始日
 * @property Carbon|null $contract_end_date 契約終了日（null=継続中）
 * @property string $status ステータス（active/suspended/cancelled/trial）
 * @property array $feature_flags 機能フラグ（JSON: 有効機能、ベータ機能等）
 * @property string|null $admin_email 管理者メールアドレス
 * @property string|null $admin_phone 管理者電話番号
 * @property array|null $company_info 会社情報（JSON: 住所、業種、従業員数等）
 * @property array|null $notification_settings 通知設定（JSON: メール通知、レポート頻度等）
 * @property Carbon|null $last_login_at 最終ログイン日時
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read \Illuminate\Database\Eloquent\Collection<Store> $stores 配下店舗一覧
 * @property-read int $stores_count 店舗数
 */
class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'tenants';

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
        'billing_info',
        'admin_phone',
        'company_info',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'plan_limits' => 'array',
        'billing_info' => 'array',
        'feature_flags' => 'array',
        'company_info' => 'array',
        'notification_settings' => 'array',
        'contract_starts_at' => 'date',
        'contract_ends_at' => 'date',
        'trial_ends_at' => 'date',
        'deleted_at' => 'datetime',
    ];

    /**
     * プランタイプの定数
     */
    public const PLAN_BASIC = 'basic';
    public const PLAN_STANDARD = 'standard';
    public const PLAN_PREMIUM = 'premium';
    public const PLAN_ENTERPRISE = 'enterprise';

    /**
     * ステータスの定数
     */
    public const STATUS_ACTIVE = 'active';
    public const STATUS_TRIAL = 'trial';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CANCELLED = 'cancelled';

    /**
     * 利用可能プランタイプ一覧
     */
    public static function getAvailablePlans(): array
    {
        return [
            self::PLAN_BASIC => [
                'name' => 'ベーシック',
                'monthly_price' => 9800,
                'store_limit' => 1,
                'monthly_booking_limit' => 500,
                'storage_limit_gb' => 1,
                'features' => ['basic_booking', 'line_notification', 'basic_analytics']
            ],
            self::PLAN_STANDARD => [
                'name' => 'スタンダード',
                'monthly_price' => 19800,
                'store_limit' => 3,
                'monthly_booking_limit' => 2000,
                'storage_limit_gb' => 5,
                'features' => ['basic_booking', 'line_notification', 'advanced_analytics', 'custom_templates']
            ],
            self::PLAN_PREMIUM => [
                'name' => 'プレミアム',
                'monthly_price' => 39800,
                'store_limit' => 10,
                'monthly_booking_limit' => 10000,
                'storage_limit_gb' => 20,
                'features' => ['basic_booking', 'line_notification', 'advanced_analytics', 'custom_templates', 'api_access']
            ],
            self::PLAN_ENTERPRISE => [
                'name' => 'エンタープライズ',
                'monthly_price' => 99800,
                'store_limit' => 100,
                'monthly_booking_limit' => 100000,
                'storage_limit_gb' => 100,
                'features' => ['all_features', 'priority_support', 'custom_development']
            ],
        ];
    }

    /**
     * 利用可能ステータス一覧
     */
    public static function getAvailableStatuses(): array
    {
        return [
            self::STATUS_ACTIVE => 'アクティブ',
            self::STATUS_TRIAL => 'トライアル',
            self::STATUS_SUSPENDED => '一時停止',
            self::STATUS_CANCELLED => 'キャンセル',
        ];
    }

    /**
     * モデルの起動時処理
     * 
     * 注意: Tenantモデルは最上位のため、TenantScopeは適用しない
     */
    protected static function booted()
    {
        // Tenantモデルは最上位のため、TenantScopeは適用しない
        // 代わりに作成時のデフォルト値設定
        static::creating(function ($tenant) {
                    // デフォルトのプラン制限設定
        if (!$tenant->plan_limits) {
            $tenant->plan_limits = self::getDefaultPlanLimits($tenant->plan);
        }

        // デフォルトの機能フラグ設定
        if (!$tenant->feature_flags) {
            $tenant->feature_flags = self::getDefaultFeatureFlags($tenant->plan);
        }

        // 契約開始日のデフォルト設定
        if (!$tenant->contract_starts_at) {
            $tenant->contract_starts_at = now();
        }

        // ステータスのデフォルト設定
        if (!$tenant->status) {
            $tenant->status = 'active';
        }
        });
    }

    /**
     * 配下店舗との関係性
     * 
     * @return HasMany
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    /**
     * プラン制限チェック: 店舗数
     * 
     * @return bool 制限内の場合true
     */
    public function canCreateStore(): bool
    {
        $currentStoreCount = $this->stores()->count();
        $storeLimit = $this->plan_limits['store_limit'] ?? 1;

        return $currentStoreCount < $storeLimit;
    }

    /**
     * プラン制限チェック: 月間予約数
     * 
     * @return bool 制限内の場合true
     */
    public function canCreateBooking(): bool
    {
        $currentMonth = now()->format('Y-m');
        $currentBookingCount = $this->stores()
            ->withCount(['bookings' => function ($query) use ($currentMonth) {
                $query->whereYear('booking_date', '=', now()->year)
                    ->whereMonth('booking_date', '=', now()->month);
            }])
            ->get()
            ->sum('bookings_count');

        $monthlyLimit = $this->plan_limits['monthly_booking_limit'] ?? 500;

        return $currentBookingCount < $monthlyLimit;
    }

    /**
     * 機能利用可能チェック
     * 
     * @param string $feature 機能名
     * @return bool 利用可能な場合true
     */
    public function hasFeature(string $feature): bool
    {
        $enabledFeatures = $this->feature_flags['enabled'] ?? [];

        return in_array($feature, $enabledFeatures) ||
            in_array('all_features', $enabledFeatures);
    }

    /**
     * 契約期限チェック
     * 
     * @return bool 契約有効期限内の場合true
     */
    public function isContractValid(): bool
    {
        if (!$this->contract_ends_at) {
            return true; // 無期限契約
        }

        return $this->contract_ends_at->isFuture();
    }

    /**
     * アクティブステータスチェック
     * 
     * @return bool アクティブ状態の場合true
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE &&
            $this->isContractValid();
    }

    /**
     * プラン情報取得
     * 
     * @return array プラン詳細情報
     */
    public function getPlanInfo(): array
    {
        $plans = self::getAvailablePlans();

        return $plans[$this->plan_type] ?? [];
    }

    /**
     * 次回課金日取得
     * 
     * @return Carbon|null 次回課金日
     */
    public function getNextBillingDate(): ?Carbon
    {
        $billingCycle = $this->billing_cycle ?? 'monthly';
        $lastBillingDate = $this->contract_starts_at;

        if (!$lastBillingDate) {
            return null;
        }

        $lastBilling = Carbon::parse($lastBillingDate);

        return match ($billingCycle) {
            'monthly' => $lastBilling->addMonth(),
            'annual' => $lastBilling->addYear(),
            default => null,
        };
    }

    /**
     * デフォルトプラン制限取得
     * 
     * @param string $planType プランタイプ
     * @return array プラン制限設定
     */
    private static function getDefaultPlanLimits(string $planType): array
    {
        $plans = self::getAvailablePlans();
        $planInfo = $plans[$planType] ?? $plans[self::PLAN_BASIC];

        return [
            'store_limit' => $planInfo['store_limit'],
            'monthly_booking_limit' => $planInfo['monthly_booking_limit'],
            'storage_limit_gb' => $planInfo['storage_limit_gb'],
            'api_rate_limit' => $planInfo['monthly_booking_limit'] * 2, // 予約数の2倍
            'concurrent_users' => min($planInfo['store_limit'] * 5, 100), // 店舗数×5人まで
        ];
    }

    /**
     * デフォルト機能フラグ取得
     * 
     * @param string $planType プランタイプ
     * @return array 機能フラグ設定
     */
    private static function getDefaultFeatureFlags(string $planType): array
    {
        $plans = self::getAvailablePlans();
        $planInfo = $plans[$planType] ?? $plans[self::PLAN_BASIC];

        return [
            'enabled' => $planInfo['features'],
            'beta' => [],
            'disabled' => [],
            'custom' => [],
        ];
    }

    /**
     * 検索スコープ: プランタイプ別
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $planType プランタイプ
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeByPlan($query, string $planType)
    {
        return $query->where('plan', $planType);
    }

    /**
     * 検索スコープ: アクティブテナント
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('contract_ends_at')
                    ->orWhere('contract_ends_at', '>', now());
            });
    }

    /**
     * 検索スコープ: 課金期限切れ
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeExpired($query)
    {
        return $query->whereNotNull('contract_ends_at')
            ->where('contract_ends_at', '<=', now());
    }
}
