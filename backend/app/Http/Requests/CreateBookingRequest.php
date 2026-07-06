<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * CreateBookingRequest
 * 
 * 予約作成用フォームリクエスト
 * 
 * 管理者による予約作成時のバリデーション
 * - 必須フィールド検証
 * - データ形式検証
 * - 外部キー存在確認
 * - 日本語エラーメッセージ対応
 * 
 * @package App\Http\Requests
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class CreateBookingRequest extends FormRequest
{
    /**
     * 認可チェック
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        // 認証ユーザーの場合は許可
        // 詳細な権限チェックはコントローラーで実施
        return auth()->check();
    }

    /**
     * バリデーションルール
     * 
     * tugical_api_specification_v1.0.md 準拠
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // 必須項目
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id'
            ],
            'menu_id' => [
                'required',
                'integer',
                'exists:menus,id'
            ],
            'booking_date' => [
                'required',
                'date',
                'date_format:Y-m-d',
                'after_or_equal:today'
            ],
            'start_time' => [
                'required',
                'date_format:H:i'
            ],

            // オプション項目
            'resource_id' => [
                'nullable',
                'integer',
                'min:1',
                'exists:resources,id'
            ],
            'end_time' => [
                'nullable',
                'date_format:H:i',
                'after:start_time'
            ],
            'customer_notes' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'staff_notes' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'booking_source' => [
                'nullable',
                'string',
                'in:phone,walk_in,online,admin'
            ],

            // オプション・Hold Token関連
            'option_ids' => [
                'nullable',
                'array'
            ],
            'option_ids.*' => [
                'integer',
                'exists:menu_options,id'
            ],
            'hold_token' => [
                'nullable',
                'string',
                'size:60'
            ],

            // 自動承認モード
            'auto_approval' => [
                'nullable',
                'boolean'
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
            'customer_id.required' => '顧客を選択してください',
            'customer_id.integer' => '顧客IDは数値で入力してください',
            'customer_id.exists' => '選択された顧客が見つかりません',

            // メニュー関連
            'menu_id.required' => 'メニューを選択してください',
            'menu_id.integer' => 'メニューIDは数値で入力してください',
            'menu_id.exists' => '選択されたメニューが見つかりません',

            // 予約日時関連
            'booking_date.required' => '予約日を選択してください',
            'booking_date.date' => '正しい日付形式で入力してください',
            'booking_date.date_format' => '予約日はYYYY-MM-DD形式で入力してください',
            'booking_date.after_or_equal' => '予約日は今日以降の日付を選択してください',

            'start_time.required' => '開始時間を選択してください',
            'start_time.date_format' => '開始時間はHH:MM形式で入力してください',

            'end_time.date_format' => '終了時間はHH:MM形式で入力してください',
            'end_time.after' => '終了時間は開始時間より後に設定してください',

            // リソース関連
            'resource_id.integer' => 'スタッフIDは数値で入力してください',
            'resource_id.exists' => '選択されたスタッフが見つかりません',

            // 備考関連
            'customer_notes.string' => 'お客様要望は文字列で入力してください',
            'customer_notes.max' => 'お客様要望は1000文字以内で入力してください',

            'staff_notes.string' => 'スタッフメモは文字列で入力してください',
            'staff_notes.max' => 'スタッフメモは1000文字以内で入力してください',

            // 予約経路
            'booking_source.string' => '予約経路は文字列で入力してください',
            'booking_source.in' => '予約経路は phone, walk_in, online, admin のいずれかを選択してください',

            // オプション関連
            'option_ids.array' => 'オプションは配列形式で送信してください',
            'option_ids.*.integer' => 'オプションIDは数値で入力してください',
            'option_ids.*.exists' => '選択されたオプションが見つかりません',

            // Hold Token
            'hold_token.string' => 'Hold Tokenは文字列で入力してください',
            'hold_token.size' => 'Hold Tokenは60文字である必要があります',

            // 自動承認
            'auto_approval.boolean' => '自動承認フラグはtrue/falseで入力してください'
        ];
    }

    /**
     * カスタムバリデーション
     * 
     * 追加のビジネスロジック検証を実装
     * 
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // 1. 営業時間チェック（基本的な形式チェック）
            if ($this->filled('start_time') && $this->filled('end_time')) {
                $startTime = $this->get('start_time');
                $endTime = $this->get('end_time');

                // 基本的な時間妥当性チェック
                if (strtotime($startTime) >= strtotime($endTime)) {
                    $validator->errors()->add('end_time', '終了時間は開始時間より後に設定してください');
                }
            }

            // 2. 店舗所属チェック（マルチテナント）
            $storeId = auth()->user()->store_id ?? null;

            if ($storeId && $this->filled('customer_id')) {
                $customer = \App\Models\Customer::where('id', $this->get('customer_id'))
                    ->where('store_id', $storeId)
                    ->first();
                if (!$customer) {
                    $validator->errors()->add('customer_id', '選択された顧客はこの店舗に登録されていません');
                }
            }

            if ($storeId && $this->filled('menu_id')) {
                $menu = \App\Models\Menu::where('id', $this->get('menu_id'))
                    ->where('store_id', $storeId)
                    ->first();
                if (!$menu) {
                    $validator->errors()->add('menu_id', '選択されたメニューはこの店舗で提供されていません');
                }
            }

            if ($storeId && $this->filled('resource_id')) {
                $resource = \App\Models\Resource::where('id', $this->get('resource_id'))
                    ->where('store_id', $storeId)
                    ->first();
                if (!$resource) {
                    $validator->errors()->add('resource_id', '選択されたスタッフはこの店舗に所属していません');
                }
            }

            // 3. オプション・メニュー関連性チェック
            if ($this->filled('menu_id') && $this->filled('option_ids')) {
                $menuId = $this->get('menu_id');
                $optionIds = $this->get('option_ids');

                foreach ($optionIds as $optionId) {
                    $option = \App\Models\MenuOption::where('id', $optionId)
                        ->where('menu_id', $menuId)
                        ->first();
                    if (!$option) {
                        $validator->errors()->add('option_ids', "選択されたオプション（ID: {$optionId}）は選択されたメニューで利用できません");
                        break;
                    }
                }
            }
        });
    }

    /**
     * バリデーション失敗時のレスポンス
     * 
     * API仕様に準拠したエラーレスポンス形式
     * 
     * @param \Illuminate\Contracts\Validation\Validator $validator
     * @return \Illuminate\Http\JsonResponse
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        // デバッグ: バリデーションエラーの詳細をログに記録
        \Log::error('予約作成バリデーションエラー', [
            'all_input_data' => $this->all(),
            'validation_errors' => $validator->errors()->toArray(),
            'failed_rules' => $validator->failed(),
            'user_id' => auth()->id(),
            'store_id' => auth()->user()->store_id ?? null,
            'ip_address' => $this->ip(),
            'user_agent' => $this->userAgent(),
            'url' => $this->fullUrl(),
            'method' => $this->method(),
        ]);

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

    /**
     * バリデーション前の前処理
     * 
     * フロントエンドからの特殊値を正規化
     */
    protected function prepareForValidation(): void
    {
        // resource_id が 0 の場合は null に変換（指定なし）
        if ($this->has('resource_id') && $this->get('resource_id') === 0) {
            $this->merge(['resource_id' => null]);
        }

        // customer_id, menu_id が文字列の場合は整数に変換
        if ($this->has('customer_id') && is_string($this->get('customer_id'))) {
            $this->merge(['customer_id' => (int) $this->get('customer_id')]);
        }

        if ($this->has('menu_id') && is_string($this->get('menu_id'))) {
            $this->merge(['menu_id' => (int) $this->get('menu_id')]);
        }

        if ($this->has('resource_id') && is_string($this->get('resource_id'))) {
            $resourceId = (int) $this->get('resource_id');
            $this->merge(['resource_id' => $resourceId === 0 ? null : $resourceId]);
        }
    }
}
