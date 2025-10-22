<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * LoginRequest
 * 
 * tugical認証ログインリクエストバリデーション
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md Section 1.1 (管理者ログイン)
 * - メールアドレス・パスワード・店舗ID の3フィールド必須
 * - 適切なバリデーションルール・日本語メッセージ
 * 
 * フィールド仕様:
 * - email: 必須・メール形式・最大255文字
 * - password: 必須・最小8文字・最大255文字
 * - store_id: 必須・整数・1以上
 * 
 * @package App\Http\Requests
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class LoginRequest extends FormRequest
{
    /**
     * 認可確認
     * 
     * ログインは誰でもアクセス可能
     * 
     * @return bool 認可可否
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     * 
     * tugical_api_specification_v1.0.md Section 1.1 準拠
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email:rfc',
                'max:255',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:255',
            ],
            'store_id' => [
                'required',
                'integer',
                'min:1',
            ],
        ];
    }

    /**
     * バリデーションメッセージ（日本語）
     * 
     * .cursorrules準拠 - 日本語メッセージ100%対応
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // email バリデーションメッセージ
            'email.required' => 'メールアドレスは必須です。',
            'email.email' => '正しいメールアドレス形式で入力してください。',
            'email.max' => 'メールアドレスは255文字以内で入力してください。',

            // password バリデーションメッセージ
            'password.required' => 'パスワードは必須です。',
            'password.string' => 'パスワードは文字列で入力してください。',
            'password.min' => 'パスワードは8文字以上で入力してください。',
            'password.max' => 'パスワードは255文字以内で入力してください。',

            // store_id バリデーションメッセージ
            'store_id.required' => '店舗IDは必須です。',
            'store_id.integer' => '店舗IDは整数で入力してください。',
            'store_id.min' => '店舗IDは1以上の値を入力してください。',
        ];
    }

    /**
     * バリデーション属性名（日本語）
     * 
     * エラーメッセージ内での属性名表示用
     * 
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'email' => 'メールアドレス',
            'password' => 'パスワード',
            'store_id' => '店舗ID',
        ];
    }

    /**
     * バリデーション前の事前処理
     * 
     * データクリーニング・正規化処理
     * 
     * @return void
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            // メールアドレスの正規化（小文字化・前後空白除去）
            'email' => strtolower(trim($this->email ?? '')),
            
            // store_id の整数化
            'store_id' => is_numeric($this->store_id) ? (int) $this->store_id : $this->store_id,
        ]);
    }

    /**
     * バリデーション失敗時の処理をカスタマイズ
     * 
     * セキュリティログの記録
     * 
     * @param \Illuminate\Contracts\Validation\Validator $validator
     * @return void
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        // セキュリティログ記録（ログイン試行履歴）
        \Illuminate\Support\Facades\Log::warning('ログインバリデーション失敗', [
            'email' => $this->email,
            'store_id' => $this->store_id,
            'ip_address' => $this->ip(),
            'user_agent' => $this->userAgent(),
            'validation_errors' => $validator->errors()->toArray(),
            'timestamp' => now()->toISOString(),
        ]);

        // 親クラスの処理を実行（422エラーレスポンス）
        parent::failedValidation($validator);
    }
}
