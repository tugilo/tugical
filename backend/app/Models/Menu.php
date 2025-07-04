<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * メニューモデル - サービスメニュー管理
 * 
 * 各店舗のサービスメニューを管理し、価格・時間・制約を統合管理
 * 業種テンプレートと連動して、業種別の表示名・制約を自動適用
 * 
 * 主要機能:
 * - 基本料金・時間・オプション管理
 * - 業種別メニュー名カスタマイズ
 * - 予約制約設定（事前予約日数、利用条件等）
 * - MenuOptionとの親子関係管理
 * - カテゴリ分類・表示順序管理
 * - 準備時間・片付け時間込みの総所要時間計算
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - menu_options: メニューオプション（1対多）
 * - bookings: 予約（1対多）
 * 
 * @property int $id メニューID
 * @property int $store_id 店舗ID
 * @property string $name メニュー名
 * @property string $display_name 表示名（業種別カスタマイズ可能）
 * @property string|null $category カテゴリ
 * @property string|null $description 説明
 * @property int $base_price 基本料金（円）
 * @property int $base_duration 基本所要時間（分）
 * @property int $prep_duration 準備時間（分）
 * @property int $cleanup_duration 片付け時間（分）
 * @property array|null $booking_constraints 予約制約（JSON: 事前予約日数、利用条件等）
 * @property array|null $resource_requirements リソース要件（JSON: 必要スタッフ数、部屋タイプ等）
 * @property array|null $industry_settings 業種設定（JSON: 業種別カスタマイズ）
 * @property string|null $image_url 画像URL
 * @property bool $is_active アクティブ状態
 * @property bool $requires_approval 承認必要フラグ
 * @property int $sort_order 表示順序
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read \Illuminate\Database\Eloquent\Collection<MenuOption> $options メニューオプション一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $bookings 予約一覧
 */
class Menu extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'menus';

    /**
     * 一括代入可能な属性
     */
    protected $fillable = [
        'store_id',
        'name',
        'display_name',
        'category',
        'description',
        'base_price',
        'base_duration',
        'prep_duration',
        'cleanup_duration',
        'advance_booking_hours',
        'booking_rules',
        'allowed_resource_types',
        'required_resources',
        'gender_restriction',
        'image_url',
        'is_active',
        'require_approval',
        'sort_order',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'booking_rules' => 'array',
        'allowed_resource_types' => 'array',
        'required_resources' => 'array',
        'base_price' => 'integer',
        'base_duration' => 'integer',
        'prep_duration' => 'integer',
        'cleanup_duration' => 'integer',
        'advance_booking_hours' => 'integer',
        'is_active' => 'boolean',
        'require_approval' => 'boolean',
        'sort_order' => 'integer',
        'deleted_at' => 'datetime',
    ];

    /**
     * デフォルト業種別設定
     */
    public static function getIndustryDefaults(): array
    {
        return [
            'beauty' => [
                'categories' => ['カット', 'カラー', 'パーマ', 'ヘアケア', 'ネイル', 'まつエク'],
                'display_labels' => ['メニュー', 'コース', 'サービス'],
                'typical_durations' => [30, 60, 90, 120, 180],
                'constraints' => [
                    'advance_booking_days' => 30,
                    'same_day_booking' => true,
                    'cancellation_hours' => 24,
                ],
                'resource_requirements' => [
                    'staff_type' => 'beauty_stylist',
                    'room_required' => false,
                    'equipment' => [],
                ],
            ],
            'clinic' => [
                'categories' => ['診察', '検査', '治療', 'リハビリ', '予防接種'],
                'display_labels' => ['診療メニュー', '検査項目', '治療内容'],
                'typical_durations' => [15, 30, 45, 60],
                'constraints' => [
                    'advance_booking_days' => 14,
                    'same_day_booking' => false,
                    'cancellation_hours' => 48,
                ],
                'resource_requirements' => [
                    'staff_type' => 'medical_doctor',
                    'room_required' => true,
                    'equipment' => [],
                ],
            ],
            'rental' => [
                'categories' => ['会議室', '個室', 'イベントスペース', '設備利用'],
                'display_labels' => ['利用プラン', 'レンタルメニュー', 'プラン'],
                'typical_durations' => [60, 120, 240, 480],
                'constraints' => [
                    'advance_booking_days' => 90,
                    'same_day_booking' => true,
                    'cancellation_hours' => 24,
                ],
                'resource_requirements' => [
                    'staff_type' => null,
                    'room_required' => true,
                    'equipment' => [],
                ],
            ],
            'school' => [
                'categories' => ['通常授業', '体験レッスン', '特別講座', '個別指導'],
                'display_labels' => ['授業メニュー', 'レッスン', 'コース'],
                'typical_durations' => [30, 45, 60, 90, 120],
                'constraints' => [
                    'advance_booking_days' => 7,
                    'same_day_booking' => false,
                    'cancellation_hours' => 24,
                ],
                'resource_requirements' => [
                    'staff_type' => 'instructor',
                    'room_required' => true,
                    'equipment' => [],
                ],
            ],
            'activity' => [
                'categories' => ['ガイドツアー', '体験活動', 'ワークショップ', '特別企画'],
                'display_labels' => ['体験メニュー', 'アクティビティ', 'プログラム'],
                'typical_durations' => [60, 120, 180, 240, 360],
                'constraints' => [
                    'advance_booking_days' => 7,
                    'same_day_booking' => true,
                    'cancellation_hours' => 48,
                ],
                'resource_requirements' => [
                    'staff_type' => 'guide',
                    'room_required' => false,
                    'equipment' => [],
                ],
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
        
        // 一時的にSeeder実行のためコメントアウト
        /*
        // 作成時に自動でstore_id設定
        static::creating(function ($menu) {
            if (!$menu->store_id && auth()->check()) {
                $menu->store_id = auth()->user()->store_id;
            }

            // デフォルト値設定
            if (!$menu->display_name) {
                $menu->display_name = $menu->name;
            }

            // デフォルト時間設定
            $menu->prep_duration = $menu->prep_duration ?? 0;
            $menu->cleanup_duration = $menu->cleanup_duration ?? 0;

            // デフォルト状態設定
            $menu->is_active = $menu->is_active ?? true;
            $menu->requires_approval = $menu->requires_approval ?? false;

            // デフォルト表示順序
            if (!$menu->sort_order) {
                $maxSort = self::where('store_id', $menu->store_id)->max('sort_order') ?? 0;
                $menu->sort_order = $maxSort + 10;
            }

            // 業種別デフォルト設定適用
            if (!$menu->industry_settings) {
                $menu->industry_settings = self::getIndustryDefaultSettings($menu->store);
            }

            // デフォルト制約設定
            if (!$menu->booking_constraints) {
                $menu->booking_constraints = self::getDefaultConstraints($menu->store);
            }

            // デフォルトリソース要件設定
            if (!$menu->resource_requirements) {
                $menu->resource_requirements = self::getDefaultResourceRequirements($menu->store);
            }
        });

        // 更新時の処理
        static::updating(function ($menu) {
            // 表示名が空の場合、名前をコピー
            if (empty($menu->display_name)) {
                $menu->display_name = $menu->name;
            }
        });
        */
    }

    /**
     * 所属店舗との関係性
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * メニューオプションとの関係性
     */
    public function options(): HasMany
    {
        return $this->hasMany(MenuOption::class)->orderBy('sort_order');
    }

    /**
     * 予約との関係性
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * 総所要時間計算
     * 基本時間 + 準備時間 + 片付け時間
     * 
     * @return int 総所要時間（分）
     */
    public function getTotalDuration(): int
    {
        return $this->base_duration + $this->prep_duration + $this->cleanup_duration;
    }

    /**
     * 実際の作業時間計算（準備・片付け時間を除く）
     * 
     * @return int 作業時間（分）
     */
    public function getWorkDuration(): int
    {
        return $this->base_duration;
    }

    /**
     * 指定されたオプションを含む合計料金計算
     * 
     * @param array $optionIds オプションID配列
     * @return int 合計料金（円）
     */
    public function calculateTotalPrice(array $optionIds = []): int
    {
        $totalPrice = $this->base_price;

        if (!empty($optionIds)) {
            $options = $this->options()->whereIn('id', $optionIds)->get();
            foreach ($options as $option) {
                $totalPrice += $option->calculatePrice($this->base_price, $this->base_duration);
            }
        }

        return $totalPrice;
    }

    /**
     * 指定されたオプションを含む合計時間計算
     * 
     * @param array $optionIds オプションID配列
     * @return int 合計時間（分）
     */
    public function calculateTotalDuration(array $optionIds = []): int
    {
        $totalDuration = $this->getTotalDuration();

        if (!empty($optionIds)) {
            $options = $this->options()->whereIn('id', $optionIds)->get();
            foreach ($options as $option) {
                $totalDuration += $option->calculateDuration($this->base_duration);
            }
        }

        return $totalDuration;
    }

    /**
     * 業種別表示名取得
     * 
     * @return string 業種に応じたメニュー表示名
     */
    public function getIndustryDisplayName(): string
    {
        $industrySettings = $this->industry_settings ?? [];
        $industryType = $this->store->industry_type ?? 'beauty';
        
        $industryDisplayName = $industrySettings[$industryType]['display_name'] ?? null;
        
        return $industryDisplayName ?? $this->display_name ?? $this->name;
    }

    /**
     * 予約制約チェック
     * 
     * @param \DateTime $bookingDate 予約希望日
     * @return array 制約チェック結果
     */
    public function checkBookingConstraints(\DateTime $bookingDate): array
    {
        $constraints = $this->booking_constraints ?? [];
        $now = new \DateTime();
        $results = ['valid' => true, 'errors' => []];

        // 事前予約日数チェック
        if (isset($constraints['advance_booking_days'])) {
            $maxAdvanceDays = $constraints['advance_booking_days'];
            $maxAdvanceDate = (clone $now)->modify("+{$maxAdvanceDays} days");
            
            if ($bookingDate > $maxAdvanceDate) {
                $results['valid'] = false;
                $results['errors'][] = "{$maxAdvanceDays}日以降の予約はできません";
            }
        }

        // 当日予約チェック
        if (isset($constraints['same_day_booking']) && !$constraints['same_day_booking']) {
            if ($bookingDate->format('Y-m-d') === $now->format('Y-m-d')) {
                $results['valid'] = false;
                $results['errors'][] = '当日予約はできません';
            }
        }

        // 最小事前予約時間チェック
        if (isset($constraints['minimum_advance_hours'])) {
            $minAdvanceHours = $constraints['minimum_advance_hours'];
            $minAdvanceTime = (clone $now)->modify("+{$minAdvanceHours} hours");
            
            if ($bookingDate < $minAdvanceTime) {
                $results['valid'] = false;
                $results['errors'][] = "{$minAdvanceHours}時間前までに予約してください";
            }
        }

        return $results;
    }

    /**
     * リソース要件チェック
     * 
     * @param array $availableResources 利用可能リソース
     * @return array 要件チェック結果
     */
    public function checkResourceRequirements(array $availableResources): array
    {
        $requirements = $this->resource_requirements ?? [];
        $results = ['valid' => true, 'missing' => []];

        // スタッフタイプチェック
        if (isset($requirements['staff_type']) && $requirements['staff_type']) {
            $requiredStaffType = $requirements['staff_type'];
            $hasRequiredStaff = collect($availableResources)
                ->where('type', 'staff')
                ->pluck('attributes.staff_type')
                ->contains($requiredStaffType);
            
            if (!$hasRequiredStaff) {
                $results['valid'] = false;
                $results['missing'][] = "必要なスタッフタイプ: {$requiredStaffType}";
            }
        }

        // 部屋要件チェック
        if (isset($requirements['room_required']) && $requirements['room_required']) {
            $hasRoom = collect($availableResources)->where('type', 'room')->isNotEmpty();
            
            if (!$hasRoom) {
                $results['valid'] = false;
                $results['missing'][] = '利用可能な部屋が必要です';
            }
        }

        // 設備要件チェック
        if (isset($requirements['equipment']) && !empty($requirements['equipment'])) {
            $requiredEquipment = $requirements['equipment'];
            $availableEquipment = collect($availableResources)
                ->where('type', 'equipment')
                ->pluck('id')
                ->toArray();
                
            $missingEquipment = array_diff($requiredEquipment, $availableEquipment);
            
            if (!empty($missingEquipment)) {
                $results['valid'] = false;
                $results['missing'][] = '必要な設備が不足しています';
            }
        }

        return $results;
    }

    /**
     * アクティブ状態チェック
     * 
     * @return bool アクティブな場合true
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * 承認必要チェック
     * 
     * @return bool 承認が必要な場合true
     */
    public function requiresApproval(): bool
    {
        return $this->requires_approval;
    }

    /**
     * カテゴリ情報取得
     * 
     * @return array カテゴリ情報（業種別デフォルト含む）
     */
    public function getCategoryInfo(): array
    {
        $industryType = $this->store->industry_type ?? 'beauty';
        $industryDefaults = self::getIndustryDefaults();
        $categories = $industryDefaults[$industryType]['categories'] ?? [];
        
        return [
            'current' => $this->category,
            'available' => $categories,
            'industry_type' => $industryType,
        ];
    }

    /**
     * 業種別デフォルト設定取得
     * 
     * @param Store|null $store 店舗モデル
     * @return array 業種別設定
     */
    private static function getIndustryDefaultSettings(?Store $store): array
    {
        if (!$store) {
            return [];
        }

        $industryType = $store->industry_type ?? 'beauty';
        $industryDefaults = self::getIndustryDefaults();
        
        return $industryDefaults[$industryType] ?? [];
    }

    /**
     * デフォルト制約取得
     * 
     * @param Store|null $store 店舗モデル
     * @return array デフォルト制約
     */
    private static function getDefaultConstraints(?Store $store): array
    {
        if (!$store) {
            return [];
        }

        $industrySettings = self::getIndustryDefaultSettings($store);
        return $industrySettings['constraints'] ?? [];
    }

    /**
     * デフォルトリソース要件取得
     * 
     * @param Store|null $store 店舗モデル
     * @return array デフォルトリソース要件
     */
    private static function getDefaultResourceRequirements(?Store $store): array
    {
        if (!$store) {
            return [];
        }

        $industrySettings = self::getIndustryDefaultSettings($store);
        return $industrySettings['resource_requirements'] ?? [];
    }

    /**
     * 検索スコープ: アクティブメニュー
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: カテゴリ別
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * 検索スコープ: 価格帯
     */
    public function scopePriceRange($query, int $minPrice, int $maxPrice)
    {
        return $query->whereBetween('base_price', [$minPrice, $maxPrice]);
    }

    /**
     * 検索スコープ: 時間帯
     */
    public function scopeDurationRange($query, int $minDuration, int $maxDuration)
    {
        return $query->whereBetween('base_duration', [$minDuration, $maxDuration]);
    }

    /**
     * 検索スコープ: 表示順序
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * 検索スコープ: 承認不要
     */
    public function scopeNoApprovalRequired($query)
    {
        return $query->where('requires_approval', false);
    }

    /**
     * 検索スコープ: キーワード検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function($q) use ($keyword) {
            $q->where('name', 'like', "%{$keyword}%")
              ->orWhere('display_name', 'like', "%{$keyword}%")
              ->orWhere('description', 'like', "%{$keyword}%")
              ->orWhere('category', 'like', "%{$keyword}%");
        });
    }
} 