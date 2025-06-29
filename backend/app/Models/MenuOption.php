<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * メニューオプションモデル - メニューオプション管理
 * 
 * 各メニューに付随するオプションサービスを管理
 * 固定価格・比例価格・追加時間・在庫管理を統合実装
 * 
 * 主要機能:
 * - 多様な価格体系（固定価格、基本料金比例、時間比例）
 * - 追加時間・在庫制限管理
 * - 相互排他・必須オプション設定
 * - 業種テンプレート連動
 * - Booking-MenuOption中間テーブル連携
 * 
 * 価格体系の種類:
 * - fixed: 固定価格（例: トリートメント +1000円）
 * - percentage: 基本料金の割合（例: 指名料 +20%）
 * - duration_based: 時間ベース（例: 延長 +500円/30分）
 * - free: 無料オプション
 * 
 * 関連テーブル:
 * - menu: 親メニュー（多対1）
 * - bookings: 予約（多対多、中間テーブル：booking_options）
 * 
 * @property int $id オプションID
 * @property int $menu_id メニューID
 * @property string $name オプション名
 * @property string $display_name 表示名
 * @property string|null $description 説明
 * @property string $price_type 価格タイプ（fixed/percentage/duration_based/free）
 * @property int $price_value 価格値（円またはパーセント）
 * @property int $duration_minutes 追加時間（分）
 * @property array|null $constraints 制約設定（JSON: 相互排他、必須条件等）
 * @property int|null $stock_quantity 在庫数（nullの場合は無制限）
 * @property int $stock_used 使用済み在庫数
 * @property bool $is_required 必須オプションフラグ
 * @property bool $is_active アクティブ状態
 * @property int $sort_order 表示順序
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Menu $menu 親メニュー
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $bookings オプションを選択した予約一覧
 */
class MenuOption extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'menu_options';

    /**
     * 一括代入可能な属性
     */
    protected $fillable = [
        'menu_id',
        'name',
        'display_name',
        'description',
        'price_type',
        'price_value',
        'duration_minutes',
        'constraints',
        'stock_quantity',
        'stock_used',
        'is_required',
        'is_active',
        'sort_order',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'constraints' => 'array',
        'price_value' => 'integer',
        'duration_minutes' => 'integer',
        'stock_quantity' => 'integer',
        'stock_used' => 'integer',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'deleted_at' => 'datetime',
    ];

    /**
     * 価格タイプの定数
     */
    public const PRICE_TYPE_FIXED = 'fixed';
    public const PRICE_TYPE_PERCENTAGE = 'percentage';
    public const PRICE_TYPE_DURATION_BASED = 'duration_based';
    public const PRICE_TYPE_FREE = 'free';

    /**
     * 利用可能価格タイプ一覧
     */
    public static function getAvailablePriceTypes(): array
    {
        return [
            self::PRICE_TYPE_FIXED => [
                'name' => '固定価格',
                'description' => '固定金額を追加（例: +1000円）',
                'value_unit' => '円',
                'example' => 'トリートメント +1000円',
            ],
            self::PRICE_TYPE_PERCENTAGE => [
                'name' => '割合価格',
                'description' => '基本料金の割合を追加（例: +20%）',
                'value_unit' => '%',
                'example' => '指名料 +20%',
            ],
            self::PRICE_TYPE_DURATION_BASED => [
                'name' => '時間ベース価格',
                'description' => '追加時間に対する料金（例: +500円/30分）',
                'value_unit' => '円/時間',
                'example' => '延長 +500円/30分',
            ],
            self::PRICE_TYPE_FREE => [
                'name' => '無料',
                'description' => '追加料金なし',
                'value_unit' => '',
                'example' => 'タオル交換（無料）',
            ],
        ];
    }

    /**
     * 業種別デフォルトオプション
     */
    public static function getIndustryDefaultOptions(): array
    {
        return [
            'beauty' => [
                ['name' => '指名料', 'price_type' => 'percentage', 'price_value' => 20, 'duration_minutes' => 0],
                ['name' => 'トリートメント', 'price_type' => 'fixed', 'price_value' => 1000, 'duration_minutes' => 15],
                ['name' => 'ヘアマスク', 'price_type' => 'fixed', 'price_value' => 1500, 'duration_minutes' => 20],
                ['name' => '延長（30分）', 'price_type' => 'fixed', 'price_value' => 2000, 'duration_minutes' => 30],
            ],
            'clinic' => [
                ['name' => '追加検査', 'price_type' => 'fixed', 'price_value' => 3000, 'duration_minutes' => 15],
                ['name' => '詳細相談', 'price_type' => 'fixed', 'price_value' => 2000, 'duration_minutes' => 20],
                ['name' => '処方箋発行', 'price_type' => 'fixed', 'price_value' => 500, 'duration_minutes' => 5],
            ],
            'rental' => [
                ['name' => '延長（1時間）', 'price_type' => 'percentage', 'price_value' => 50, 'duration_minutes' => 60],
                ['name' => 'プロジェクター', 'price_type' => 'fixed', 'price_value' => 2000, 'duration_minutes' => 0],
                ['name' => 'ケータリング', 'price_type' => 'fixed', 'price_value' => 5000, 'duration_minutes' => 0],
                ['name' => '清掃サービス', 'price_type' => 'fixed', 'price_value' => 3000, 'duration_minutes' => 0],
            ],
            'school' => [
                ['name' => '教材費', 'price_type' => 'fixed', 'price_value' => 1000, 'duration_minutes' => 0],
                ['name' => '個別指導', 'price_type' => 'percentage', 'price_value' => 50, 'duration_minutes' => 0],
                ['name' => '復習セッション', 'price_type' => 'fixed', 'price_value' => 2000, 'duration_minutes' => 30],
            ],
            'activity' => [
                ['name' => '写真撮影', 'price_type' => 'fixed', 'price_value' => 2000, 'duration_minutes' => 10],
                ['name' => '送迎サービス', 'price_type' => 'fixed', 'price_value' => 1500, 'duration_minutes' => 0],
                ['name' => 'ガイド指名', 'price_type' => 'percentage', 'price_value' => 30, 'duration_minutes' => 0],
                ['name' => '特別体験', 'price_type' => 'fixed', 'price_value' => 3000, 'duration_minutes' => 45],
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
        
        // 作成時の処理
        static::creating(function ($option) {
            // デフォルト値設定
            if (!$option->display_name) {
                $option->display_name = $option->name;
            }

            $option->duration_minutes = $option->duration_minutes ?? 0;
            $option->stock_used = $option->stock_used ?? 0;
            $option->is_required = $option->is_required ?? false;
            $option->is_active = $option->is_active ?? true;

            // デフォルト表示順序
            if (!$option->sort_order) {
                $maxSort = self::where('menu_id', $option->menu_id)->max('sort_order') ?? 0;
                $option->sort_order = $maxSort + 10;
            }

            // 価格タイプがfreeの場合、価格値を0に設定
            if ($option->price_type === self::PRICE_TYPE_FREE) {
                $option->price_value = 0;
            }
        });

        // 更新時の処理
        static::updating(function ($option) {
            // 表示名が空の場合、名前をコピー
            if (empty($option->display_name)) {
                $option->display_name = $option->name;
            }

            // 価格タイプがfreeの場合、価格値を0に設定
            if ($option->price_type === self::PRICE_TYPE_FREE) {
                $option->price_value = 0;
            }
        });
    }

    /**
     * 親メニューとの関係性
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    /**
     * 予約との関係性（多対多、中間テーブル経由）
     */
    public function bookings(): BelongsToMany
    {
        return $this->belongsToMany(Booking::class, 'booking_options')
                    ->withPivot(['quantity', 'calculated_price', 'calculated_duration', 'snapshot_data'])
                    ->withTimestamps();
    }

    /**
     * 価格計算
     * 
     * @param int $basePrice 基本料金（円）
     * @param int $baseDuration 基本時間（分）
     * @param int $quantity 数量（デフォルト: 1）
     * @return int 計算された追加料金（円）
     */
    public function calculatePrice(int $basePrice, int $baseDuration, int $quantity = 1): int
    {
        if ($this->price_type === self::PRICE_TYPE_FREE) {
            return 0;
        }

        $unitPrice = 0;

        switch ($this->price_type) {
            case self::PRICE_TYPE_FIXED:
                $unitPrice = $this->price_value;
                break;

            case self::PRICE_TYPE_PERCENTAGE:
                $unitPrice = (int) round($basePrice * $this->price_value / 100);
                break;

            case self::PRICE_TYPE_DURATION_BASED:
                // 追加時間に対する料金計算
                $additionalMinutes = $this->duration_minutes;
                if ($additionalMinutes > 0) {
                    $unitPrice = $this->price_value;
                }
                break;

            default:
                $unitPrice = 0;
                break;
        }

        return $unitPrice * $quantity;
    }

    /**
     * 追加時間計算
     * 
     * @param int $baseDuration 基本時間（分、計算では未使用だが一貫性のため）
     * @param int $quantity 数量（デフォルト: 1）
     * @return int 計算された追加時間（分）
     */
    public function calculateDuration(int $baseDuration, int $quantity = 1): int
    {
        return $this->duration_minutes * $quantity;
    }

    /**
     * 在庫チェック
     * 
     * @param int $requestedQuantity 要求数量
     * @return bool 在庫が十分な場合true
     */
    public function hasStock(int $requestedQuantity = 1): bool
    {
        // stock_quantityがnullの場合は無制限
        if ($this->stock_quantity === null) {
            return true;
        }

        $availableStock = $this->stock_quantity - $this->stock_used;
        return $availableStock >= $requestedQuantity;
    }

    /**
     * 在庫残量取得
     * 
     * @return int|null 在庫残量（nullの場合は無制限）
     */
    public function getAvailableStock(): ?int
    {
        if ($this->stock_quantity === null) {
            return null; // 無制限
        }

        return max(0, $this->stock_quantity - $this->stock_used);
    }

    /**
     * 在庫消費
     * 
     * @param int $quantity 消費数量
     * @return bool 成功した場合true
     */
    public function consumeStock(int $quantity = 1): bool
    {
        if (!$this->hasStock($quantity)) {
            return false;
        }

        // stock_quantityがnullの場合は無制限なので消費しない
        if ($this->stock_quantity !== null) {
            $this->increment('stock_used', $quantity);
        }

        return true;
    }

    /**
     * 在庫復元
     * 
     * @param int $quantity 復元数量
     * @return bool 成功した場合true
     */
    public function restoreStock(int $quantity = 1): bool
    {
        // stock_quantityがnullの場合は無制限なので復元の必要なし
        if ($this->stock_quantity === null) {
            return true;
        }

        $newUsed = max(0, $this->stock_used - $quantity);
        $this->update(['stock_used' => $newUsed]);

        return true;
    }

    /**
     * 制約チェック
     * 
     * @param array $selectedOptionIds 選択されたオプションIDリスト
     * @return array 制約チェック結果
     */
    public function checkConstraints(array $selectedOptionIds): array
    {
        $constraints = $this->constraints ?? [];
        $results = ['valid' => true, 'errors' => []];

        // 相互排他チェック
        if (isset($constraints['mutually_exclusive'])) {
            $exclusiveIds = $constraints['mutually_exclusive'];
            $conflicts = array_intersect($exclusiveIds, $selectedOptionIds);
            
            if (!empty($conflicts)) {
                $results['valid'] = false;
                $results['errors'][] = "このオプションは他のオプションと同時に選択できません";
            }
        }

        // 必須組み合わせチェック
        if (isset($constraints['requires'])) {
            $requiredIds = $constraints['requires'];
            $missing = array_diff($requiredIds, $selectedOptionIds);
            
            if (!empty($missing)) {
                $results['valid'] = false;
                $results['errors'][] = "このオプションには他の必須オプションの選択が必要です";
            }
        }

        // 最大数量チェック
        if (isset($constraints['max_quantity'])) {
            $maxQuantity = $constraints['max_quantity'];
            $currentCount = collect($selectedOptionIds)->countBy()->get($this->id, 0);
            
            if ($currentCount > $maxQuantity) {
                $results['valid'] = false;
                $results['errors'][] = "このオプションは最大{$maxQuantity}個まで選択可能です";
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
     * 必須オプションチェック
     * 
     * @return bool 必須オプションの場合true
     */
    public function isRequired(): bool
    {
        return $this->is_required;
    }

    /**
     * 在庫管理対象チェック
     * 
     * @return bool 在庫管理対象の場合true
     */
    public function hasStockManagement(): bool
    {
        return $this->stock_quantity !== null;
    }

    /**
     * 価格タイプ情報取得
     * 
     * @return array 価格タイプ詳細情報
     */
    public function getPriceTypeInfo(): array
    {
        $types = self::getAvailablePriceTypes();
        return $types[$this->price_type] ?? [];
    }

    /**
     * フォーマット済み価格表示
     * 
     * @return string 表示用価格文字列
     */
    public function getFormattedPrice(): string
    {
        switch ($this->price_type) {
            case self::PRICE_TYPE_FIXED:
                return '+' . number_format($this->price_value) . '円';

            case self::PRICE_TYPE_PERCENTAGE:
                return '+' . $this->price_value . '%';

            case self::PRICE_TYPE_DURATION_BASED:
                $minutes = $this->duration_minutes;
                $price = number_format($this->price_value);
                return "+{$price}円/{$minutes}分";

            case self::PRICE_TYPE_FREE:
                return '無料';

            default:
                return '';
        }
    }

    /**
     * フォーマット済み時間表示
     * 
     * @return string 表示用時間文字列
     */
    public function getFormattedDuration(): string
    {
        if ($this->duration_minutes <= 0) {
            return '';
        }

        $hours = intval($this->duration_minutes / 60);
        $minutes = $this->duration_minutes % 60;

        if ($hours > 0 && $minutes > 0) {
            return "+{$hours}時間{$minutes}分";
        } elseif ($hours > 0) {
            return "+{$hours}時間";
        } else {
            return "+{$minutes}分";
        }
    }

    /**
     * 検索スコープ: アクティブオプション
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: 必須オプション
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * 検索スコープ: 在庫あり
     */
    public function scopeInStock($query)
    {
        return $query->where(function($q) {
            $q->whereNull('stock_quantity')  // 無制限在庫
              ->orWhereRaw('stock_quantity > stock_used');  // 在庫残量あり
        });
    }

    /**
     * 検索スコープ: 価格タイプ別
     */
    public function scopeByPriceType($query, string $priceType)
    {
        return $query->where('price_type', $priceType);
    }

    /**
     * 検索スコープ: 価格帯
     */
    public function scopePriceRange($query, int $minPrice, int $maxPrice)
    {
        return $query->whereBetween('price_value', [$minPrice, $maxPrice]);
    }

    /**
     * 検索スコープ: 表示順序
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * 検索スコープ: キーワード検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function($q) use ($keyword) {
            $q->where('name', 'like', "%{$keyword}%")
              ->orWhere('display_name', 'like', "%{$keyword}%")
              ->orWhere('description', 'like', "%{$keyword}%");
        });
    }
} 