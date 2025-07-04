<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * BookingResource
 * 
 * 予約データAPIレスポンス用リソースクラス
 * 
 * tugical_api_specification_v1.0.md 準拠の統一レスポンス形式
 * - 関連データの適切な展開（customer, menu, resource, options）
 * - 日時フォーマット統一
 * - マルチテナント対応
 * - 業種別表示名対応
 * 
 * @package App\Http\Resources
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class BookingResource extends JsonResource
{
    /**
     * リソースを配列に変換
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            // 基本情報
            'id' => $this->id,
            'booking_number' => $this->booking_number,
            'booking_date' => $this->booking_date,
            'start_time' => $this->start_time,
            'end_time' => $this->calculateEndTime(),
            'status' => $this->status,
            'total_price' => $this->total_price,

            // ステータス詳細情報
            'status_info' => $this->getStatusInfoData(),

            // 関連データ
            'customer' => $this->whenLoaded('customer', function () {
                return [
                    'id' => $this->customer->id,
                    'name' => $this->customer->name,
                    'phone' => $this->customer->phone,
                    'email' => $this->when(
                        $this->customer->email,
                        $this->customer->email
                    ),
                    'loyalty_rank' => $this->customer->loyalty_rank,
                    'line_user_id' => $this->when(
                        auth()->user()->role === 'owner', // 管理者のみ表示
                        $this->customer->line_user_id
                    )
                ];
            }),

            'menu' => $this->whenLoaded('menu', function () {
                return [
                    'id' => $this->menu->id,
                    'name' => $this->menu->name,
                    'category' => $this->menu->category,
                    'base_duration' => $this->menu->duration,
                    'base_price' => $this->menu->price,
                    'description' => $this->when(
                        $this->menu->description,
                        $this->menu->description
                    )
                ];
            }),

            'resource' => $this->when($this->resource, function () {
                return [
                    'id' => $this->resource->id,
                    'type' => $this->resource->type,
                    'name' => $this->resource->name,
                    'display_name' => $this->resource->display_name,
                    'photo_url' => $this->when(
                        $this->resource->photo_url,
                        $this->resource->photo_url
                    ),
                    'specialties' => $this->when(
                        isset($this->resource->attributes['specialties']),
                        $this->resource->attributes['specialties'] ?? []
                    )
                ];
            }),

            'options' => $this->whenLoaded('options', function () {
                return $this->options->map(function ($option) {
                    return [
                        'id' => $option->id,
                        'name' => $option->name,
                        'price' => $option->price,
                        'duration' => $option->duration ?? 0
                    ];
                });
            }),

            // 備考・メモ
            'customer_notes' => $this->when(
                $this->customer_notes,
                $this->customer_notes
            ),
            'staff_notes' => $this->when(
                $this->staff_notes && auth()->check(),
                $this->staff_notes
            ),

            // 予約ソース
            'booking_source' => $this->when(
                $this->booking_source,
                $this->booking_source
            ),

            // 料金詳細（詳細表示時のみ）
            'pricing_breakdown' => $this->when(
                $request->route()->getName() === 'bookings.show',
                function () {
                    return $this->getPricingBreakdown();
                }
            ),

            // アクション可能性（現在のステータスと権限に基づく）
            'actions' => $this->getAvailableActions(),

            // タイムスタンプ
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // キャンセル・完了時の詳細情報
            'cancelled_at' => $this->when(
                $this->status === 'cancelled' && $this->cancelled_at,
                $this->cancelled_at?->toISOString()
            ),
            'completed_at' => $this->when(
                $this->status === 'completed' && $this->completed_at,
                $this->completed_at?->toISOString()
            ),

            // 店舗情報（デバッグ・管理用）
            'store_id' => $this->when(
                auth()->user()->role === 'super_admin',
                $this->store_id
            )
        ];
    }

    /**
     * 料金内訳取得
     * 
     * @return array
     */
    private function getPricingBreakdown(): array
    {
        $breakdown = [
            'base_price' => $this->menu->price ?? 0,
            'options_total' => 0,
            'resource_fee' => 0,
            'total_price' => $this->total_price
        ];

        // オプション料金合計
        if ($this->relationLoaded('options')) {
            $breakdown['options_total'] = $this->options->sum('price');
            $breakdown['options_detail'] = $this->options->map(function ($option) {
                return [
                    'name' => $option->name,
                    'price' => $option->price
                ];
            });
        }

        // リソース差額計算
        if ($this->relationLoaded('resource') && $this->resource) {
            $resource = $this->resource;
            $menu = $this->menu;

            if ($resource->hourly_rate_diff && $menu) {
                $durationMinutes = $menu->duration;
                $resourceFee = ($durationMinutes / 60) * $resource->hourly_rate_diff;
                $breakdown['resource_fee'] = intval($resourceFee);
            }

            // 指名料
            $attributes = is_string($resource->attributes)
                ? json_decode($resource->attributes, true)
                : $resource->attributes;

            if (isset($attributes['nomination_fee'])) {
                $breakdown['nomination_fee'] = $attributes['nomination_fee'];
                $breakdown['resource_fee'] += $attributes['nomination_fee'];
            }
        }

        return $breakdown;
    }

    /**
     * 利用可能なアクション取得
     * 
     * 現在のステータスと権限に基づいて実行可能なアクションを返す
     * 
     * @return array
     */
    private function getAvailableActions(): array
    {
        $actions = [];
        $userRole = auth()->user()->role ?? 'staff';

        // ステータス別利用可能アクション
        switch ($this->status) {
            case 'pending':
                $actions[] = 'confirm';
                $actions[] = 'cancel';
                $actions[] = 'edit';
                break;

            case 'confirmed':
                $actions[] = 'complete';
                $actions[] = 'cancel';
                $actions[] = 'edit';
                $actions[] = 'mark_no_show';
                break;

            case 'completed':
                if ($userRole === 'owner') {
                    $actions[] = 'reopen';
                }
                break;

            case 'cancelled':
                if ($userRole === 'owner') {
                    $actions[] = 'restore';
                }
                break;

            case 'no_show':
                if ($userRole === 'owner') {
                    $actions[] = 'mark_completed';
                    $actions[] = 'cancel';
                }
                break;
        }

        // 管理者のみの特別アクション
        if ($userRole === 'owner') {
            $actions[] = 'force_edit';
            $actions[] = 'view_history';
        }

        return array_unique($actions);
    }

    /**
     * リソースコレクション作成
     * 
     * ページネーション情報付きコレクション
     * 
     * @param mixed $resource
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public static function collection($resource)
    {
        return parent::collection($resource)->additional([
            'meta' => [
                'timestamp' => now()->toISOString(),
                'version' => '1.0'
            ]
        ]);
    }

    /**
     * レスポンスにメタデータを追加
     * 
     * @param Request $request
     * @param \Illuminate\Http\JsonResponse $response
     * @return void
     */
    public function withResponse(Request $request, $response): void
    {
        $data = $response->getData(true);

        if (!isset($data['meta'])) {
            $data['meta'] = [];
        }

        $data['meta']['timestamp'] = now()->toISOString();
        $data['meta']['version'] = '1.0';

        $response->setData($data);
    }

    /**
     * 終了時間を計算
     * 
     * @return string
     */
    private function calculateEndTime(): string
    {
        if (!$this->start_time) {
            return '';
        }

        // 基本所要時間
        $totalDuration = 0;

        // メニューの基本時間
        if ($this->relationLoaded('menu') && $this->menu) {
            $totalDuration += $this->menu->base_duration;
        }

        // オプションの時間を加算
        if ($this->relationLoaded('bookingOptions') && $this->bookingOptions) {
            foreach ($this->bookingOptions as $option) {
                $totalDuration += $option->duration ?? 0;
            }
        }

        // 開始時間に所要時間を加算
        $startTime = strtotime($this->start_time);
        $endTime = $startTime + ($totalDuration * 60); // 分を秒に変換

        return date('H:i', $endTime);
    }
}
