<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * メニューリソース
 * 
 * メニューデータのAPI出力形式を統一
 * オプション、カテゴリ情報、計算値を含む
 */
class MenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'category' => $this->category,
            'description' => $this->description,
            
            // 価格・時間情報
            'base_price' => $this->base_price,
            'base_duration' => $this->base_duration,
            'prep_duration' => $this->prep_duration,
            'cleanup_duration' => $this->cleanup_duration,
            'total_duration' => $this->getTotalDuration(),
            
            // 制約・要件
            'booking_constraints' => $this->booking_constraints,
            'resource_requirements' => $this->resource_requirements,
            'industry_settings' => $this->industry_settings,
            
            // 状態・設定
            'is_active' => $this->is_active,
            'requires_approval' => $this->requires_approval,
            'sort_order' => $this->sort_order,
            'image_url' => $this->image_url,
            
            // 関連データ
            'options' => MenuOptionResource::collection($this->whenLoaded('options')),
            'options_count' => $this->whenCounted('options'),
            
            // 統計情報（必要時のみ）
            'bookings_count' => $this->whenCounted('bookings'),
            
            // 業種別表示情報
            'industry_display_name' => $this->getIndustryDisplayName(),
            'category_info' => $this->when($request->has('include_category_info'), function () {
                return $this->getCategoryInfo();
            }),
            
            // 計算値
            'formatted_price' => '¥' . number_format($this->base_price),
            'formatted_duration' => $this->formatDuration($this->base_duration),
            'formatted_total_duration' => $this->formatDuration($this->getTotalDuration()),
            
            // タイムスタンプ
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * 時間をフォーマット
     * 
     * @param int $minutes 分数
     * @return string フォーマット済み時間
     */
    private function formatDuration(int $minutes): string
    {
        if ($minutes < 60) {
            return $minutes . '分';
        }
        
        $hours = intval($minutes / 60);
        $remainingMinutes = $minutes % 60;
        
        if ($remainingMinutes === 0) {
            return $hours . '時間';
        }
        
        return $hours . '時間' . $remainingMinutes . '分';
    }
}
