<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * 予約オプションモデル - 予約時のオプション詳細管理
 * 
 * 各予約に追加されたオプションの詳細情報を管理
 * 予約時点でのオプション情報をスナップショットとして保存し、
 * 後からメニューが変更されても予約時の価格・内容を保持
 * 
 * 主要機能:
 * - 予約時オプション詳細保存（価格、時間、内容のスナップショット）
 * - オプション追加料金・時間の自動計算
 * - メニューオプション変更への対応（予約時データ保持）
 * - 複数オプション組み合わせ対応
 * - オプション別統計・分析データ提供
 * 
 * スナップショット機能:
 * - 予約時点でのオプション名・価格・内容を保存
 * - 後からメニューオプションが変更されても影響を受けない
 * - 請求・経理処理での価格確定性を保証
 * 
 * 関連テーブル:
 * - booking: 所属予約（多対1）
 * - menu_option: 元オプション（多対1、参照のみ）
 * 
 * @property int $id 予約オプションID
 * @property int $store_id 店舗ID
 * @property int $booking_id 予約ID
 * @property int $menu_option_id メニューオプションID（参照）
 * @property string $option_name オプション名（スナップショット）
 * @property string|null $option_description オプション説明（スナップショット）
 * @property int $option_price オプション料金（スナップショット）
 * @property int $option_duration オプション所要時間（分、スナップショット）
 * @property string $price_type 料金タイプ（fixed/percentage/per_hour、スナップショット）
 * @property int $quantity 数量
 * @property int $total_price 合計料金（option_price × quantity）
 * @property int $total_duration 合計時間（option_duration × quantity）
 * @property array|null $option_data オプションデータ（JSON: 詳細設定のスナップショット）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read Booking $booking 所属予約
 * @property-read MenuOption|null $menuOption 元メニューオプション（参照のみ）
 */
class BookingOption extends Model
{
    use HasFactory;

    /**
     * テーブル名
     */
    protected $table = 'booking_options';

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    /**
     * 料金タイプ定数
     */
    public const PRICE_TYPE_FIXED = 'fixed';
    public const PRICE_TYPE_PERCENTAGE = 'percentage';
    public const PRICE_TYPE_PER_HOUR = 'per_hour';

    /**
     * 料金タイプ情報
     */
    public static function getPriceTypes(): array
    {
        return [
            self::PRICE_TYPE_FIXED => [
                'name' => '固定料金',
                'description' => '固定の追加料金',
                'unit' => '円',
            ],
            self::PRICE_TYPE_PERCENTAGE => [
                'name' => 'パーセンテージ',
                'description' => 'ベース料金に対する割合',
                'unit' => '%',
            ],
            self::PRICE_TYPE_PER_HOUR => [
                'name' => '時間単価',
                'description' => '時間当たりの追加料金',
                'unit' => '円/時間',
            ],
        ];
    }

    /**
     * モデルの起動時処理
     */
    protected static function booted()
    {


        // 作成時の処理
        static::creating(function ($bookingOption) {
            // 数量のデフォルト値
            $bookingOption->quantity = $bookingOption->quantity ?? 1;

            // MenuOptionからスナップショットデータを自動設定
            if ($bookingOption->menu_option_id && !$bookingOption->option_name) {
                $menuOption = MenuOption::find($bookingOption->menu_option_id);
                if ($menuOption) {
                    $bookingOption->option_name = $menuOption->name;
                    $bookingOption->option_description = $menuOption->description;
                    $bookingOption->option_price = $menuOption->price;
                    $bookingOption->option_duration = $menuOption->duration;
                    $bookingOption->price_type = $menuOption->price_type;
                    $bookingOption->option_data = [
                        'original_option_data' => $menuOption->toArray(),
                        'snapshot_created_at' => now()->toISOString(),
                    ];
                }
            }

            // 合計料金・時間の自動計算
            $bookingOption->total_price = $bookingOption->calculateTotalPrice();
            $bookingOption->total_duration = $bookingOption->calculateTotalDuration();
        });

        // 更新時の処理
        static::updating(function ($bookingOption) {
            // 数量変更時の再計算
            if ($bookingOption->isDirty('quantity')) {
                $bookingOption->total_price = $bookingOption->calculateTotalPrice();
                $bookingOption->total_duration = $bookingOption->calculateTotalDuration();
            }
        });
    }

    /**
     * 店舗との関係性
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * 予約との関係性
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * メニューオプションとの関係性（参照のみ）
     */
    public function menuOption(): BelongsTo
    {
        return $this->belongsTo(MenuOption::class);
    }

    /**
     * 合計料金計算
     */
    public function calculateTotalPrice(): int
    {
        $basePrice = $this->option_price ?? 0;
        $quantity = $this->quantity ?? 1;

        switch ($this->price_type) {
            case self::PRICE_TYPE_FIXED:
                return $basePrice * $quantity;

            case self::PRICE_TYPE_PERCENTAGE:
                // パーセンテージの場合、予約のベース料金を取得
                $booking = $this->booking;
                if ($booking) {
                    $menuBasePrice = $booking->base_price ?? 0;
                    return (int)(($menuBasePrice * $basePrice / 100) * $quantity);
                }
                return 0;

            case self::PRICE_TYPE_PER_HOUR:
                // 時間単価の場合、時間数で計算
                $hours = ($this->option_duration ?? 0) / 60;
                return (int)($basePrice * $hours * $quantity);

            default:
                return $basePrice * $quantity;
        }
    }

    /**
     * 合計時間計算
     */
    public function calculateTotalDuration(): int
    {
        $baseDuration = $this->option_duration ?? 0;
        $quantity = $this->quantity ?? 1;

        return $baseDuration * $quantity;
    }

    /**
     * 料金タイプ情報取得
     */
    public function getPriceTypeInfo(): array
    {
        $priceTypes = self::getPriceTypes();
        return $priceTypes[$this->price_type] ?? [];
    }

    /**
     * オプション詳細情報取得
     */
    public function getOptionInfo(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->option_name,
            'description' => $this->option_description,
            'price' => $this->option_price,
            'duration' => $this->option_duration,
            'price_type' => $this->price_type,
            'price_type_info' => $this->getPriceTypeInfo(),
            'quantity' => $this->quantity,
            'total_price' => $this->total_price,
            'total_duration' => $this->total_duration,
        ];
    }

    /**
     * スナップショット情報取得
     */
    public function getSnapshotInfo(): array
    {
        $optionData = $this->option_data ?? [];
        return $optionData['original_option_data'] ?? [];
    }

    /**
     * スナップショット作成日時取得
     */
    public function getSnapshotCreatedAt(): ?Carbon
    {
        $optionData = $this->option_data ?? [];
        $timestamp = $optionData['snapshot_created_at'] ?? null;

        return $timestamp ? Carbon::parse($timestamp) : null;
    }

    /**
     * 元オプションとの差分チェック
     */
    public function hasChangedFromOriginal(): bool
    {
        if (!$this->menu_option_id) {
            return false;
        }

        $currentOption = $this->menuOption;
        if (!$currentOption) {
            return true; // 元オプションが削除されている
        }

        return $this->option_name !== $currentOption->name ||
            $this->option_price !== $currentOption->price ||
            $this->option_duration !== $currentOption->duration ||
            $this->price_type !== $currentOption->price_type;
    }

    /**
     * 変更内容取得
     */
    public function getChangesFromOriginal(): array
    {
        if (!$this->hasChangedFromOriginal()) {
            return [];
        }

        $currentOption = $this->menuOption;
        if (!$currentOption) {
            return ['status' => 'deleted'];
        }

        $changes = [];

        if ($this->option_name !== $currentOption->name) {
            $changes['name'] = [
                'old' => $this->option_name,
                'new' => $currentOption->name,
            ];
        }

        if ($this->option_price !== $currentOption->price) {
            $changes['price'] = [
                'old' => $this->option_price,
                'new' => $currentOption->price,
            ];
        }

        if ($this->option_duration !== $currentOption->duration) {
            $changes['duration'] = [
                'old' => $this->option_duration,
                'new' => $currentOption->duration,
            ];
        }

        return $changes;
    }

    /**
     * 数量更新
     */
    public function updateQuantity(int $quantity): void
    {
        $this->update(['quantity' => max(1, $quantity)]);
    }

    /**
     * フォーマット済み価格表示
     */
    public function getFormattedPrice(): string
    {
        return '¥' . number_format($this->total_price);
    }

    /**
     * フォーマット済み時間表示
     */
    public function getFormattedDuration(): string
    {
        $duration = $this->total_duration;

        if ($duration < 60) {
            return $duration . '分';
        }

        $hours = floor($duration / 60);
        $minutes = $duration % 60;

        if ($minutes === 0) {
            return $hours . '時間';
        }

        return $hours . '時間' . $minutes . '分';
    }

    /**
     * 検索スコープ: 予約別
     */
    public function scopeByBooking($query, int $bookingId)
    {
        return $query->where('booking_id', $bookingId);
    }

    /**
     * 検索スコープ: メニューオプション別
     */
    public function scopeByMenuOption($query, int $menuOptionId)
    {
        return $query->where('menu_option_id', $menuOptionId);
    }

    /**
     * 検索スコープ: 料金タイプ別
     */
    public function scopeByPriceType($query, string $priceType)
    {
        return $query->where('price_type', $priceType);
    }

    /**
     * 検索スコープ: 料金範囲
     */
    public function scopePriceRange($query, int $minPrice, int $maxPrice)
    {
        return $query->whereBetween('total_price', [$minPrice, $maxPrice]);
    }

    /**
     * 検索スコープ: 時間範囲
     */
    public function scopeDurationRange($query, int $minDuration, int $maxDuration)
    {
        return $query->whereBetween('total_duration', [$minDuration, $maxDuration]);
    }

    /**
     * 検索スコープ: オプション名検索
     */
    public function scopeSearchByName($query, string $keyword)
    {
        return $query->where('option_name', 'like', "%{$keyword}%");
    }

    /**
     * 検索スコープ: 数量範囲
     */
    public function scopeQuantityRange($query, int $minQuantity, int $maxQuantity)
    {
        return $query->whereBetween('quantity', [$minQuantity, $maxQuantity]);
    }

    /**
     * 検索スコープ: 変更されたオプション
     */
    public function scopeChangedFromOriginal($query)
    {
        return $query->whereHas('menuOption', function ($q) {
            $q->whereColumn('menu_options.name', '!=', 'booking_options.option_name')
                ->orWhereColumn('menu_options.price', '!=', 'booking_options.option_price')
                ->orWhereColumn('menu_options.duration', '!=', 'booking_options.option_duration');
        });
    }
}
