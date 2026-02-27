<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateBookingRequest
 * 
 * 予約更新用フォームリクエスト
 * 
 * 管理者による既存予約更新時のバリデーション
 * - 部分更新対応（すべてのフィールドがオプション）
 * - マルチテナント対応検証
 * - 日本語エラーメッセージ対応
 * 
 * @package App\Http\Requests
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class UpdateBookingRequest extends FormRequest
{
    /**
     * 認可チェック
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        // 認証ユーザーの場合は許可
        // 詳細な権限チェック・予約所有権チェックはコントローラーで実施
        return auth()->check();
    }

    /**
     * バリデーションルール
     * 
     * 部分更新対応のため、すべてのフィールドはオプション
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // 基本予約情報（部分更新対応）
            'customer_id' => [
                'sometimes',
                'integer',
                'exists:customers,id'
            ],
            'menu_id' => [
                'sometimes',
                'integer',
                'exists:menus,id'
            ],
            'resource_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:resources,id'
            ],
            
            // 日時情報
            'booking_date' => [
                'sometimes',
                'date',
                'date_format:Y-m-d',
                'after_or_equal:today'  // 更新時は当日も許可
            ],
            'start_time' => [
                'sometimes',
                'date_format:H:i'
            ],
            'end_time' => [
                'sometimes',
                'nullable',
                'date_format:H:i',
                'after:start_time'
            ],
            
            // ステータス（管理者のみ更新可能）
            'status' => [
                'sometimes',
                'string',
                'in:pending,confirmed,cancelled,completed,no_show'
            ],
            
            // 備考・メモ
            'customer_notes' => [
                'sometimes',
                'nullable',
                'string',
                'max:1000'
            ],
            'staff_notes' => [
                'sometimes',
                'nullable',
                'string',
                'max:1000'
            ],
            
            // 料金関連（管理者による手動調整）
            'total_price' => [
                'sometimes',
                'integer',
                'min:0',
                'max:999999'
            ],
            
            // オプション更新
            'option_ids' => [
                'sometimes',
                'nullable',
                'array'
            ],
            'option_ids.*' => [
                'integer',
                'exists:menu_options,id'
            ],
            
            // 予約経路
            'booking_source' => [
                'sometimes',
                'string',
                'in:phone,walk_in,online,admin'
            ]
        ];
    }

    /**
     * バリデーションメッセージ（日本語）
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // 顧客関連
            'customer_id.integer' => '顧客IDは数値で入力してください',
            'customer_id.exists' => '選択された顧客が見つかりません',
            
            // メニュー関連
            'menu_id.integer' => 'メニューIDは数値で入力してください',
            'menu_id.exists' => '選択されたメニューが見つかりません',
            
            // リソース関連
            'resource_id.integer' => 'スタッフIDは数値で入力してください',
            'resource_id.exists' => '選択されたスタッフが見つかりません',
            
            // 日時関連
            'booking_date.date' => '正しい日付形式で入力してください',
            'booking_date.date_format' => '予約日はYYYY-MM-DD形式で入力してください',
            'booking_date.after_or_equal' => '予約日は今日以降の日付を選択してください',
            
            'start_time.date_format' => '開始時間はHH:MM形式で入力してください',
            'end_time.date_format' => '終了時間はHH:MM形式で入力してください',
            'end_time.after' => '終了時間は開始時間より後に設定してください',
            
            // ステータス
            'status.string' => 'ステータスは文字列で入力してください',
            'status.in' => 'ステータスは pending, confirmed, cancelled, completed, no_show のいずれかを選択してください',
            
            // 備考・メモ
            'customer_notes.string' => 'お客様要望は文字列で入力してください',
            'customer_notes.max' => 'お客様要望は1000文字以内で入力してください',
            
            'staff_notes.string' => 'スタッフメモは文字列で入力してください',
            'staff_notes.max' => 'スタッフメモは1000文字以内で入力してください',
            
            // 料金
            'total_price.integer' => '料金は数値で入力してください',
            'total_price.min' => '料金は0円以上で入力してください',
            'total_price.max' => '料金は999,999円以下で入力してください',
            
            // オプション
            'option_ids.array' => 'オプションは配列形式で送信してください',
            'option_ids.*.integer' => 'オプションIDは数値で入力してください',
            'option_ids.*.exists' => '選択されたオプションが見つかりません',
            
            // 予約経路
            'booking_source.string' => '予約経路は文字列で入力してください',
            'booking_source.in' => '予約経路は phone, walk_in, online, admin のいずれかを選択してください'
        ];
    }

    /**
     * カスタムバリデーション
     * 
     * 更新時特有のビジネスロジック検証
     * 
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $storeId = auth()->user()->store_id ?? null;
            
            // 1. 時間妥当性チェック
            if ($this->filled(['start_time', 'end_time'])) {
                $startTime = $this->get('start_time');
                $endTime = $this->get('end_time');
                
                if ($endTime && strtotime($startTime) >= strtotime($endTime)) {
                    $validator->errors()->add('end_time', '終了時間は開始時間より後に設定してください');
                }
            }
            
            // 2. マルチテナント所属チェック
            if ($storeId) {
                // 顧客所属チェック
                if ($this->filled('customer_id')) {
                    $customer = \App\Models\Customer::where('id', $this->get('customer_id'))
                                                    ->where('store_id', $storeId)
                                                    ->first();
                    if (!$customer) {
                        $validator->errors()->add('customer_id', '選択された顧客はこの店舗に登録されていません');
                    }
                }
                
                // メニュー所属チェック
                if ($this->filled('menu_id')) {
                    $menu = \App\Models\Menu::where('id', $this->get('menu_id'))
                                            ->where('store_id', $storeId)
                                            ->first();
                    if (!$menu) {
                        $validator->errors()->add('menu_id', '選択されたメニューはこの店舗で提供されていません');
                    }
                }
                
                // リソース所属チェック
                if ($this->filled('resource_id') && $this->get('resource_id')) {
                    $resource = \App\Models\Resource::where('id', $this->get('resource_id'))
                                                    ->where('store_id', $storeId)
                                                    ->first();
                    if (!$resource) {
                        $validator->errors()->add('resource_id', '選択されたスタッフはこの店舗に所属していません');
                    }
                }
            }
            
            // 3. オプション・メニュー関連性チェック
            if ($this->filled('option_ids') && $this->get('option_ids')) {
                $optionIds = $this->get('option_ids');
                
                // メニューIDが指定されている場合はそれを使用
                // されていない場合は既存予約のメニューIDを使用（要BookingModelの取得）
                $menuId = $this->get('menu_id');
                
                if ($menuId) {
                    foreach ($optionIds as $optionId) {
                        $option = \App\Models\MenuOption::where('id', $optionId)
                                                       ->where('menu_id', $menuId)
                                                       ->first();
                        if (!$option) {
                            $validator->errors()->add('option_ids', "選択されたオプション（ID: {$optionId}）は指定されたメニューで利用できません");
                            break;
                        }
                    }
                }
            }
            
            // 4. ステータス変更可能性チェック（基本的な制約）
            if ($this->filled('status')) {
                $newStatus = $this->get('status');
                
                // キャンセル済み予約は基本的に変更不可（管理者権限で例外あり）
                // 詳細なステータス遷移チェックはBookingServiceで実施
                
                // completed → その他への変更は警告
                // no_show → confirmed への変更は警告
                // など、ビジネスロジックに依存する部分は主にサービス層で処理
            }
        });
    }

    /**
     * バリデーション失敗時のレスポンス
     * 
     * API仕様に準拠したエラーレスポンス形式
     * 
     * @param \Illuminate\Contracts\Validation\Validator $validator
     * @return void
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $response = response()->json([
            'success' => false,
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'message' => '入力内容に誤りがあります',
                'details' => $validator->errors()
            ],
            'meta' => [
                'timestamp' => now()->toISOString()
            ]
        ], 422);

        throw new \Illuminate\Validation\ValidationException($validator, $response);
    }

    /**
     * 更新フィールドのみを取得
     * 
     * 部分更新のため、実際に送信されたフィールドのみを取得
     * 
     * @return array
     */
    public function getUpdateData(): array
    {
        return $this->only([
            'customer_id',
            'menu_id', 
            'resource_id',
            'booking_date',
            'start_time',
            'end_time',
            'status',
            'customer_notes',
            'staff_notes',
            'total_price',
            'option_ids',
            'booking_source'
        ]);
    }

    /**
     * 店舗IDを取得
     * 
     * マルチテナント対応用ヘルパーメソッド
     * 
     * @return int|null
     */
    public function getStoreId(): ?int
    {
        return auth()->user()->store_id ?? null;
    }
}
