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
 * 店舗モデル - 店舗管理
 * 
 * tugicalサービスの各店舗を管理するモデル
 * LINE連携、業種テンプレート、営業設定を統合管理
 * 
 * 主要機能:
 * - LINE連携設定（チャンネル、リッチメニュー、自動応答）
 * - 業種テンプレート適用（beauty/clinic/rental/school/activity）
 * - 営業時間・定休日・特別営業管理
 * - 予約ルール・制約設定
 * - スタッフ・リソース・メニュー管理
 * 
 * 関連テーブル:
 * - tenant: 事業者（多対1）
 * - staff_accounts: スタッフアカウント（1対多）
 * - resources: リソース（1対多）
 * - menus: メニュー（1対多）
 * - customers: 顧客（1対多）
 * - bookings: 予約（1対多）
 * - business_calendars: 営業カレンダー（1対多）
 * - notifications: 通知（1対多）
 * 
 * @property int $id 店舗ID
 * @property int $tenant_id テナントID
 * @property string $name 店舗名
 * @property string $slug URLスラッグ（一意識別子）
 * @property string $industry_type 業種タイプ（beauty/clinic/rental/school/activity）
 * @property array $industry_settings 業種固有設定（JSON: 表示名、制約、機能）
 * @property array $line_integration LINE連携設定（JSON: チャンネル情報、LIFF設定）
 * @property array $business_hours 営業時間（JSON: 曜日別営業時間）
 * @property array $booking_rules 予約ルール（JSON: 予約制限、キャンセル規定）
 * @property array $notification_settings 通知設定（JSON: 自動通知、テンプレート）
 * @property string|null $address 住所
 * @property string|null $phone 電話番号
 * @property string|null $email メールアドレス
 * @property string|null $website ウェブサイトURL
 * @property array|null $social_links SNSリンク（JSON: Instagram, Facebook等）
 * @property string $timezone タイムゾーン
 * @property string $locale ロケール
 * @property string $currency 通貨
 * @property string $status ステータス（active/inactive/maintenance）
 * @property Carbon|null $last_activity_at 最終活動日時
 * @property Carbon|null $deleted_at 削除日時（ソフトデリート）
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Tenant $tenant 事業者
 * @property-read \Illuminate\Database\Eloquent\Collection<StaffAccount> $staffAccounts スタッフアカウント一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Resource> $resources リソース一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Menu> $menus メニュー一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Customer> $customers 顧客一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Booking> $bookings 予約一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<BusinessCalendar> $businessCalendars 営業カレンダー一覧
 * @property-read \Illuminate\Database\Eloquent\Collection<Notification> $notifications 通知一覧
 */
class Store extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * テーブル名
     */
    protected $table = 'stores';

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
        'line_integration',
        'notification_settings',
    ];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'industry_settings' => 'array',
        'line_integration' => 'array',
        'business_hours' => 'array',
        'booking_rules' => 'array',
        'notification_settings' => 'array',
        'time_slot_settings' => 'array',
        'social_links' => 'array',
        'last_activity_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * 業種タイプの定数
     */
    public const INDUSTRY_BEAUTY = 'beauty';
    public const INDUSTRY_CLINIC = 'clinic';
    public const INDUSTRY_RENTAL = 'rental';
    public const INDUSTRY_SCHOOL = 'school';
    public const INDUSTRY_ACTIVITY = 'activity';

    /**
     * ステータスの定数
     */
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_MAINTENANCE = 'maintenance';

    /**
     * 業種テンプレート一覧
     */
    public static function getIndustryTemplates(): array
    {
        return [
            self::INDUSTRY_BEAUTY => [
                'name' => '美容・ネイル',
                'resource_label' => 'スタッフ',
                'customer_label' => 'お客様',
                'booking_label' => 'ご予約',
                'features' => ['staff_assignment', 'skill_level', 'gender_preference'],
                'booking_constraints' => [
                    'advance_booking_days' => 30,
                    'same_day_booking' => true,
                    'cancel_policy_hours' => 24,
                    'no_show_policy' => true,
                ],
                'default_business_hours' => [
                    'monday' => ['open' => '09:00', 'close' => '19:00'],
                    'tuesday' => ['open' => '09:00', 'close' => '19:00'],
                    'wednesday' => ['open' => '09:00', 'close' => '19:00'],
                    'thursday' => ['open' => '09:00', 'close' => '19:00'],
                    'friday' => ['open' => '09:00', 'close' => '19:00'],
                    'saturday' => ['open' => '09:00', 'close' => '18:00'],
                    'sunday' => ['open' => '10:00', 'close' => '17:00'],
                ],
            ],
            self::INDUSTRY_CLINIC => [
                'name' => 'クリニック・治療院',
                'resource_label' => '先生',
                'customer_label' => '患者様',
                'booking_label' => '診療予約',
                'features' => ['doctor_assignment', 'recurring_appointments', 'medical_history'],
                'booking_constraints' => [
                    'advance_booking_days' => 60,
                    'same_day_booking' => false,
                    'cancel_policy_hours' => 48,
                    'no_show_policy' => true,
                ],
                'default_business_hours' => [
                    'monday' => ['open' => '09:00', 'close' => '18:00'],
                    'tuesday' => ['open' => '09:00', 'close' => '18:00'],
                    'wednesday' => ['open' => '09:00', 'close' => '12:00'],
                    'thursday' => ['open' => '09:00', 'close' => '18:00'],
                    'friday' => ['open' => '09:00', 'close' => '18:00'],
                    'saturday' => ['open' => '09:00', 'close' => '15:00'],
                    'sunday' => ['closed' => true],
                ],
            ],
            self::INDUSTRY_RENTAL => [
                'name' => 'レンタルスペース',
                'resource_label' => '部屋',
                'customer_label' => 'ご利用者様',
                'booking_label' => '利用予約',
                'features' => ['room_capacity', 'equipment_selection', 'hourly_rates'],
                'booking_constraints' => [
                    'advance_booking_days' => 90,
                    'same_day_booking' => true,
                    'cancel_policy_hours' => 72,
                    'no_show_policy' => false,
                ],
                'default_business_hours' => [
                    'monday' => ['open' => '08:00', 'close' => '22:00'],
                    'tuesday' => ['open' => '08:00', 'close' => '22:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '22:00'],
                    'thursday' => ['open' => '08:00', 'close' => '22:00'],
                    'friday' => ['open' => '08:00', 'close' => '22:00'],
                    'saturday' => ['open' => '08:00', 'close' => '22:00'],
                    'sunday' => ['open' => '08:00', 'close' => '22:00'],
                ],
            ],
            self::INDUSTRY_SCHOOL => [
                'name' => 'スクール・教室',
                'resource_label' => '講師',
                'customer_label' => '生徒様',
                'booking_label' => '授業予約',
                'features' => ['instructor_assignment', 'class_capacity', 'parent_booking'],
                'booking_constraints' => [
                    'advance_booking_days' => 14,
                    'same_day_booking' => false,
                    'cancel_policy_hours' => 24,
                    'no_show_policy' => true,
                ],
                'default_business_hours' => [
                    'monday' => ['open' => '10:00', 'close' => '21:00'],
                    'tuesday' => ['open' => '10:00', 'close' => '21:00'],
                    'wednesday' => ['open' => '10:00', 'close' => '21:00'],
                    'thursday' => ['open' => '10:00', 'close' => '21:00'],
                    'friday' => ['open' => '10:00', 'close' => '21:00'],
                    'saturday' => ['open' => '09:00', 'close' => '18:00'],
                    'sunday' => ['open' => '09:00', 'close' => '18:00'],
                ],
            ],
            self::INDUSTRY_ACTIVITY => [
                'name' => 'アクティビティ・体験',
                'resource_label' => 'ガイド',
                'customer_label' => '参加者様',
                'booking_label' => '体験予約',
                'features' => ['guide_assignment', 'group_capacity', 'weather_dependency'],
                'booking_constraints' => [
                    'advance_booking_days' => 30,
                    'same_day_booking' => true,
                    'cancel_policy_hours' => 48,
                    'no_show_policy' => false,
                ],
                'default_business_hours' => [
                    'monday' => ['open' => '09:00', 'close' => '17:00'],
                    'tuesday' => ['open' => '09:00', 'close' => '17:00'],
                    'wednesday' => ['open' => '09:00', 'close' => '17:00'],
                    'thursday' => ['open' => '09:00', 'close' => '17:00'],
                    'friday' => ['open' => '09:00', 'close' => '17:00'],
                    'saturday' => ['open' => '08:00', 'close' => '18:00'],
                    'sunday' => ['open' => '08:00', 'close' => '18:00'],
                ],
            ],
        ];
    }

    /**
     * モデルの起動時処理
     * 
     * 注意: Storeモデルは tenant_id で分離されるため、TenantScopeは適用しない
     * 代わりにTenantとの関係でテナント分離を実現
     */
    protected static function booted()
    {
        // Storeモデルは tenant_id で分離されるため、TenantScopeは適用しない

        // 作成時のデフォルト値設定
        static::creating(function ($store) {
            // デフォルト業種設定適用
            if (!$store->industry_settings && $store->industry_type) {
                $store->industry_settings = self::getDefaultIndustrySettings($store->industry_type);
            }

            // デフォルト営業時間設定
            if (!$store->business_hours && $store->industry_type) {
                $template = self::getIndustryTemplates()[$store->industry_type] ?? [];
                $store->business_hours = $template['default_business_hours'] ?? [];
            }

            // デフォルト予約ルール設定
            if (!$store->booking_rules && $store->industry_type) {
                $template = self::getIndustryTemplates()[$store->industry_type] ?? [];
                $store->booking_rules = $template['booking_constraints'] ?? [];
            }

            // デフォルト値設定
            $store->timezone = $store->timezone ?? 'Asia/Tokyo';
            $store->locale = $store->locale ?? 'ja';
            $store->currency = $store->currency ?? 'JPY';
            $store->status = $store->status ?? self::STATUS_ACTIVE;

            // URLスラッグの自動生成
            if (!$store->slug) {
                $store->slug = self::generateUniqueSlug($store->name);
            }
        });

        // 更新時の処理
        static::updating(function ($store) {
            // storesテーブルにlast_activity_atカラムが存在しないため、
            // updated_atで代用（Laravelが自動的に設定）
        });
    }

    /**
     * 事業者との関係性
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * スタッフアカウントとの関係性
     */
    public function staffAccounts(): HasMany
    {
        return $this->hasMany(StaffAccount::class);
    }

    /**
     * リソースとの関係性
     */
    public function resources(): HasMany
    {
        return $this->hasMany(Resource::class);
    }

    /**
     * メニューとの関係性
     */
    public function menus(): HasMany
    {
        return $this->hasMany(Menu::class);
    }

    /**
     * 顧客との関係性
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * 予約との関係性
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * 営業カレンダーとの関係性
     */
    public function businessCalendars(): HasMany
    {
        return $this->hasMany(BusinessCalendar::class);
    }

    /**
     * 通知との関係性
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * 業種テンプレート情報取得
     */
    public function getIndustryTemplate(): array
    {
        $templates = self::getIndustryTemplates();
        return $templates[$this->industry_type] ?? [];
    }

    /**
     * 業種固有の表示ラベル取得
     */
    public function getIndustryLabels(): array
    {
        $template = $this->getIndustryTemplate();
        return [
            'resource' => $template['resource_label'] ?? 'リソース',
            'customer' => $template['customer_label'] ?? '顧客',
            'booking' => $template['booking_label'] ?? '予約',
        ];
    }

    /**
     * LINE連携チェック
     */
    public function hasLineIntegration(): bool
    {
        $lineSettings = $this->line_integration ?? [];
        return !empty($lineSettings['channel_id']) &&
            !empty($lineSettings['channel_secret']);
    }

    /**
     * LIFF URL取得
     */
    public function getLiffUrl(): ?string
    {
        $lineSettings = $this->line_integration ?? [];
        $liffId = $lineSettings['liff_id'] ?? null;

        return $liffId ? "https://liff.line.me/{$liffId}" : null;
    }

    /**
     * 営業中チェック
     */
    public function isOpenNow(): bool
    {
        $now = Carbon::now($this->timezone);
        $dayOfWeek = strtolower($now->format('l'));

        $todayHours = $this->business_hours[$dayOfWeek] ?? null;

        if (!$todayHours || isset($todayHours['closed'])) {
            return false;
        }

        $openTime = Carbon::createFromFormat('H:i', $todayHours['open'], $this->timezone);
        $closeTime = Carbon::createFromFormat('H:i', $todayHours['close'], $this->timezone);

        return $now->between($openTime, $closeTime);
    }

    /**
     * 次回営業時間取得
     */
    public function getNextOpenTime(): ?Carbon
    {
        $now = Carbon::now($this->timezone);

        for ($i = 0; $i < 7; $i++) {
            $checkDate = $now->copy()->addDays($i);
            $dayOfWeek = strtolower($checkDate->format('l'));
            $dayHours = $this->business_hours[$dayOfWeek] ?? null;

            if ($dayHours && !isset($dayHours['closed'])) {
                $openTime = $checkDate->setTimeFromTimeString($dayHours['open']);

                if ($openTime->isFuture() || ($i === 0 && $openTime->isToday() && $openTime->gt($now))) {
                    return $openTime;
                }
            }
        }

        return null;
    }

    /**
     * アクティブステータスチェック
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * 一意スラッグ生成
     */
    private static function generateUniqueSlug(string $name): string
    {
        $baseSlug = \Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (self::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * デフォルト業種設定取得
     */
    private static function getDefaultIndustrySettings(string $industryType): array
    {
        $template = self::getIndustryTemplates()[$industryType] ?? [];

        return [
            'template_name' => $template['name'] ?? '',
            'features' => $template['features'] ?? [],
            'labels' => [
                'resource' => $template['resource_label'] ?? 'リソース',
                'customer' => $template['customer_label'] ?? '顧客',
                'booking' => $template['booking_label'] ?? '予約',
            ],
            'customizations' => [],
        ];
    }

    /**
     * 検索スコープ: 業種別
     */
    public function scopeByIndustry($query, string $industryType)
    {
        return $query->where('industry_type', $industryType);
    }

    /**
     * 検索スコープ: アクティブ店舗
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * 検索スコープ: テナント別
     */
    public function scopeByTenant($query, int $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * 検索スコープ: LINE連携済み
     */
    public function scopeWithLineIntegration($query)
    {
        return $query->whereNotNull('line_integration')
            ->where('line_integration->channel_id', '!=', null);
    }

    /**
     * 時間スロット設定のデフォルト値を取得
     * 
     * @return array デフォルト時間スロット設定
     */
    public static function getDefaultTimeSlotSettings(): array
    {
        return [
            'slot_duration_minutes' => 30,          // スロット間隔（分）
            'slot_label_interval_minutes' => 60,    // ラベル表示間隔（分）
            'min_slot_duration' => 5,               // 最小スロット（分）
            'max_slot_duration' => 480,             // 最大スロット（8時間）
            'available_durations' => [5, 10, 15, 20, 30, 45, 60, 90, 120], // 選択可能な時間間隔
            'business_hours' => [
                'start' => '09:00',
                'end' => '21:00',
            ],
            'display_format' => 'H:i',              // 時間表示形式
            'timezone' => 'Asia/Tokyo',             // タイムゾーン
        ];
    }

    /**
     * 時間スロット設定を取得（デフォルト値で補完）
     * 
     * @return array 時間スロット設定
     */
    public function getTimeSlotSettings(): array
    {
        $settings = $this->time_slot_settings ?? [];
        $defaults = self::getDefaultTimeSlotSettings();

        return array_merge($defaults, $settings);
    }

    /**
     * 時間スロット間隔を取得
     * 
     * @return int スロット間隔（分）
     */
    public function getSlotDurationMinutes(): int
    {
        $settings = $this->getTimeSlotSettings();
        return $settings['slot_duration_minutes'] ?? 30;
    }

    /**
     * 利用可能な時間間隔オプションを取得
     * 
     * @return array 時間間隔オプション
     */
    public function getAvailableSlotDurations(): array
    {
        $settings = $this->getTimeSlotSettings();
        return $settings['available_durations'] ?? [5, 10, 15, 20, 30, 45, 60, 90, 120];
    }

    /**
     * 時間スロット設定を更新
     * 
     * @param array $settings 新しい設定値
     * @return bool 更新結果
     */
    public function updateTimeSlotSettings(array $settings): bool
    {
        $currentSettings = $this->getTimeSlotSettings();
        $newSettings = array_merge($currentSettings, $settings);

        // バリデーション
        if (isset($newSettings['slot_duration_minutes'])) {
            $duration = $newSettings['slot_duration_minutes'];
            if ($duration < 5 || $duration > 480) {
                return false;
            }
        }

        $this->time_slot_settings = $newSettings;
        return $this->save();
    }

    /**
     * 時間スロット設定を業種テンプレートに基づいて初期化
     * 
     * @return array 業種別デフォルト設定
     */
    public function initializeTimeSlotSettingsForIndustry(): array
    {
        $industryDefaults = match ($this->industry_type) {
            'beauty' => ['slot_duration_minutes' => 30, 'available_durations' => [15, 30, 45, 60, 90, 120]],
            'clinic' => ['slot_duration_minutes' => 15, 'available_durations' => [10, 15, 20, 30, 45, 60]],
            'rental' => ['slot_duration_minutes' => 60, 'available_durations' => [30, 60, 120, 180, 240, 480]],
            'school' => ['slot_duration_minutes' => 60, 'available_durations' => [30, 60, 90, 120, 180]],
            'activity' => ['slot_duration_minutes' => 120, 'available_durations' => [60, 120, 180, 240, 360, 480]],
            default => ['slot_duration_minutes' => 30, 'available_durations' => [5, 10, 15, 20, 30, 45, 60, 90, 120]],
        };

        $defaultSettings = self::getDefaultTimeSlotSettings();
        $settings = array_merge($defaultSettings, $industryDefaults);

        $this->time_slot_settings = $settings;
        $this->save();

        return $settings;
    }
}
