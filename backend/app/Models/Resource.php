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
 * リソースモデル - 統一リソース概念
 * 
 * tugical独自の「統一リソース概念」を実装し、
 * staff（スタッフ）、room（部屋）、equipment（設備）、vehicle（車両）を
 * 一つのモデルで統一管理する革新的なアプローチ
 * 
 * 主要機能:
 * - 4種類のリソースタイプ統一管理（staff/room/equipment/vehicle）
 * - 業種別表示名対応（美容師→スタッフ、先生、講師、ガイド等）
 * - 柔軟な属性管理（specialties, skill_level, certifications等）
 * - 稼働時間管理（曜日別・例外日対応）
 * - 効率率・料金差・制約管理
 * - 業種テンプレート連携
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - bookings: 予約（1対多）
 * - business_calendars: 営業カレンダー（1対多、リソース固有）
 * 
 * @property int $id リソースID
 * @property int $store_id 店舗ID
 * @property string $type リソースタイプ（staff/room/equipment/vehicle）
 * @property string $name リソース名
 * @property string $display_name 表示名（業種別カスタマイズ可能）
 * @property array $attributes 属性情報（JSON: specialties, skill_level, certifications等）
 * @property array $working_hours 稼働時間（JSON: 曜日別稼働時間、例外日設定）
 * @property array $constraints 制約設定（JSON: 同時利用制限、予約間隔等）
 * @property float $efficiency_rate 効率率（0.8-1.2: 作業効率を表す倍率）
 * @property int $hourly_rate_diff 時間料金差（円: 指名料等の追加料金）
 * @property int $capacity 収容人数・容量
 * @property array|null $equipment_specs 設備仕様（JSON: 機器スペック、設備詳細）
 * @property array|null $booking_rules 予約ルール（JSON: 予約制限、利用条件）
 * @property string|null $description 説明・特記事項
 * @property string|null $image_url 画像URL
 * @property bool $is_active アクティブ状態
 * @property int $sort_order 表示順序
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $bookings 予約一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<BusinessCalendar> $businessCalendars 営業カレンダー一覧
 */
class Resource extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'resources';

    /**
     * 一括代入可能な属性（tugical_database_design_v1.0.md 準拠）
     */
    protected $fillable = [
        'store_id',
        'type',
        'name',
        'display_name',
        'description',
        'photo_url',
        'attributes',
        'working_hours',
        'efficiency_rate',
        'hourly_rate_diff',
        'capacity',
        'sort_order',
        'is_active',
    ];

    /**
     * 非表示属性（API出力時に除外）
     */
    protected $hidden = [
        // 仕様書では特に非表示フィールドの指定なし
    ];

    /**
     * 属性のキャスト設定（tugical_database_design_v1.0.md 準拠）
     */
    protected $casts = [
        'attributes' => 'array',
        'working_hours' => 'array',
        'efficiency_rate' => 'float',
        'hourly_rate_diff' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    /**
     * リソースタイプの定数
     */
    public const TYPE_STAFF = 'staff';
    public const TYPE_ROOM = 'room';
    public const TYPE_EQUIPMENT = 'equipment';
    public const TYPE_VEHICLE = 'vehicle';

    /**
     * 利用可能リソースタイプ一覧
     */
    public static function getAvailableTypes(): array
    {
        return [
            self::TYPE_STAFF => [
                'name' => 'スタッフ',
                'description' => '美容師、施術者、講師、ガイド等の人的リソース',
                'default_attributes' => ['specialties', 'skill_level', 'certifications', 'languages'],
                'default_constraints' => [
                    'max_concurrent_bookings' => 1,
                    'break_between_bookings' => 15,
                    'advance_booking_limit' => 30,
                ],
                'industry_labels' => [
                    'beauty' => 'スタッフ',
                    'clinic' => '先生',
                    'rental' => 'スタッフ',
                    'school' => '講師',
                    'activity' => 'ガイド',
                ],
                'efficiency_range' => [0.8, 1.2],
            ],
            self::TYPE_ROOM => [
                'name' => '部屋',
                'description' => '個室、教室、会議室等の空間リソース',
                'default_attributes' => ['room_size', 'amenities', 'equipment_list', 'accessibility'],
                'default_constraints' => [
                    'max_concurrent_bookings' => 1,
                    'cleanup_time' => 30,
                    'setup_time' => 15,
                ],
                'industry_labels' => [
                    'beauty' => '個室',
                    'clinic' => '診察室',
                    'rental' => '部屋',
                    'school' => '教室',
                    'activity' => '会場',
                ],
                'efficiency_range' => [1.0, 1.0],
            ],
            self::TYPE_EQUIPMENT => [
                'name' => '設備',
                'description' => '器具、機器、設備等の物的リソース',
                'default_attributes' => ['specifications', 'maintenance_schedule', 'safety_requirements'],
                'default_constraints' => [
                    'max_concurrent_bookings' => 1,
                    'maintenance_interval' => 480,
                    'training_required' => true,
                ],
                'industry_labels' => [
                    'beauty' => '器具',
                    'clinic' => '医療機器',
                    'rental' => '設備',
                    'school' => '教材',
                    'activity' => '機材',
                ],
                'efficiency_range' => [0.9, 1.1],
            ],
            self::TYPE_VEHICLE => [
                'name' => '車両',
                'description' => '送迎車、レンタカー等の移動リソース',
                'default_attributes' => ['vehicle_type', 'seating_capacity', 'fuel_type', 'license_required'],
                'default_constraints' => [
                    'max_concurrent_bookings' => 1,
                    'fuel_break' => 60,
                    'inspection_required' => true,
                ],
                'industry_labels' => [
                    'beauty' => '送迎車',
                    'clinic' => '送迎車',
                    'rental' => 'レンタカー',
                    'school' => '送迎バス',
                    'activity' => '送迎車',
                ],
                'efficiency_range' => [1.0, 1.0],
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
        static::creating(function ($resource) {
            if (!$resource->store_id && auth()->check()) {
                $resource->store_id = auth()->user()->store_id;
            }

            // デフォルト値設定
            if (!$resource->display_name) {
                $resource->display_name = $resource->name;
            }

            // デフォルト属性設定
            if (!$resource->attributes && $resource->type) {
                $resource->attributes = self::getDefaultAttributes($resource->type);
            }

            // デフォルト制約設定は個別フィールドで管理
            // 新しいデータベース構造では constraints フィールドは使用しない

            // デフォルト効率率設定
            if (!$resource->efficiency_rate) {
                $resource->efficiency_rate = 1.0;
            }

            // デフォルト料金差設定
            if (!$resource->hourly_rate_diff) {
                $resource->hourly_rate_diff = 0;
            }

            // 仕様書では capacity フィールドは使用しない

            // デフォルトアクティブ状態
            $resource->is_active = $resource->is_active ?? true;

            // デフォルト表示順序
            if (!$resource->sort_order) {
                $maxSort = self::where('store_id', $resource->store_id)
                              ->where('type', $resource->type)
                              ->max('sort_order') ?? 0;
                $resource->sort_order = $maxSort + 10;
            }
        });

        // 更新時の処理
        static::updating(function ($resource) {
            // 表示名が空の場合、名前をコピー
            if (empty($resource->display_name)) {
                $resource->display_name = $resource->name;
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
     * 予約との関係性
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * 営業カレンダーとの関係性（リソース固有）
     */
    public function businessCalendars(): HasMany
    {
        return $this->hasMany(BusinessCalendar::class);
    }

    /**
     * リソースタイプ情報取得
     * 
     * @return array リソースタイプ詳細情報
     */
    public function getTypeInfo(): array
    {
        $types = self::getAvailableTypes();
        return $types[$this->type] ?? [];
    }

    /**
     * 業種別表示名取得
     * 
     * @return string 業種に応じたリソース表示名
     */
    public function getIndustryDisplayName(): string
    {
        $typeInfo = $this->getTypeInfo();
        $industryLabels = $typeInfo['industry_labels'] ?? [];
        
        // 店舗の業種を取得
        $industryType = $this->store->industry_type ?? 'beauty';
        
        return $industryLabels[$industryType] ?? $this->display_name ?? $this->name;
    }

    /**
     * 稼働中チェック
     * 
     * @param Carbon|null $dateTime 確認する日時（nullの場合は現在時刻）
     * @return bool 稼働中の場合true
     */
    public function isWorkingAt(?Carbon $dateTime = null): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $dateTime = $dateTime ?? now($this->store->timezone ?? 'Asia/Tokyo');
        $dayOfWeek = strtolower($dateTime->format('l'));
        
        $workingHours = $this->working_hours ?? [];
        $todayHours = $workingHours[$dayOfWeek] ?? null;
        
        if (!$todayHours || isset($todayHours['off'])) {
            return false;
        }

        // 例外日チェック
        $dateString = $dateTime->format('Y-m-d');
        $exceptions = $workingHours['exceptions'] ?? [];
        
        if (isset($exceptions[$dateString])) {
            $exceptionHours = $exceptions[$dateString];
            if (isset($exceptionHours['off']) && $exceptionHours['off']) {
                return false;
            }
            $todayHours = $exceptionHours;
        }

        if (!isset($todayHours['start']) || !isset($todayHours['end'])) {
            return false;
        }

        $startTime = Carbon::createFromFormat('H:i', $todayHours['start'], $dateTime->timezone);
        $endTime = Carbon::createFromFormat('H:i', $todayHours['end'], $dateTime->timezone);
        
        return $dateTime->between($startTime, $endTime);
    }

    /**
     * 次回稼働時間取得
     * 
     * @param Carbon|null $fromDateTime 基準日時
     * @return Carbon|null 次回稼働開始時刻
     */
    public function getNextWorkingTime(?Carbon $fromDateTime = null): ?Carbon
    {
        $fromDateTime = $fromDateTime ?? now($this->store->timezone ?? 'Asia/Tokyo');
        
        for ($i = 0; $i < 14; $i++) { // 2週間先まで確認
            $checkDate = $fromDateTime->copy()->addDays($i);
            $dayOfWeek = strtolower($checkDate->format('l'));
            
            $workingHours = $this->working_hours ?? [];
            $dayHours = $workingHours[$dayOfWeek] ?? null;
            
            if (!$dayHours || isset($dayHours['off'])) {
                continue;
            }

            // 例外日チェック
            $dateString = $checkDate->format('Y-m-d');
            $exceptions = $workingHours['exceptions'] ?? [];
            
            if (isset($exceptions[$dateString])) {
                $exceptionHours = $exceptions[$dateString];
                if (isset($exceptionHours['off']) && $exceptionHours['off']) {
                    continue;
                }
                $dayHours = $exceptionHours;
            }

            if (isset($dayHours['start'])) {
                $startTime = $checkDate->setTimeFromTimeString($dayHours['start']);
                
                if ($startTime->isFuture() || ($i === 0 && $startTime->isToday() && $startTime->gt($fromDateTime))) {
                    return $startTime;
                }
            }
        }
        
        return null;
    }

    /**
     * 効率率を考慮した実際の作業時間計算
     * 
     * @param int $baseDurationMinutes 基本作業時間（分）
     * @return int 効率率を考慮した実際の作業時間（分）
     */
    public function calculateAdjustedDuration(int $baseDurationMinutes): int
    {
        $adjustedDuration = $baseDurationMinutes * $this->efficiency_rate;
        return (int) round($adjustedDuration);
    }

    /**
     * 料金差を考慮した追加料金計算
     * 
     * @param int $baseDurationMinutes 基本作業時間（分）
     * @return int 追加料金（円）
     */
    public function calculateAdditionalFee(int $baseDurationMinutes): int
    {
        if ($this->hourly_rate_diff <= 0) {
            return 0;
        }

        $hours = $baseDurationMinutes / 60;
        return (int) round($hours * $this->hourly_rate_diff);
    }

    /**
     * 利用可能性チェック
     * 
     * @param Carbon $startTime 開始時刻
     * @param Carbon $endTime 終了時刻
     * @param int|null $excludeBookingId 除外する予約ID
     * @return bool 利用可能な場合true
     */
    public function isAvailableAt(Carbon $startTime, Carbon $endTime, ?int $excludeBookingId = null): bool
    {
        // アクティブ状態チェック
        if (!$this->is_active) {
            return false;
        }

        // 稼働時間チェック
        if (!$this->isWorkingAt($startTime) || !$this->isWorkingAt($endTime)) {
            return false;
        }

        // 予約競合チェック
        return !$this->hasBookingConflict($startTime, $endTime, $excludeBookingId);
    }

    /**
     * 予約競合チェック
     * 
     * @param Carbon $startTime 開始時刻
     * @param Carbon $endTime 終了時刻
     * @param int|null $excludeBookingId 除外する予約ID
     * @return bool 競合がある場合true
     */
    public function hasBookingConflict(Carbon $startTime, Carbon $endTime, ?int $excludeBookingId = null): bool
    {
        $query = $this->bookings()
            ->whereDate('booking_date', $startTime->format('Y-m-d'))
            ->whereIn('status', ['confirmed', 'pending'])
            ->where(function($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime->format('H:i'), $endTime->format('H:i')])
                  ->orWhereBetween('end_time', [$startTime->format('H:i'), $endTime->format('H:i')])
                  ->orWhere(function($subQ) use ($startTime, $endTime) {
                      $subQ->where('start_time', '<=', $startTime->format('H:i'))
                           ->where('end_time', '>=', $endTime->format('H:i'));
                  });
            });

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->exists();
    }

    /**
     * 属性値取得
     * 
     * @param string $key 属性キー
     * @param mixed $default デフォルト値
     * @return mixed 属性値
     */
    public function getCustomAttributeValue(string $key, $default = null)
    {
        $attributes = $this->attributes ?? [];
        return $attributes[$key] ?? $default;
    }

    /**
     * 属性値設定
     * 
     * @param string $key 属性キー
     * @param mixed $value 属性値
     * @return void
     */
    public function setAttributeValue(string $key, $value): void
    {
        $attributes = $this->attributes ?? [];
        $attributes[$key] = $value;
        $this->attributes = $attributes;
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
     * デフォルト属性取得
     * 
     * @param string $type リソースタイプ
     * @return array デフォルト属性
     */
    private static function getDefaultAttributes(string $type): array
    {
        $types = self::getAvailableTypes();
        $typeInfo = $types[$type] ?? [];
        $defaultAttrs = $typeInfo['default_attributes'] ?? [];

        $attributes = [];
        foreach ($defaultAttrs as $attr) {
            $attributes[$attr] = null;
        }

        return $attributes;
    }

    /**
     * デフォルト制約取得
     * 
     * @param string $type リソースタイプ
     * @return array デフォルト制約
     */
    private static function getDefaultConstraints(string $type): array
    {
        $types = self::getAvailableTypes();
        $typeInfo = $types[$type] ?? [];
        
        return $typeInfo['default_constraints'] ?? [];
    }

    /**
     * 検索スコープ: タイプ別
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * 検索スコープ: アクティブリソース
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: 表示順序
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * 検索スコープ: 稼働中
     */
    public function scopeWorking($query, ?Carbon $dateTime = null)
    {
        return $query->active()->where(function($q) use ($dateTime) {
            // この実装では簡易チェックのみ実行（詳細は isWorkingAt メソッドで）
            $q->whereNotNull('working_hours');
        });
    }

    /**
     * 検索スコープ: 容量以上（仕様書では capacity フィールドなし）
     */
    public function scopeWithCapacity($query, int $minCapacity)
    {
        // 仕様書通りの構造では capacity フィールドは存在しない
        // 必要に応じて attributes JSON 内の capacity を使用
        return $query->whereJsonContains('attributes->capacity', ['>=', $minCapacity]);
    }

    /**
     * 検索スコープ: 属性で絞り込み
     */
    public function scopeWithAttribute($query, string $attributeKey, $attributeValue = null)
    {
        if ($attributeValue === null) {
            return $query->whereJsonContains('attributes', [$attributeKey]);
        }
        
        return $query->where("attributes->{$attributeKey}", $attributeValue);
    }

    /**
     * 検索スコープ: 効率率範囲
     */
    public function scopeEfficiencyRange($query, float $min = 0.0, float $max = 2.0)
    {
        return $query->whereBetween('efficiency_rate', [$min, $max]);
    }
} 