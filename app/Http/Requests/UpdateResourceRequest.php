<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Resource;

/**
 * UpdateResourceRequest
 * 
 * リソース更新用バリデーション
 * 統一リソース概念に対応した更新バリデーションルール
 * 
 * @package App\Http\Requests
 */
class UpdateResourceRequest extends FormRequest
{
    /**
     * ユーザーがこのリクエストを行う権限があるかを判定
     */
    public function authorize(): bool
    {
        // リソースが現在の店舗に属しているかチェック
        $resource = $this->route('resource');
        return auth()->check() && 
               $resource && 
               $resource->store_id === auth()->user()->store_id;
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        $resourceId = $this->route('resource')?->id;
        
        return [
            // 基本情報（更新時はtype変更不可）
            'type' => 'sometimes|in:' . implode(',', [
                Resource::TYPE_STAFF,
                Resource::TYPE_ROOM,
                Resource::TYPE_EQUIPMENT,
                Resource::TYPE_VEHICLE,
            ]),
            'name' => 'sometimes|string|max:100',
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
            'type.in' => '有効なリソースタイプを選択してください',
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
            // 既存リソースの稼働状況チェック
            $this->validateActiveBookings($validator);
            
            // 稼働時間の妥当性チェック
            $this->validateWorkingHours($validator);
            
            // 効率率の妥当性チェック
            $this->validateEfficiencyRate($validator);
            
            // タイプ変更制限
            $this->validateTypeChange($validator);
        });
    }

    /**
     * アクティブな予約がある場合の制限チェック
     */
    protected function validateActiveBookings($validator): void
    {
        $resource = $this->route('resource');
        
        if (!$resource) {
            return;
        }

        // 稼働中または今後の予約があるかチェック
        $hasActiveBookings = $resource->bookings()
            ->whereIn('status', ['confirmed', 'pending'])
            ->where(function ($query) {
                $query->where('booking_date', '>', now()->toDateString())
                      ->orWhere(function ($q) {
                          $q->where('booking_date', now()->toDateString())
                            ->where('end_time', '>', now()->toTimeString());
                      });
            })
            ->exists();

        if ($hasActiveBookings) {
            // 重要な設定変更を制限
            if ($this->has('is_active') && !$this->input('is_active')) {
                $validator->errors()->add('is_active', 'アクティブな予約があるため、リソースを無効化できません');
            }
            
            if ($this->has('working_hours') && $this->input('working_hours') !== $resource->working_hours) {
                $validator->errors()->add('working_hours', 'アクティブな予約があるため、稼働時間の大幅な変更はできません');
            }
            
            if ($this->has('capacity') && $this->input('capacity') < $resource->capacity) {
                $validator->errors()->add('capacity', 'アクティブな予約があるため、容量を減らすことはできません');
            }
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

        $resource = $this->route('resource');
        $efficiencyRate = $this->input('efficiency_rate');
        $type = $this->input('type', $resource?->type);
        
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
     * タイプ変更制限
     */
    protected function validateTypeChange($validator): void
    {
        if (!$this->has('type')) {
            return;
        }

        $resource = $this->route('resource');
        $newType = $this->input('type');
        
        if ($resource && $resource->type !== $newType) {
            // 予約がある場合はタイプ変更不可
            $hasBookings = $resource->bookings()->exists();
            
            if ($hasBookings) {
                $validator->errors()->add('type', '予約履歴があるリソースのタイプは変更できません');
            }
            
            // タイプ変更時の特別な警告
            $typeNames = Resource::getAvailableTypes();
            $oldTypeName = $typeNames[$resource->type]['name'] ?? $resource->type;
            $newTypeName = $typeNames[$newType]['name'] ?? $newType;
            
            // ログに記録（重要な変更のため）
            \Log::info('リソースタイプ変更', [
                'resource_id' => $resource->id,
                'old_type' => $resource->type,
                'new_type' => $newType,
                'user_id' => auth()->id(),
                'store_id' => auth()->user()->store_id,
            ]);
        }
    }

    /**
     * 認証ユーザーの店舗ID取得
     */
    public function getStoreId(): int
    {
        return auth()->user()->store_id;
    }

    /**
     * 更新対象リソース取得
     */
    public function getResource(): ?Resource
    {
        return $this->route('resource');
    }
} 