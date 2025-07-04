<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * 営業カレンダーモデル - 営業日・特別営業・定休日管理
 * 
 * tugicalサービスの営業カレンダーシステムを管理
 * 通常営業時間からの例外処理・特別営業・定休日・イベント管理
 * 
 * 主要機能:
 * - 特別営業日設定（営業時間変更、延長営業）
 * - 定休日設定（臨時休業、祝日休業）
 * - 繰り返しイベント対応（毎週・毎月・毎年）
 * - 営業時間チェック・予約可能時間計算
 * - カレンダー表示・色分け管理
 * - スタッフ・リソース別営業設定
 * 
 * イベントタイプ:
 * - special_hours: 特別営業時間
 * - closed: 定休日・臨時休業
 * - holiday: 祝日
 * - staff_absence: スタッフ不在
 * - maintenance: メンテナンス
 * - event: イベント・セミナー
 * - promotion: プロモーション期間
 * 
 * 優先度:
 * - 1: 緊急（システムメンテナンス等）
 * - 2: 高（臨時休業等）
 * - 3: 中（特別営業時間等）
 * - 4: 低（プロモーション等）
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * 
 * @property int $id カレンダーID
 * @property int $store_id 店舗ID
 * @property string $title イベントタイトル
 * @property string $type イベントタイプ
 * @property string $date 対象日（YYYY-MM-DD）
 * @property string|null $start_time 開始時間（HH:MM、特別営業時間の場合）
 * @property string|null $end_time 終了時間（HH:MM、特別営業時間の場合）
 * @property bool $is_closed 休業フラグ
 * @property bool $is_recurring 繰り返しフラグ
 * @property string|null $recurring_pattern 繰り返しパターン（weekly/monthly/yearly）
 * @property array|null $recurring_config 繰り返し設定（JSON: 詳細設定）
 * @property array|null $affected_resources 対象リソース（JSON: resource_ids）
 * @property array|null $affected_staff 対象スタッフ（JSON: staff_ids）
 * @property string|null $description 説明・備考
 * @property string|null $color 表示色（#RRGGBB）
 * @property int $priority 優先度（1-4）
 * @property bool $is_public 公開フラグ（顧客カレンダー表示用）
 * @property bool $blocks_booking 予約受付停止フラグ
 * @property Carbon|null $recurring_end_date 繰り返し終了日
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 */
class BusinessCalendar extends Model
{
    use HasFactory;

    /**
     * テーブル名
     */
    protected $table = 'business_calendars';

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'date' => 'date',
        'recurring_config' => 'array',
        'affected_resources' => 'array',
        'affected_staff' => 'array',
        'is_closed' => 'boolean',
        'is_recurring' => 'boolean',
        'is_public' => 'boolean',
        'blocks_booking' => 'boolean',
        'priority' => 'integer',
        'recurring_end_date' => 'date',
    ];

    /**
     * イベントタイプ定数
     */
    public const TYPE_SPECIAL_HOURS = 'special_hours';
    public const TYPE_CLOSED = 'closed';
    public const TYPE_HOLIDAY = 'holiday';
    public const TYPE_STAFF_ABSENCE = 'staff_absence';
    public const TYPE_MAINTENANCE = 'maintenance';
    public const TYPE_EVENT = 'event';
    public const TYPE_PROMOTION = 'promotion';

    /**
     * 繰り返しパターン定数
     */
    public const RECURRING_WEEKLY = 'weekly';
    public const RECURRING_MONTHLY = 'monthly';
    public const RECURRING_YEARLY = 'yearly';

    /**
     * 優先度定数
     */
    public const PRIORITY_URGENT = 1;
    public const PRIORITY_HIGH = 2;
    public const PRIORITY_MEDIUM = 3;
    public const PRIORITY_LOW = 4;

    /**
     * イベントタイプ情報
     */
    public static function getEventTypes(): array
    {
        return [
            self::TYPE_SPECIAL_HOURS => [
                'name' => '特別営業時間',
                'description' => '通常とは異なる営業時間での営業',
                'color' => '#3b82f6',
                'priority' => self::PRIORITY_MEDIUM,
                'blocks_booking' => false,
                'requires_time' => true,
            ],
            self::TYPE_CLOSED => [
                'name' => '定休日・臨時休業',
                'description' => '店舗の休業日',
                'color' => '#ef4444',
                'priority' => self::PRIORITY_HIGH,
                'blocks_booking' => true,
                'requires_time' => false,
            ],
            self::TYPE_HOLIDAY => [
                'name' => '祝日',
                'description' => '国民の祝日等',
                'color' => '#f59e0b',
                'priority' => self::PRIORITY_HIGH,
                'blocks_booking' => true,
                'requires_time' => false,
            ],
            self::TYPE_STAFF_ABSENCE => [
                'name' => 'スタッフ不在',
                'description' => '特定スタッフの不在日',
                'color' => '#8b5cf6',
                'priority' => self::PRIORITY_MEDIUM,
                'blocks_booking' => false,
                'requires_time' => false,
            ],
            self::TYPE_MAINTENANCE => [
                'name' => 'メンテナンス',
                'description' => 'システムメンテナンス・設備点検',
                'color' => '#6b7280',
                'priority' => self::PRIORITY_URGENT,
                'blocks_booking' => true,
                'requires_time' => true,
            ],
            self::TYPE_EVENT => [
                'name' => 'イベント・セミナー',
                'description' => '特別イベントの開催',
                'color' => '#10b981',
                'priority' => self::PRIORITY_MEDIUM,
                'blocks_booking' => false,
                'requires_time' => true,
            ],
            self::TYPE_PROMOTION => [
                'name' => 'プロモーション期間',
                'description' => 'キャンペーン・特別価格期間',
                'color' => '#f97316',
                'priority' => self::PRIORITY_LOW,
                'blocks_booking' => false,
                'requires_time' => false,
            ],
        ];
    }

    /**
     * 繰り返しパターン情報
     */
    public static function getRecurringPatterns(): array
    {
        return [
            self::RECURRING_WEEKLY => [
                'name' => '毎週',
                'description' => '指定した曜日に毎週繰り返し',
                'config_fields' => ['day_of_week'],
            ],
            self::RECURRING_MONTHLY => [
                'name' => '毎月',
                'description' => '指定した日付に毎月繰り返し',
                'config_fields' => ['day_of_month'],
            ],
            self::RECURRING_YEARLY => [
                'name' => '毎年',
                'description' => '指定した月日に毎年繰り返し',
                'config_fields' => ['month', 'day'],
            ],
        ];
    }

    /**
     * 優先度情報
     */
    public static function getPriorityInfo(): array
    {
        return [
            self::PRIORITY_URGENT => [
                'name' => '緊急',
                'description' => 'システムメンテナンス等',
                'color' => '#dc2626',
            ],
            self::PRIORITY_HIGH => [
                'name' => '高',
                'description' => '臨時休業・祝日等',
                'color' => '#f59e0b',
            ],
            self::PRIORITY_MEDIUM => [
                'name' => '中',
                'description' => '特別営業時間・イベント等',
                'color' => '#3b82f6',
            ],
            self::PRIORITY_LOW => [
                'name' => '低',
                'description' => 'プロモーション等',
                'color' => '#6b7280',
            ],
        ];
    }

    /**
     * モデルの起動時処理
     */
    protected static function booted()
    {
        static::addGlobalScope(new TenantScope);

        // 作成時の処理
        static::creating(function ($calendar) {
            // デフォルト値設定
            $eventTypes = self::getEventTypes();
            $typeInfo = $eventTypes[$calendar->type] ?? [];

            $calendar->priority = $calendar->priority ?? $typeInfo['priority'] ?? self::PRIORITY_MEDIUM;
            $calendar->color = $calendar->color ?? $typeInfo['color'] ?? '#6b7280';
            $calendar->blocks_booking = $calendar->blocks_booking ?? $typeInfo['blocks_booking'] ?? false;
            $calendar->is_public = $calendar->is_public ?? true;
            $calendar->is_recurring = $calendar->is_recurring ?? false;

            // 休業日の場合は自動でis_closedを設定
            if (in_array($calendar->type, [self::TYPE_CLOSED, self::TYPE_HOLIDAY, self::TYPE_MAINTENANCE])) {
                $calendar->is_closed = true;
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
     * イベントタイプ情報取得
     */
    public function getTypeInfo(): array
    {
        $types = self::getEventTypes();
        return $types[$this->type] ?? [];
    }

    /**
     * 繰り返しパターン情報取得
     */
    public function getRecurringPatternInfo(): array
    {
        if (!$this->recurring_pattern) {
            return [];
        }

        $patterns = self::getRecurringPatterns();
        return $patterns[$this->recurring_pattern] ?? [];
    }

    /**
     * 指定日に該当するかチェック
     */
    public function appliesOnDate(Carbon $date): bool
    {
        // 繰り返しでない場合は直接日付比較
        if (!$this->is_recurring) {
            return $this->date->isSameDay($date);
        }

        // 繰り返し終了日チェック
        if ($this->recurring_end_date && $date->isAfter($this->recurring_end_date)) {
            return false;
        }

        // 繰り返し開始日より前の場合
        if ($date->isBefore($this->date)) {
            return false;
        }

        $config = $this->recurring_config ?? [];

        switch ($this->recurring_pattern) {
            case self::RECURRING_WEEKLY:
                $dayOfWeek = $config['day_of_week'] ?? $this->date->dayOfWeek;
                return $date->dayOfWeek === $dayOfWeek;

            case self::RECURRING_MONTHLY:
                $dayOfMonth = $config['day_of_month'] ?? $this->date->day;
                return $date->day === $dayOfMonth;

            case self::RECURRING_YEARLY:
                $month = $config['month'] ?? $this->date->month;
                $day = $config['day'] ?? $this->date->day;
                return $date->month === $month && $date->day === $day;

            default:
                return false;
        }
    }

    /**
     * 営業時間取得
     */
    public function getBusinessHours(): ?array
    {
        if ($this->is_closed) {
            return null;
        }

        if ($this->type === self::TYPE_SPECIAL_HOURS && $this->start_time && $this->end_time) {
            return [
                'open' => $this->start_time,
                'close' => $this->end_time,
            ];
        }

        return null;
    }

    /**
     * 予約可能チェック
     */
    public function allowsBooking(): bool
    {
        return !$this->blocks_booking && !$this->is_closed;
    }

    /**
     * スタッフ対象チェック
     */
    public function affectsStaff(int $staffId): bool
    {
        $affectedStaff = $this->affected_staff ?? [];
        return empty($affectedStaff) || in_array($staffId, $affectedStaff);
    }

    /**
     * リソース対象チェック
     */
    public function affectsResource(int $resourceId): bool
    {
        $affectedResources = $this->affected_resources ?? [];
        return empty($affectedResources) || in_array($resourceId, $affectedResources);
    }

    /**
     * フォーマット済み表示
     */
    public function getFormattedDisplay(): array
    {
        $display = [
            'title' => $this->title,
            'type' => $this->getTypeInfo()['name'] ?? $this->type,
            'date' => $this->date->format('Y年n月j日'),
            'color' => $this->color,
            'priority' => self::getPriorityInfo()[$this->priority]['name'] ?? $this->priority,
        ];

        if ($this->start_time && $this->end_time) {
            $display['time'] = $this->start_time . ' - ' . $this->end_time;
        }

        if ($this->is_closed) {
            $display['status'] = '休業';
        } elseif ($this->type === self::TYPE_SPECIAL_HOURS) {
            $display['status'] = '特別営業';
        } else {
            $display['status'] = 'イベント';
        }

        return $display;
    }

    /**
     * 繰り返し設定検証
     */
    public function validateRecurringConfig(): array
    {
        $errors = [];

        if (!$this->is_recurring) {
            return $errors;
        }

        if (!$this->recurring_pattern) {
            $errors[] = '繰り返しパターンが設定されていません。';
            return $errors;
        }

        $patternInfo = $this->getRecurringPatternInfo();
        $requiredFields = $patternInfo['config_fields'] ?? [];
        $config = $this->recurring_config ?? [];

        foreach ($requiredFields as $field) {
            if (!isset($config[$field])) {
                $errors[] = "繰り返し設定の「{$field}」が必要です。";
            }
        }

        return $errors;
    }

    /**
     * 繰り返しイベント複製
     */
    public function generateRecurringEvents(Carbon $startDate, Carbon $endDate): array
    {
        if (!$this->is_recurring) {
            return [];
        }

        $events = [];
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            if ($this->appliesOnDate($currentDate)) {
                $events[] = [
                    'date' => $currentDate->format('Y-m-d'),
                    'title' => $this->title,
                    'type' => $this->type,
                    'start_time' => $this->start_time,
                    'end_time' => $this->end_time,
                    'is_closed' => $this->is_closed,
                    'color' => $this->color,
                    'parent_id' => $this->id,
                ];
            }
            $currentDate->addDay();
        }

        return $events;
    }

    /**
     * 検索スコープ: イベントタイプ別
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * 検索スコープ: 日付範囲
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * 検索スコープ: 日付指定
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * 検索スコープ: 休業日
     */
    public function scopeClosed($query)
    {
        return $query->where('is_closed', true);
    }

    /**
     * 検索スコープ: 営業日
     */
    public function scopeOpen($query)
    {
        return $query->where('is_closed', false);
    }

    /**
     * 検索スコープ: 繰り返しイベント
     */
    public function scopeRecurring($query)
    {
        return $query->where('is_recurring', true);
    }

    /**
     * 検索スコープ: 単発イベント
     */
    public function scopeOneTime($query)
    {
        return $query->where('is_recurring', false);
    }

    /**
     * 検索スコープ: 公開イベント
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * 検索スコープ: 優先度別
     */
    public function scopeByPriority($query, int $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * 検索スコープ: 予約受付停止
     */
    public function scopeBlocksBooking($query)
    {
        return $query->where('blocks_booking', true);
    }

    /**
     * 検索スコープ: スタッフ関連
     */
    public function scopeAffectsStaff($query, int $staffId)
    {
        return $query->where(function ($q) use ($staffId) {
            $q->whereNull('affected_staff')
                ->orWhereJsonContains('affected_staff', $staffId);
        });
    }

    /**
     * 検索スコープ: リソース関連
     */
    public function scopeAffectsResource($query, int $resourceId)
    {
        return $query->where(function ($q) use ($resourceId) {
            $q->whereNull('affected_resources')
                ->orWhereJsonContains('affected_resources', $resourceId);
        });
    }

    /**
     * 検索スコープ: 今日のイベント
     */
    public function scopeToday($query)
    {
        return $query->whereDate('date', today());
    }

    /**
     * 検索スコープ: 今週のイベント
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * 検索スコープ: 今月のイベント
     */
    public function scopeThisMonth($query)
    {
        return $query->whereMonth('date', now()->month)
            ->whereYear('date', now()->year);
    }

    /**
     * 検索スコープ: 優先度順
     */
    public function scopeOrderByPriority($query, string $direction = 'asc')
    {
        return $query->orderBy('priority', $direction);
    }

    /**
     * 検索スコープ: イベント検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('title', 'like', "%{$keyword}%")
                ->orWhere('description', 'like', "%{$keyword}%");
        });
    }
}
