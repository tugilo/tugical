<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

/**
 * SendNotificationRequest
 * 
 * tugical通知送信バリデーション
 * 
 * 主要機能:
 * - 手動通知送信のバリデーション
 * - 顧客存在・所属店舗確認
 * - メッセージ内容・長さ制限
 * - スケジュール送信日時検証
 * - 通知タイプ制限
 * 
 * 対応パラメータ:
 * - customer_id: 対象顧客ID（必須）
 * - type: 通知タイプ（必須）
 * - message: メッセージ内容（必須、最大1000文字）
 * - title: タイトル（任意、最大100文字）
 * - scheduled_at: 送信予定日時（任意、未来日時）
 * 
 * @package App\Http\Requests
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class SendNotificationRequest extends FormRequest
{
    /**
     * 認可確認
     * 
     * 認証ユーザーの通知送信権限を確認
     * 
     * @return bool 認可可否
     */
    public function authorize(): bool
    {
        // 認証ユーザーかつstore_idが設定されている場合のみ許可
        return Auth::check() && Auth::user()->store_id;
    }

    /**
     * バリデーションルール
     * 
     * 通知送信に必要なデータの検証ルール定義
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = Auth::user()->store_id ?? null;

        return [
            // 対象顧客ID（必須・存在確認・店舗所属確認）
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id',
                function ($attribute, $value, $fail) use ($storeId) {
                    if ($storeId) {
                        $customer = \App\Models\Customer::find($value);
                        if ($customer && $customer->store_id !== $storeId) {
                            $fail('指定された顧客はこの店舗に所属していません');
                        }
                    }
                },
            ],

            // 通知タイプ（必須・定義済みタイプのみ）
            'type' => [
                'required',
                'string',
                'in:booking_confirmed,booking_reminder,booking_cancelled,booking_updated,payment_completed,campaign,announcement,urgent,manual',
            ],

            // メッセージ内容（必須・長さ制限）
            'message' => [
                'required',
                'string',
                'min:1',
                'max:1000',
            ],

            // タイトル（任意・長さ制限）
            'title' => [
                'nullable',
                'string',
                'max:100',
            ],

            // 送信予定日時（任意・未来日時のみ）
            'scheduled_at' => [
                'nullable',
                'date',
                'after:now',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $scheduledTime = \Carbon\Carbon::parse($value);
                        $now = \Carbon\Carbon::now();
                        
                        // 最低5分後以降の設定を要求
                        if ($scheduledTime->diffInMinutes($now) < 5) {
                            $fail('送信予定日時は現在時刻から少なくとも5分後以降を指定してください');
                        }
                        
                        // 最大7日後までに制限
                        if ($scheduledTime->diffInDays($now) > 7) {
                            $fail('送信予定日時は7日以内で設定してください');
                        }
                    }
                },
            ],

            // 緊急度（任意・定義済み値のみ）
            'priority' => [
                'nullable',
                'string',
                'in:low,normal,high,urgent',
            ],

            // 配信チャネル（任意・定義済みチャネルのみ）
            'channel' => [
                'nullable',
                'string',
                'in:line,email,sms',
            ],
        ];
    }

    /**
     * バリデーション属性名（日本語）
     * 
     * エラーメッセージで使用される属性名の日本語化
     * 
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer_id' => '顧客',
            'type' => '通知タイプ',
            'message' => 'メッセージ',
            'title' => 'タイトル',
            'scheduled_at' => '送信予定日時',
            'priority' => '緊急度',
            'channel' => '配信チャネル',
        ];
    }

    /**
     * カスタムバリデーションメッセージ（日本語）
     * 
     * 各バリデーションルールの日本語エラーメッセージ定義
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // customer_id関連
            'customer_id.required' => '通知対象の顧客を選択してください',
            'customer_id.integer' => '正しい顧客IDを指定してください',
            'customer_id.exists' => '指定された顧客が見つかりません',

            // type関連
            'type.required' => '通知タイプを選択してください',
            'type.string' => '正しい通知タイプを指定してください',
            'type.in' => '選択された通知タイプは無効です',

            // message関連
            'message.required' => 'メッセージ内容を入力してください',
            'message.string' => 'メッセージは文字列で入力してください',
            'message.min' => 'メッセージは1文字以上入力してください',
            'message.max' => 'メッセージは1000文字以内で入力してください',

            // title関連
            'title.string' => 'タイトルは文字列で入力してください',
            'title.max' => 'タイトルは100文字以内で入力してください',

            // scheduled_at関連
            'scheduled_at.date' => '正しい日時形式で入力してください',
            'scheduled_at.after' => '送信予定日時は未来の日時を指定してください',

            // priority関連
            'priority.string' => '正しい緊急度を指定してください',
            'priority.in' => '緊急度は「low, normal, high, urgent」のいずれかを選択してください',

            // channel関連
            'channel.string' => '正しい配信チャネルを指定してください',
            'channel.in' => '配信チャネルは「line, email, sms」のいずれかを選択してください',
        ];
    }

    /**
     * バリデーション前の準備処理
     * 
     * バリデーション実行前にデータの正規化・前処理を実行
     * 
     * @return void
     */
    protected function prepareForValidation(): void
    {
        // メッセージの前後空白削除
        if ($this->has('message')) {
            $this->merge([
                'message' => trim($this->message),
            ]);
        }

        // タイトルの前後空白削除
        if ($this->has('title')) {
            $this->merge([
                'title' => trim($this->title),
            ]);
        }

        // 日時フォーマット正規化
        if ($this->has('scheduled_at') && $this->scheduled_at) {
            try {
                $scheduledAt = \Carbon\Carbon::parse($this->scheduled_at);
                $this->merge([
                    'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
                ]);
            } catch (\Exception $e) {
                // パースエラーは後のバリデーションで捕捉
            }
        }

        // デフォルト値設定
        $this->merge([
            'priority' => $this->priority ?? 'normal',
            'channel' => $this->channel ?? 'line',
        ]);
    }

    /**
     * バリデーション後の処理
     * 
     * バリデーション成功後の追加検証・データ変換
     * 
     * @return void
     */
    public function passedValidation(): void
    {
        // 顧客のLINE連携確認（LINE配信時）
        if ($this->channel === 'line') {
            $customer = \App\Models\Customer::find($this->customer_id);
            if ($customer && empty($customer->line_user_id)) {
                $this->validator->errors()->add(
                    'customer_id',
                    'この顧客はLINE連携されていないため、LINE通知を送信できません'
                );
            }
        }

        // 営業時間外スケジュール送信の警告
        if ($this->scheduled_at) {
            $scheduledTime = \Carbon\Carbon::parse($this->scheduled_at);
            $hour = $scheduledTime->hour;
            
            // 22時〜8時は営業時間外として警告（エラーではない）
            if ($hour >= 22 || $hour < 8) {
                // 警告ログ出力（バリデーションエラーにはしない）
                \Log::info('営業時間外スケジュール通知設定', [
                    'store_id' => Auth::user()->store_id,
                    'scheduled_at' => $this->scheduled_at,
                    'hour' => $hour,
                ]);
            }
        }
    }

    /**
     * バリデーション失敗時のレスポンス
     * 
     * バリデーション失敗時の詳細ログ出力
     * 
     * @param \Illuminate\Contracts\Validation\Validator $validator
     * @return void
     */
    public function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        \Log::warning('通知送信バリデーションエラー', [
            'store_id' => Auth::user()->store_id ?? null,
            'errors' => $validator->errors()->toArray(),
            'request_data' => $this->all(),
            'user_id' => Auth::id(),
        ]);

        parent::failedValidation($validator);
    }

    /**
     * バリデーション済みデータ取得
     * 
     * バリデーション済みデータに追加情報を付与
     * 
     * @return array 拡張されたバリデーション済みデータ
     */
    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);

        // 送信者情報追加
        if (is_null($key)) {
            $validated['sender_id'] = Auth::id();
            $validated['store_id'] = Auth::user()->store_id;
            $validated['sent_at'] = now();
            
            // 即座送信かスケジュール送信かの判定
            $validated['is_scheduled'] = !empty($validated['scheduled_at']);
        }

        return $validated;
    }
}
