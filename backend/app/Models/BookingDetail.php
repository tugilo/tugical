<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

/**
 * BookingDetail Model
 * 
 * 複数メニュー組み合わせ対応: 1つの予約に対する複数メニューの組み合わせを管理
 * 例: 美容院でカット+カラー+パーマの組み合わせ予約
 * 
 * @property int $id 予約明細ID
 * @property int $booking_id 予約ID
 * @property int $menu_id メニューID
 * @property int|null $resource_id 担当リソースID
 * @property int $sequence_order 実施順序
 * @property string $service_name サービス名
 * @property string|null $service_description サービス説明
 * @property int $base_price 基本料金
 * @property int $resource_price_diff リソース料金差
 * @property int $detail_discount 明細単位の割引
 * @property int $base_duration 基本所要時間
 * @property int $prep_duration 準備時間
 * @property int $cleanup_duration 片付け時間
 * @property int $total_duration 合計所要時間
 * @property int $start_time_offset 予約開始からのオフセット時間
 * @property int $end_time_offset 予約開始からの終了オフセット時間
 * @property bool $is_auto_added 自動追加サービスフラグ
 * @property string|null $auto_add_reason 自動追加理由
 * @property array|null $selected_options 選択されたオプション一覧
 * @property array|null $service_attributes サービス属性
 * @property string $completion_status 実施状況
 * @property Carbon|null $actual_start_time 実際開始時間
 * @property Carbon|null $actual_end_time 実際終了時間
 * @property string|null $staff_notes スタッフメモ
 * @property int|null $customer_satisfaction 顧客満足度
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Booking $booking 予約
 * @property-read Menu $menu メニュー
 * @property-read Resource|null $resource 担当リソース
 */
class BookingDetail extends Model
{
    use HasFactory;

    /**
     * テーブル名
     */
    protected $table = 'booking_details';

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    /**
     * 型キャスト
     */
    protected $casts = [
        'booking_id' => 'integer',
        'menu_id' => 'integer',
        'resource_id' => 'integer',
        'sequence_order' => 'integer',
        'base_price' => 'integer',
        'resource_price_diff' => 'integer',
        'detail_discount' => 'integer',
        'base_duration' => 'integer',
        'prep_duration' => 'integer',
        'cleanup_duration' => 'integer',
        'total_duration' => 'integer',
        'start_time_offset' => 'integer',
        'end_time_offset' => 'integer',
        'is_auto_added' => 'boolean',
        'selected_options' => 'array',
        'service_attributes' => 'array',
        'actual_start_time' => 'datetime',
        'actual_end_time' => 'datetime',
        'customer_satisfaction' => 'integer',
    ];

    /**
     * 実施状況の定数
     */
    const COMPLETION_STATUS_PENDING = 'pending';
    const COMPLETION_STATUS_IN_PROGRESS = 'in_progress';
    const COMPLETION_STATUS_COMPLETED = 'completed';
    const COMPLETION_STATUS_CANCELLED = 'cancelled';
    const COMPLETION_STATUS_SKIPPED = 'skipped';

    /**
     * 実施状況の選択肢
     */
    const COMPLETION_STATUSES = [
        self::COMPLETION_STATUS_PENDING,
        self::COMPLETION_STATUS_IN_PROGRESS,
        self::COMPLETION_STATUS_COMPLETED,
        self::COMPLETION_STATUS_CANCELLED,
        self::COMPLETION_STATUS_SKIPPED,
    ];

    /**
     * 実施状況のラベル
     */
    const COMPLETION_STATUS_LABELS = [
        self::COMPLETION_STATUS_PENDING => '未実施',
        self::COMPLETION_STATUS_IN_PROGRESS => '実施中',
        self::COMPLETION_STATUS_COMPLETED => '完了',
        self::COMPLETION_STATUS_CANCELLED => 'キャンセル',
        self::COMPLETION_STATUS_SKIPPED => 'スキップ',
    ];

    /**
     * 予約との関係（多対1）
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * メニューとの関係（多対1）
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    /**
     * リソースとの関係（多対1）
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * 実際の料金を取得（基本料金 + リソース料金差 - 明細割引）
     */
    public function getActualPriceAttribute(): int
    {
        return max(0, $this->base_price + $this->resource_price_diff - $this->detail_discount);
    }

    /**
     * 実施状況のラベルを取得
     */
    public function getCompletionStatusLabelAttribute(): string
    {
        return self::COMPLETION_STATUS_LABELS[$this->completion_status] ?? '不明';
    }

    /**
     * 実施が完了しているかどうか
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->completion_status === self::COMPLETION_STATUS_COMPLETED;
    }

    /**
     * 実施中かどうか
     */
    public function getIsInProgressAttribute(): bool
    {
        return $this->completion_status === self::COMPLETION_STATUS_IN_PROGRESS;
    }

    /**
     * キャンセルされたかどうか
     */
    public function getIsCancelledAttribute(): bool
    {
        return in_array($this->completion_status, [
            self::COMPLETION_STATUS_CANCELLED,
            self::COMPLETION_STATUS_SKIPPED
        ]);
    }

    /**
     * 選択されたオプション一覧の合計金額を取得
     */
    public function getSelectedOptionsAmountAttribute(): int
    {
        if (empty($this->selected_options)) {
            return 0;
        }

        return collect($this->selected_options)->sum('price');
    }

    /**
     * 総合計金額を取得（実際の料金 + オプション料金）
     */
    public function getTotalAmountAttribute(): int
    {
        return $this->actual_price + $this->selected_options_amount;
    }

    /**
     * 予約開始時刻からの実際の開始時刻を取得
     */
    public function getScheduledStartTimeAttribute(): ?Carbon
    {
        if (!$this->booking || !$this->booking->start_time) {
            return null;
        }

        // 予約日時と開始時刻からCarbonインスタンスを作成
        $bookingDateTime = Carbon::createFromFormat(
            'Y-m-d H:i:s',
            $this->booking->booking_date->format('Y-m-d') . ' ' . $this->booking->start_time
        );

        return $bookingDateTime->addMinutes($this->start_time_offset);
    }

    /**
     * 予約開始時刻からの実際の終了時刻を取得
     */
    public function getScheduledEndTimeAttribute(): ?Carbon
    {
        if (!$this->booking || !$this->booking->start_time) {
            return null;
        }

        // 予約日時と開始時刻からCarbonインスタンスを作成
        $bookingDateTime = Carbon::createFromFormat(
            'Y-m-d H:i:s',
            $this->booking->booking_date->format('Y-m-d') . ' ' . $this->booking->start_time
        );

        return $bookingDateTime->addMinutes($this->end_time_offset);
    }

    /**
     * 実施順序でソート
     */
    public function scopeBySequence($query)
    {
        return $query->orderBy('sequence_order');
    }

    /**
     * 完了ステータスでフィルター
     */
    public function scopeByCompletionStatus($query, string $status)
    {
        return $query->where('completion_status', $status);
    }

    /**
     * 完了済みの明細のみ取得
     */
    public function scopeCompleted($query)
    {
        return $query->where('completion_status', self::COMPLETION_STATUS_COMPLETED);
    }

    /**
     * 未完了の明細のみ取得
     */
    public function scopePending($query)
    {
        return $query->where('completion_status', self::COMPLETION_STATUS_PENDING);
    }

    /**
     * 自動追加サービスかどうかでフィルター
     */
    public function scopeAutoAdded($query, bool $autoAdded = true)
    {
        return $query->where('is_auto_added', $autoAdded);
    }

    /**
     * 指定したメニューの明細のみ取得
     */
    public function scopeForMenu($query, int $menuId)
    {
        return $query->where('menu_id', $menuId);
    }

    /**
     * 指定したリソースの明細のみ取得
     */
    public function scopeForResource($query, int $resourceId)
    {
        return $query->where('resource_id', $resourceId);
    }
}
