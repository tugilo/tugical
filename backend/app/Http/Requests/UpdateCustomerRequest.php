<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateCustomerRequest
 * 
 * 顧客情報更新時のバリデーション
 * 
 * @package App\Http\Requests
 */
class UpdateCustomerRequest extends FormRequest
{
    /**
     * リクエストの認可判定
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:100',
            'phone' => 'sometimes|required|string|max:20|regex:/^[0-9\-]+$/',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female,other',
            'notes' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'loyalty_rank' => 'nullable|in:new,regular,vip,premium',
        ];
    }

    /**
     * バリデーションメッセージ（日本語）
     */
    public function messages(): array
    {
        return [
            'name.required' => '名前は必須です',
            'name.max' => '名前は100文字以内で入力してください',
            'phone.required' => '電話番号は必須です',
            'phone.max' => '電話番号は20文字以内で入力してください',
            'phone.regex' => '電話番号は数字とハイフンのみで入力してください',
            'email.email' => '正しいメールアドレス形式で入力してください',
            'email.max' => 'メールアドレスは255文字以内で入力してください',
            'address.max' => '住所は500文字以内で入力してください',
            'birth_date.date' => '正しい日付形式で入力してください',
            'birth_date.before' => '生年月日は今日より前の日付を入力してください',
            'gender.in' => '性別は male, female, other のいずれかを選択してください',
            'notes.max' => '備考は1000文字以内で入力してください',
            'is_active.boolean' => '有効/無効は true または false で指定してください',
            'loyalty_rank.in' => 'ランクは new, regular, vip, premium のいずれかを選択してください',
        ];
    }
}
