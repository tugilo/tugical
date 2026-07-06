<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ResourceResource
 * 
 * リソース情報のAPI出力フォーマット
 * 統一リソース概念に対応した出力形式
 * 
 * @package App\Http\Resources
 */
class ResourceResource extends JsonResource
{
    /**
     * リソースを配列に変換
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'attributes' => $this->attributes ?? [],
            'working_hours' => $this->working_hours ?? [],
            'constraints' => $this->constraints ?? [],
            'efficiency_rate' => $this->efficiency_rate,
            'hourly_rate_diff' => $this->hourly_rate_diff,
            'capacity' => $this->capacity,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'image_url' => $this->image_url,
            
            // 計算フィールド
            'type_info' => $this->getTypeInfo(),
            'industry_display_name' => $this->getIndustryDisplayName(),
            'is_working_now' => $this->isWorkingAt(),
            'next_working_time' => $this->getNextWorkingTime()?->toISOString(),
            
            // メタデータ
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
