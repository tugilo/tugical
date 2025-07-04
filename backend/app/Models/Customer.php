<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * 顧客モデル - 顧客管理
 * 
 * 各店舗の顧客情報を管理し、LINE連携・ロイヤリティ・予約履歴を統合管理
 * 個人情報の暗号化・セキュリティ・プライバシー保護を最優先に実装
 * 
 * 主要機能:
 * - LINE連携による自動顧客登録
 * - ロイヤリティランク自動判定（予約回数・金額ベース）
 * - 個人情報暗号化保存
 * - 予約履歴・統計情報管理
 * - キャンセル率・ノーショー率追跡
 * - カスタマーノート・タグ管理
 * 
 * セキュリティ機能:
 * - 個人情報自動暗号化（phone, email, address）
 * - アクセスログ記録
 * - データ保持期間管理
 * - GDPR準拠削除機能
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - bookings: 予約履歴（1対多）
 * 
 * @property int $id 顧客ID
 * @property int $store_id 店舗ID
 * @property string|null $line_user_id LINE ユーザーID
 * @property string $name 顧客名
 * @property string|null $name_kana 顧客名（カナ）
 * @property string|null $phone 電話番号（暗号化）
 * @property string|null $email メールアドレス（暗号化）
 * @property string|null $address 住所（暗号化）
 * @property string|null $birthday 生年月日
 * @property string|null $gender 性別（male/female/other/not_specified）
 * @property string $loyalty_rank ロイヤリティランク（bronze/silver/gold/platinum/diamond）
 * @property int $total_bookings 総予約回数
 * @property int $total_spent 総利用金額（円）
 * @property int $no_show_count 無断キャンセル回数
 * @property Carbon|null $last_booking_date 最終予約日
 * @property array|null $preferences 顧客設定（JSON: 通知設定、言語設定等）
 * @property array|null $tags タグ（JSON: 顧客分類用）
 * @property string|null $notes スタッフノート
 * @property string|null $line_profile_picture_url LINE プロフィール画像URL
 * @property bool $is_active アクティブ状態
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $bookings 予約履歴一覧
 */
class Customer extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'customers';

    /**
     * 一括代入可能な属性
     */
    protected $fillable = [
        'store_id',
        'line_user_id',
        'line_display_name',
        'line_picture_url',
        'name',
        'name_kana',
        'phone',
        'email',
        'birthday',
        'gender',
        'address',
        'notes',
        'allergies',
        'preferences',
        'loyalty_rank',
        'total_bookings',
        'total_spent',
        'no_show_count',
        'last_no_show_at',
        'is_restricted',
        'restriction_until',
        'is_active',
        'notification_settings',
        'first_visit_at',
        'last_visit_at',
    ];

    /**
     * 非表示属性（API出力時に除外）
     * 個人情報保護のため
     */
    protected $hidden = [
        // 暗号化フィールドは CustomerResource で適切に制御するため、ここでは除外しない
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'preferences' => 'array',
        'notification_settings' => 'array',
        'total_bookings' => 'integer',
        'total_spent' => 'integer',
        'no_show_count' => 'integer',
        'is_restricted' => 'boolean',
        'is_active' => 'boolean',
        'birthday' => 'date',
        'last_no_show_at' => 'datetime',
        'restriction_until' => 'datetime',
        'first_visit_at' => 'datetime',
        'last_visit_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * 性別の定数
     */
    public const GENDER_MALE = 'male';
    public const GENDER_FEMALE = 'female';
    public const GENDER_OTHER = 'other';
    public const GENDER_NOT_SPECIFIED = 'not_specified';

    /**
     * ロイヤリティランクの定数
     */
    public const LOYALTY_NEW = 'new';
    public const LOYALTY_REGULAR = 'regular';
    public const LOYALTY_VIP = 'vip';
    public const LOYALTY_PREMIUM = 'premium';

    /**
     * 暗号化対象フィールド
     */
    protected $encrypted = ['phone', 'email', 'address'];

    /**
     * ロイヤリティランク設定
     */
    public static function getLoyaltyRankSettings(): array
    {
        return [
            self::LOYALTY_NEW => [
                'name' => 'New',
                'min_bookings' => 0,
                'min_amount' => 0,
                'benefits' => ['基本サービス'],
                'color' => '#CD7F32',
                'discount_rate' => 0,
            ],
            self::LOYALTY_REGULAR => [
                'name' => 'Regular',
                'min_bookings' => 5,
                'min_amount' => 20000,
                'benefits' => ['予約優先', '特別クーポン'],
                'color' => '#C0C0C0',
                'discount_rate' => 3,
            ],
            self::LOYALTY_VIP => [
                'name' => 'VIP',
                'min_bookings' => 15,
                'min_amount' => 60000,
                'benefits' => ['予約優先', '特別クーポン', '誕生日特典'],
                'color' => '#FFD700',
                'discount_rate' => 5,
            ],
            self::LOYALTY_PREMIUM => [
                'name' => 'Premium',
                'min_bookings' => 30,
                'min_amount' => 120000,
                'benefits' => ['最優先予約', '専用クーポン', '誕生日特典', 'VIP待遇'],
                'color' => '#E5E4E2',
                'discount_rate' => 8,
            ],
        ];
    }

    /**
     * 利用可能性別一覧
     */
    public static function getAvailableGenders(): array
    {
        return [
            self::GENDER_MALE => '男性',
            self::GENDER_FEMALE => '女性',
            self::GENDER_OTHER => 'その他',
            self::GENDER_NOT_SPECIFIED => '未指定',
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
        static::creating(function ($customer) {
            if (!$customer->store_id && auth()->check()) {
                $customer->store_id = auth()->user()->store_id;
            }

            // デフォルト値設定
            $customer->loyalty_rank = $customer->loyalty_rank ?? self::LOYALTY_NEW;
            $customer->total_bookings = $customer->total_bookings ?? 0;
            $customer->total_spent = $customer->total_spent ?? 0;
            $customer->no_show_count = $customer->no_show_count ?? 0;
            $customer->is_active = $customer->is_active ?? true;
        });

        // 更新時の処理
        static::updating(function ($customer) {
            // ロイヤリティランク自動更新
            $customer->updateLoyaltyRank();
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
     * 予約との関係性
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class)->orderBy('booking_date', 'desc');
    }

    /**
     * 電話番号の暗号化ミューテータ
     */
    public function setPhoneAttribute($value)
    {
        if (!empty($value)) {
            $this->attributes['phone'] = encrypt($value);
        } else {
            $this->attributes['phone'] = null;
        }
    }

    /**
     * メールアドレスの暗号化ミューテータ
     */
    public function setEmailAttribute($value)
    {
        if (!empty($value)) {
            $this->attributes['email'] = encrypt($value);
        } else {
            $this->attributes['email'] = null;
        }
    }

    /**
     * 住所の暗号化ミューテータ
     */
    public function setAddressAttribute($value)
    {
        if (!empty($value)) {
            $this->attributes['address'] = encrypt($value);
        } else {
            $this->attributes['address'] = null;
        }
    }

    /**
     * ロイヤリティランク自動更新
     */
    public function updateLoyaltyRank(): void
    {
        $currentRank = $this->calculateLoyaltyRank();

        if ($currentRank !== $this->loyalty_rank) {
            $this->loyalty_rank = $currentRank;

            // ランクアップ通知（後でイベント化）
            \Log::info("Customer loyalty rank updated", [
                'customer_id' => $this->id,
                'old_rank' => $this->getOriginal('loyalty_rank'),
                'new_rank' => $currentRank,
            ]);
        }
    }

    /**
     * ロイヤリティランク計算
     * 
     * @return string 計算されたロイヤリティランク
     */
    public function calculateLoyaltyRank(): string
    {
        $settings = self::getLoyaltyRankSettings();
        $currentRank = self::LOYALTY_NEW;

        foreach ($settings as $rank => $config) {
            if (
                $this->total_bookings >= $config['min_bookings'] &&
                $this->total_spent >= $config['min_amount']
            ) {
                $currentRank = $rank;
            }
        }

        return $currentRank;
    }

    /**
     * ロイヤリティランク情報取得
     * 
     * @return array ランク詳細情報
     */
    public function getLoyaltyRankInfo(): array
    {
        $settings = self::getLoyaltyRankSettings();
        return $settings[$this->loyalty_rank] ?? $settings[self::LOYALTY_NEW];
    }

    /**
     * 次のランクまでの進捗取得
     * 
     * @return array|null 次のランク情報
     */
    public function getNextRankProgress(): ?array
    {
        $settings = self::getLoyaltyRankSettings();
        $ranks = array_keys($settings);
        $currentIndex = array_search($this->loyalty_rank, $ranks);

        if ($currentIndex === false || $currentIndex >= count($ranks) - 1) {
            return null; // 最高ランクの場合
        }

        $nextRank = $ranks[$currentIndex + 1];
        $nextConfig = $settings[$nextRank];

        return [
            'rank' => $nextRank,
            'name' => $nextConfig['name'],
            'required_bookings' => $nextConfig['min_bookings'],
            'required_amount' => $nextConfig['min_amount'],
            'bookings_progress' => min(100, ($this->total_bookings / $nextConfig['min_bookings']) * 100),
            'amount_progress' => min(100, ($this->total_spent / $nextConfig['min_amount']) * 100),
            'remaining_bookings' => max(0, $nextConfig['min_bookings'] - $this->total_bookings),
            'remaining_amount' => max(0, $nextConfig['min_amount'] - $this->total_spent),
        ];
    }

    /**
     * キャンセル率計算
     * 
     * @return float キャンセル率（0-100）
     */
    public function getCancellationRate(): float
    {
        // NOTE: cancelled_bookings カラムが存在しないため、一旦0を返す
        return 0.0;
    }

    /**
     * ノーショー率計算
     * 
     * @return float ノーショー率（0-100）
     */
    public function getNoShowRate(): float
    {
        if ($this->total_bookings === 0) {
            return 0.0;
        }

        return round(($this->no_show_count / $this->total_bookings) * 100, 2);
    }

    /**
     * 平均利用金額計算
     * 
     * @return int 平均利用金額（円）
     */
    public function getAverageBookingAmount(): int
    {
        if ($this->total_bookings === 0) {
            return 0;
        }

        return (int) round($this->total_spent / $this->total_bookings);
    }

    /**
     * 最終来店からの経過日数
     * 
     * @return int|null 経過日数
     */
    public function getDaysSinceLastBooking(): ?int
    {
        if (!$this->last_visit_at) {
            return null;
        }

        return now()->diffInDays($this->last_visit_at);
    }

    /**
     * LINE連携状態チェック
     * 
     * @return bool LINE連携済みの場合true
     */
    public function isLinkedToLine(): bool
    {
        return !empty($this->line_user_id);
    }

    /**
     * 年齢計算
     * 
     * @return int|null 年齢
     */
    public function getAge(): ?int
    {
        if (!$this->birthday) {
            return null;
        }

        return now()->diffInYears($this->birthday);
    }

    /**
     * 今月誕生日チェック
     * 
     * @return bool 今月誕生日の場合true
     */
    public function isBirthdayThisMonth(): bool
    {
        if (!$this->birthday) {
            return false;
        }

        return $this->birthday->format('m') === now()->format('m');
    }

    /**
     * アクティブ顧客チェック
     * 
     * @param int $months 期間（月）
     * @return bool アクティブな場合true
     */
    public function isActiveCustomer(int $months = 6): bool
    {
        if (!$this->last_booking_date) {
            return false;
        }

        $threshold = now()->subMonths($months);
        return $this->last_booking_date->gte($threshold);
    }

    /**
     * VIP顧客チェック
     * 
     * @return bool VIP顧客の場合true
     */
    public function isVipCustomer(): bool
    {
        return in_array($this->loyalty_rank, [self::LOYALTY_PREMIUM]);
    }

    /**
     * 顧客統計取得
     * 
     * @return array 統計情報
     */
    public function getStatistics(): array
    {
        return [
            'total_bookings' => $this->total_bookings,
            'total_spent' => $this->total_spent,
            'average_amount' => $this->getAverageBookingAmount(),
            'cancellation_rate' => $this->getCancellationRate(),
            'no_show_rate' => $this->getNoShowRate(),
            'loyalty_rank' => $this->getLoyaltyRankInfo(),
            'next_rank_progress' => $this->getNextRankProgress(),
            'days_since_last_booking' => $this->getDaysSinceLastBooking(),
            'is_active' => $this->isActiveCustomer(),
            'is_vip' => $this->isVipCustomer(),
            'age' => $this->getAge(),
            'is_birthday_month' => $this->isBirthdayThisMonth(),
        ];
    }

    /**
     * 設定値取得
     * 
     * @param string $key 設定キー
     * @param mixed $default デフォルト値
     * @return mixed 設定値
     */
    public function getPreference(string $key, $default = null)
    {
        $preferences = $this->preferences ?? [];
        return $preferences[$key] ?? $default;
    }

    /**
     * 設定値更新
     * 
     * @param string $key 設定キー
     * @param mixed $value 設定値
     */
    public function setPreference(string $key, $value): void
    {
        $preferences = $this->preferences ?? [];
        $preferences[$key] = $value;
        $this->preferences = $preferences;
    }

    /**
     * 電話番号アクセサ
     */
    public function getPhoneAttribute($value)
    {
        if (empty($value)) {
            return $value;
        }

        try {
            // 暗号化されたデータかチェック
            if (strpos($value, 'eyJpdiI6') === 0) {
                return decrypt($value);
            }
            return $value;
        } catch (\Exception $e) {
            \Log::warning("Failed to decrypt phone in accessor", [
                'customer_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    /**
     * メールアドレスアクセサ
     */
    public function getEmailAttribute($value)
    {
        if (empty($value)) {
            return $value;
        }

        try {
            // 暗号化されたデータかチェック
            if (strpos($value, 'eyJpdiI6') === 0) {
                return decrypt($value);
            }
            return $value;
        } catch (\Exception $e) {
            \Log::warning("Failed to decrypt email in accessor", [
                'customer_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    /**
     * 住所アクセサ
     */
    public function getAddressAttribute($value)
    {
        if (empty($value)) {
            return $value;
        }

        try {
            // 暗号化されたデータかチェック
            if (strpos($value, 'eyJpdiI6') === 0) {
                return decrypt($value);
            }
            return $value;
        } catch (\Exception $e) {
            \Log::warning("Failed to decrypt address in accessor", [
                'customer_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return '';
        }
    }

    /**
     * アクティブ顧客スコープ
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: LINE連携済み
     */
    public function scopeLinkedToLine($query)
    {
        return $query->whereNotNull('line_user_id');
    }

    /**
     * 検索スコープ: ロイヤリティランク別
     */
    public function scopeByLoyaltyRank($query, string $rank)
    {
        return $query->where('loyalty_rank', $rank);
    }

    /**
     * 検索スコープ: VIP顧客
     */
    public function scopeVip($query)
    {
        return $query->whereIn('loyalty_rank', [self::LOYALTY_PREMIUM]);
    }

    /**
     * 検索スコープ: 今月誕生日
     */
    public function scopeBirthdayThisMonth($query)
    {
        $currentMonth = now()->format('m');
        return $query->whereRaw('MONTH(birthday) = ?', [$currentMonth]);
    }

    /**
     * 検索スコープ: アクティブ期間内
     */
    public function scopeActiveWithin($query, int $months = 6)
    {
        $threshold = now()->subMonths($months);
        return $query->where('last_booking_date', '>=', $threshold);
    }

    /**
     * 検索スコープ: 予約回数範囲
     */
    public function scopeBookingCountRange($query, int $min, int $max)
    {
        return $query->whereBetween('total_bookings', [$min, $max]);
    }

    /**
     * 検索スコープ: 利用金額範囲
     */
    public function scopeAmountRange($query, int $min, int $max)
    {
        return $query->whereBetween('total_spent', [$min, $max]);
    }

    /**
     * 検索スコープ: キーワード検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('name', 'like', "%{$keyword}%")
                ->orWhere('name_kana', 'like', "%{$keyword}%")
                ->orWhere('notes', 'like', "%{$keyword}%");
        });
    }

    /**
     * 検索スコープ: 性別
     */
    public function scopeByGender($query, string $gender)
    {
        return $query->where('gender', $gender);
    }

    /**
     * 検索スコープ: 年齢範囲
     */
    public function scopeAgeRange($query, int $minAge, int $maxAge)
    {
        $maxBirthday = now()->subYears($minAge)->format('Y-m-d');
        $minBirthday = now()->subYears($maxAge + 1)->format('Y-m-d');

        return $query->whereBetween('birthday', [$minBirthday, $maxBirthday]);
    }
}
