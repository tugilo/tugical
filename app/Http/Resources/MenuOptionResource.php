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
            'price' => $this->price,
            'duration' => $this->duration_minutes,
            'duration_minutes' => $this->duration_minutes,
            'price_type' => $this->price_type,
            'price_value' => $this->price_value,
            'is_required' => $this->is_required,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'formatted_price' => '¥' . number_format($this->price),
            'formatted_duration' => $this->duration_minutes . '分',
            'has_stock_management' => $this->has_stock_management,
            'in_stock' => $this->in_stock,
            'stock_used' => $this->stock_used,
            'price_type_info' => [
                'name' => $this->getPriceTypeName(),
                'description' => $this->getPriceTypeDescription(),
                'value_unit' => $this->getPriceTypeUnit(),
                'example' => $this->getPriceTypeExample(),
            ],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * 料金タイプの名前を取得
     */
    private function getPriceTypeName(): string
    {
        return match ($this->price_type) {
            'fixed' => '固定料金',
            'percentage' => '基本料金の割合',
            'per_minute' => '分単位料金',
            'per_hour' => '時間単位料金',
            default => '固定料金',
        };
    }

    /**
     * 料金タイプの説明を取得
     */
    private function getPriceTypeDescription(): string
    {
        return match ($this->price_type) {
            'fixed' => '固定の追加料金',
            'percentage' => 'メニュー基本料金に対する割合',
            'per_minute' => '1分あたりの追加料金',
            'per_hour' => '1時間あたりの追加料金',
            default => '',
        };
    }

    /**
     * 料金タイプの単位を取得
     */
    private function getPriceTypeUnit(): string
    {
        return match ($this->price_type) {
            'fixed' => '円',
            'percentage' => '%',
            'per_minute' => '円/分',
            'per_hour' => '円/時',
            default => '円',
        };
    }

    /**
     * 料金タイプの例を取得
     */
    private function getPriceTypeExample(): string
    {
        return match ($this->price_type) {
            'fixed' => '¥' . number_format($this->price_value),
            'percentage' => $this->price_value . '%',
            'per_minute' => '¥' . number_format($this->price_value) . '/分',
            'per_hour' => '¥' . number_format($this->price_value) . '/時',
            default => '',
        };
    }
}
