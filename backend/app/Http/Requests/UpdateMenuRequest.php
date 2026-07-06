<?php

namespace App\Http\Requests;

use App\Models\MenuOption;
use Illuminate\Foundation\Http\FormRequest;

/**
 * メニュー更新リクエスト
 * 
 * メニューとオプションの更新時バリデーション
 * 部分更新対応、業種別制約チェックを含む
 */
class UpdateMenuRequest extends FormRequest
{
    /**
     * リクエストの認可
     */
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->store_id;
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        return [
            // 基本情報（部分更新対応）
            'name' => 'sometimes|required|string|max:100',
            'display_name' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
            
            // 価格・時間
            'base_price' => 'sometimes|required|integer|min:0|max:999999',
            'base_duration' => 'sometimes|required|integer|min:1|max:1440', // 最大24時間
            'prep_duration' => 'nullable|integer|min:0|max:180', // 最大3時間
            'cleanup_duration' => 'nullable|integer|min:0|max:180', // 最大3時間
            
            // 制約・要件
            'booking_constraints' => 'nullable|array',
            'booking_constraints.advance_booking_days' => 'nullable|integer|min:0|max:365',
            'booking_constraints.same_day_booking' => 'nullable|boolean',
            'booking_constraints.minimum_advance_hours' => 'nullable|integer|min:0|max:168',
            'booking_constraints.cancellation_hours' => 'nullable|integer|min:0|max:168',
            
            'resource_requirements' => 'nullable|array',
            'resource_requirements.staff_type' => 'nullable|string|max:50',
            'resource_requirements.room_required' => 'nullable|boolean',
            'resource_requirements.equipment' => 'nullable|array',
            'resource_requirements.equipment.*' => 'integer|exists:resources,id',
            
            // 業種設定
            'industry_settings' => 'nullable|array',
            
            // その他
            'image_url' => 'nullable|url|max:500',
            'is_active' => 'nullable|boolean',
            'requires_approval' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            
            // オプション（完全置換）
            'options' => 'nullable|array|max:20', // 最大20個のオプション
            'options.*.name' => 'required|string|max:100',
            'options.*.display_name' => 'nullable|string|max:100',
            'options.*.description' => 'nullable|string|max:500',
            'options.*.price_type' => 'required|in:' . implode(',', [
                MenuOption::PRICE_TYPE_FIXED,
                MenuOption::PRICE_TYPE_PERCENTAGE,
                MenuOption::PRICE_TYPE_DURATION_BASED,
                MenuOption::PRICE_TYPE_FREE,
            ]),
            'options.*.price_value' => 'nullable|integer|min:0|max:999999',
            'options.*.duration_minutes' => 'nullable|integer|min:0|max:480', // 最大8時間
            'options.*.constraints' => 'nullable|array',
            'options.*.stock_quantity' => 'nullable|integer|min:1|max:9999',
            'options.*.is_required' => 'nullable|boolean',
            'options.*.is_active' => 'nullable|boolean',
            'options.*.sort_order' => 'nullable|integer|min:0',
        ];
    }

    /**
     * バリデーションメッセージ
     */
    public function messages(): array
    {
        return [
            // 基本情報
            'name.required' => 'メニュー名は必須です',
            'name.max' => 'メニュー名は100文字以内で入力してください',
            'display_name.max' => '表示名は100文字以内で入力してください',
            'category.max' => 'カテゴリは50文字以内で入力してください',
            'description.max' => '説明は1000文字以内で入力してください',
            
            // 価格・時間
            'base_price.required' => '基本料金は必須です',
            'base_price.integer' => '基本料金は整数で入力してください',
            'base_price.min' => '基本料金は0円以上で入力してください',
            'base_price.max' => '基本料金は999,999円以下で入力してください',
            
            'base_duration.required' => '基本時間は必須です',
            'base_duration.integer' => '基本時間は整数で入力してください',
            'base_duration.min' => '基本時間は1分以上で入力してください',
            'base_duration.max' => '基本時間は24時間以下で入力してください',
            
            'prep_duration.integer' => '準備時間は整数で入力してください',
            'prep_duration.min' => '準備時間は0分以上で入力してください',
            'prep_duration.max' => '準備時間は3時間以下で入力してください',
            
            'cleanup_duration.integer' => '片付け時間は整数で入力してください',
            'cleanup_duration.min' => '片付け時間は0分以上で入力してください',
            'cleanup_duration.max' => '片付け時間は3時間以下で入力してください',
            
            // 制約
            'booking_constraints.advance_booking_days.integer' => '事前予約日数は整数で入力してください',
            'booking_constraints.advance_booking_days.min' => '事前予約日数は0日以上で入力してください',
            'booking_constraints.advance_booking_days.max' => '事前予約日数は365日以下で入力してください',
            
            'booking_constraints.minimum_advance_hours.integer' => '最小事前予約時間は整数で入力してください',
            'booking_constraints.minimum_advance_hours.min' => '最小事前予約時間は0時間以上で入力してください',
            'booking_constraints.minimum_advance_hours.max' => '最小事前予約時間は168時間以下で入力してください',
            
            'booking_constraints.cancellation_hours.integer' => 'キャンセル期限は整数で入力してください',
            'booking_constraints.cancellation_hours.min' => 'キャンセル期限は0時間以上で入力してください',
            'booking_constraints.cancellation_hours.max' => 'キャンセル期限は168時間以下で入力してください',
            
            // その他
            'image_url.url' => '画像URLの形式が正しくありません',
            'image_url.max' => '画像URLは500文字以内で入力してください',
            'sort_order.integer' => '表示順序は整数で入力してください',
            'sort_order.min' => '表示順序は0以上で入力してください',
            
            // オプション
            'options.max' => 'オプションは最大20個まで追加できます',
            'options.*.name.required' => 'オプション名は必須です',
            'options.*.name.max' => 'オプション名は100文字以内で入力してください',
            'options.*.display_name.max' => 'オプション表示名は100文字以内で入力してください',
            'options.*.description.max' => 'オプション説明は500文字以内で入力してください',
            'options.*.price_type.required' => 'オプション価格タイプは必須です',
            'options.*.price_type.in' => '有効な価格タイプを選択してください',
            'options.*.price_value.integer' => 'オプション価格は整数で入力してください',
            'options.*.price_value.min' => 'オプション価格は0以上で入力してください',
            'options.*.price_value.max' => 'オプション価格は999,999以下で入力してください',
            'options.*.duration_minutes.integer' => 'オプション追加時間は整数で入力してください',
            'options.*.duration_minutes.min' => 'オプション追加時間は0分以上で入力してください',
            'options.*.duration_minutes.max' => 'オプション追加時間は8時間以下で入力してください',
            'options.*.stock_quantity.integer' => 'オプション在庫数は整数で入力してください',
            'options.*.stock_quantity.min' => 'オプション在庫数は1以上で入力してください',
            'options.*.stock_quantity.max' => 'オプション在庫数は9999以下で入力してください',
        ];
    }

    /**
     * バリデーション属性名
     */
    public function attributes(): array
    {
        return [
            'name' => 'メニュー名',
            'display_name' => '表示名',
            'category' => 'カテゴリ',
            'description' => '説明',
            'base_price' => '基本料金',
            'base_duration' => '基本時間',
            'prep_duration' => '準備時間',
            'cleanup_duration' => '片付け時間',
            'image_url' => '画像URL',
            'sort_order' => '表示順序',
            'options' => 'オプション',
        ];
    }

    /**
     * バリデーション前の処理
     */
    protected function prepareForValidation(): void
    {
        // 空文字列をnullに変換
        $data = $this->all();
        
        foreach (['display_name', 'category', 'description', 'image_url'] as $field) {
            if (isset($data[$field]) && $data[$field] === '') {
                $data[$field] = null;
            }
        }
        
        // オプションの空文字列もnullに変換
        if (isset($data['options']) && is_array($data['options'])) {
            foreach ($data['options'] as $index => $option) {
                foreach (['display_name', 'description'] as $field) {
                    if (isset($option[$field]) && $option[$field] === '') {
                        $data['options'][$index][$field] = null;
                    }
                }
            }
        }
        
        $this->replace($data);
    }

    /**
     * カスタムバリデーション
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // 総時間の妥当性チェック（更新時は現在の値も考慮）
            $menu = $this->route('menu'); // ルートモデルバインディングから取得
            
            $baseDuration = $this->base_duration ?? $menu->base_duration ?? 0;
            $prepDuration = $this->prep_duration ?? $menu->prep_duration ?? 0;
            $cleanupDuration = $this->cleanup_duration ?? $menu->cleanup_duration ?? 0;
            $totalDuration = $baseDuration + $prepDuration + $cleanupDuration;
            
            if ($totalDuration > 1440) { // 24時間
                $validator->errors()->add('base_duration', '総所要時間（基本時間+準備時間+片付け時間）は24時間以下にしてください');
            }
            
            // オプションの価格タイプと価格値の整合性チェック
            if ($this->has('options')) {
                foreach ($this->options as $index => $option) {
                    $priceType = $option['price_type'] ?? null;
                    $priceValue = $option['price_value'] ?? null;
                    
                    // 無料以外は価格値が必要
                    if ($priceType !== MenuOption::PRICE_TYPE_FREE && ($priceValue === null || $priceValue === 0)) {
                        $validator->errors()->add("options.{$index}.price_value", 'このオプションタイプには価格値が必要です');
                    }
                    
                    // パーセンテージタイプは100%以下
                    if ($priceType === MenuOption::PRICE_TYPE_PERCENTAGE && $priceValue > 100) {
                        $validator->errors()->add("options.{$index}.price_value", '割合価格は100%以下で入力してください');
                    }
                }
            }
        });
    }
}
