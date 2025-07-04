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
        \Log::info('UpdateCustomerRequest received data:', $this->all());

        return [
            // 基本情報
            'name' => 'sometimes|required|string|max:100',
            'phone' => 'sometimes|required|string|max:20|regex:/^[0-9\-]+$/',
            'email' => 'nullable|email|max:255',

            // 構造化住所フィールド
            'postal_code' => 'nullable|string|max:10|regex:/^[0-9\-]+$/',
            'prefecture' => 'nullable|string|max:10',
            'city' => 'nullable|string|max:50',
            'address_line1' => 'nullable|string|max:100',
            'address_line2' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',

            // LINE情報
            'line_user_id' => 'nullable|string|max:100',
            'line_display_name' => 'nullable|string|max:100',
            'line_picture_url' => 'nullable|url|max:500',

            // その他
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
            // 基本情報
            'name.required' => '名前は必須です',
            'name.max' => '名前は100文字以内で入力してください',
            'phone.required' => '電話番号は必須です',
            'phone.max' => '電話番号は20文字以内で入力してください',
            'phone.regex' => '電話番号は数字とハイフンのみで入力してください',
            'email.email' => '正しいメールアドレス形式で入力してください',
            'email.max' => 'メールアドレスは255文字以内で入力してください',

            // 構造化住所
            'postal_code.max' => '郵便番号は10文字以内で入力してください',
            'postal_code.regex' => '郵便番号は数字とハイフンのみで入力してください',
            'prefecture.max' => '都道府県は10文字以内で入力してください',
            'city.max' => '市区町村は50文字以内で入力してください',
            'address_line1.max' => '番地・建物名は100文字以内で入力してください',
            'address_line2.max' => '部屋番号・その他は100文字以内で入力してください',
            'address.max' => '住所は500文字以内で入力してください',

            // LINE情報
            'line_user_id.max' => 'LINE User IDは100文字以内で入力してください',
            'line_display_name.max' => 'LINE表示名は100文字以内で入力してください',
            'line_picture_url.url' => '正しいURL形式で入力してください',
            'line_picture_url.max' => 'LINE画像URLは500文字以内で入力してください',

            // その他
            'birth_date.date' => '正しい日付形式で入力してください',
            'birth_date.before' => '生年月日は今日より前の日付を入力してください',
            'gender.in' => '性別は male, female, other のいずれかを選択してください',
            'notes.max' => '備考は1000文字以内で入力してください',
            'is_active.boolean' => '有効/無効は true または false で指定してください',
            'loyalty_rank.in' => 'ランクは new, regular, vip, premium のいずれかを選択してください',
        ];
    }
}
