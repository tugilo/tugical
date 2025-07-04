<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * メニューオプションリソース
 * 
 * メニューオプションデータのAPI出力形式を統一
 * 価格計算、在庫情報、フォーマット済み表示を含む
 */
class MenuOptionResource extends JsonResource
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
            'menu_id' => $this->menu_id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            
            // 価格情報
            'price_type' => $this->price_type,
            'price_value' => $this->price_value,
            'duration_minutes' => $this->duration_minutes,
            
            // 制約・在庫
            'constraints' => $this->constraints,
            'stock_quantity' => $this->stock_quantity,
            'stock_used' => $this->stock_used,
            'available_stock' => $this->getAvailableStock(),
            
            // 状態・設定
            'is_required' => $this->is_required,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            
            // 価格タイプ情報
            'price_type_info' => $this->getPriceTypeInfo(),
            
            // フォーマット済み表示
            'formatted_price' => $this->getFormattedPrice(),
            'formatted_duration' => $this->getFormattedDuration(),
            
            // 在庫管理情報
            'has_stock_management' => $this->hasStockManagement(),
            'in_stock' => $this->hasStock(),
            
            // タイムスタンプ
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
