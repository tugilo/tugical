<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Resource;

/**
 * CreateResourceRequest
 * 
 * リソース作成用バリデーション
 * 統一リソース概念に対応したバリデーションルール
 * 
 * @package App\Http\Requests
 */
class CreateResourceRequest extends FormRequest
{
    /**
     * ユーザーがこのリクエストを行う権限があるかを判定
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        return [
            // 基本情報
            'type' => 'required|in:' . implode(',', [
                Resource::TYPE_STAFF,
                Resource::TYPE_ROOM,
                Resource::TYPE_EQUIPMENT,
                Resource::TYPE_VEHICLE,
            ]),
            'name' => 'required|string|max:100',
            'display_name' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            
            // 属性・設定
            'attributes' => 'nullable|array',
            'working_hours' => 'nullable|array',
            'constraints' => 'nullable|array',
            
            // 効率・料金
            'efficiency_rate' => 'nullable|numeric|min:0.1|max:3.0',
            'hourly_rate_diff' => 'nullable|integer|min:-50000|max:50000',
            'capacity' => 'nullable|integer|min:1|max:1000',
            
            // 設備・ルール
            'equipment_specs' => 'nullable|array',
            'booking_rules' => 'nullable|array',
            
            // その他
            'image_url' => 'nullable|url|max:500',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ];
    }

    /**
     * バリデーションメッセージ
     */
    public function messages(): array
    {
        return [
            // 基本情報
            'type.required' => 'リソースタイプは必須です',
            'type.in' => '有効なリソースタイプを選択してください',
            'name.required' => 'リソース名は必須です',
            'name.string' => 'リソース名は文字列で入力してください',
            'name.max' => 'リソース名は100文字以内で入力してください',
            'display_name.string' => '表示名は文字列で入力してください',
            'display_name.max' => '表示名は100文字以内で入力してください',
            'description.string' => '説明は文字列で入力してください',
            'description.max' => '説明は1000文字以内で入力してください',
            
            // 属性・設定
            'attributes.array' => '属性は配列形式で入力してください',
            'working_hours.array' => '稼働時間は配列形式で入力してください',
            'constraints.array' => '制約は配列形式で入力してください',
            
            // 効率・料金
            'efficiency_rate.numeric' => '効率率は数値で入力してください',
            'efficiency_rate.min' => '効率率は0.1以上で入力してください',
            'efficiency_rate.max' => '効率率は3.0以下で入力してください',
            'hourly_rate_diff.integer' => '時間料金差は整数で入力してください',
            'hourly_rate_diff.min' => '時間料金差は-50,000円以上で入力してください',
            'hourly_rate_diff.max' => '時間料金差は50,000円以下で入力してください',
            'capacity.integer' => '容量は整数で入力してください',
            'capacity.min' => '容量は1以上で入力してください',
            'capacity.max' => '容量は1000以下で入力してください',
            
            // 設備・ルール
            'equipment_specs.array' => '設備仕様は配列形式で入力してください',
            'booking_rules.array' => '予約ルールは配列形式で入力してください',
            
            // その他
            'image_url.url' => '画像URLの形式が正しくありません',
            'image_url.max' => '画像URLは500文字以内で入力してください',
            'sort_order.integer' => '表示順序は整数で入力してください',
            'sort_order.min' => '表示順序は0以上で入力してください',
        ];
    }

    /**
     * バリデーション後の追加検証
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // タイプ別の追加バリデーション
            $this->validateByType($validator);
            
            // 稼働時間の妥当性チェック
            $this->validateWorkingHours($validator);
            
            // 効率率の妥当性チェック
            $this->validateEfficiencyRate($validator);
        });
    }

    /**
     * タイプ別バリデーション
     */
    protected function validateByType($validator): void
    {
        $type = $this->input('type');
        
        switch ($type) {
            case Resource::TYPE_STAFF:
                // スタッフの場合、容量は通常1
                if ($this->filled('capacity') && $this->input('capacity') > 10) {
                    $validator->errors()->add('capacity', 'スタッフの容量は通常10人以下です');
                }
                break;
                
            case Resource::TYPE_ROOM:
                // 部屋の場合、効率率は1.0が標準
                if ($this->filled('efficiency_rate') && abs($this->input('efficiency_rate') - 1.0) > 0.2) {
                    $validator->errors()->add('efficiency_rate', '部屋の効率率は0.8〜1.2の範囲が推奨です');
                }
                break;
                
            case Resource::TYPE_EQUIPMENT:
                // 設備の場合、設備仕様が推奨
                if (!$this->filled('equipment_specs') || empty($this->input('equipment_specs'))) {
                    // 警告レベル（エラーにはしない）
                }
                break;
                
            case Resource::TYPE_VEHICLE:
                // 車両の場合、座席数などの情報が推奨
                if (!$this->filled('attributes') || !isset($this->input('attributes')['seating_capacity'])) {
                    // 警告レベル（エラーにはしない）
                }
                break;
        }
    }

    /**
     * 稼働時間バリデーション
     */
    protected function validateWorkingHours($validator): void
    {
        if (!$this->filled('working_hours')) {
            return;
        }

        $workingHours = $this->input('working_hours');
        $daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        foreach ($daysOfWeek as $day) {
            if (isset($workingHours[$day]) && !isset($workingHours[$day]['off'])) {
                $dayHours = $workingHours[$day];
                
                if (isset($dayHours['start']) && isset($dayHours['end'])) {
                    // 時間フォーマットチェック
                    if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $dayHours['start'])) {
                        $validator->errors()->add('working_hours', "{$day}の開始時間の形式が正しくありません（HH:MM形式で入力してください）");
                    }
                    
                    if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $dayHours['end'])) {
                        $validator->errors()->add('working_hours', "{$day}の終了時間の形式が正しくありません（HH:MM形式で入力してください）");
                    }
                    
                    // 開始時間 < 終了時間チェック
                    if ($dayHours['start'] >= $dayHours['end']) {
                        $validator->errors()->add('working_hours', "{$day}の終了時間は開始時間より後に設定してください");
                    }
                }
            }
        }
    }

    /**
     * 効率率バリデーション
     */
    protected function validateEfficiencyRate($validator): void
    {
        if (!$this->filled('efficiency_rate')) {
            return;
        }

        $efficiencyRate = $this->input('efficiency_rate');
        $type = $this->input('type');
        
        // タイプ別の適切な効率率範囲
        $typeRanges = Resource::getAvailableTypes();
        
        if (isset($typeRanges[$type]['efficiency_range'])) {
            [$min, $max] = $typeRanges[$type]['efficiency_range'];
            
            if ($efficiencyRate < $min || $efficiencyRate > $max) {
                $validator->errors()->add('efficiency_rate', 
                    "{$typeRanges[$type]['name']}の効率率は{$min}〜{$max}の範囲で設定してください");
            }
        }
    }

    /**
     * 認証ユーザーの店舗ID取得
     */
    public function getStoreId(): int
    {
        return auth()->user()->store_id;
    }
} 