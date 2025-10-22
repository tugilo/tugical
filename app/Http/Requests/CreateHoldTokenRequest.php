<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

/**
 * CreateHoldTokenRequest
 * 
 * Hold Token作成リクエストバリデーション
 * 
 * 主要機能:
 * - Hold Token作成時の包括的バリデーション
 * - マルチテナント検証（店舗所属チェック）
 * - 営業時間・リソース稼働時間チェック
 * - 競合チェック基盤（HoldTokenServiceで詳細チェック）
 * - 日本語エラーメッセージ
 * 
 * バリデーション項目:
 * - menu_id: メニューID（必須・店舗所属）
 * - resource_id: リソースID（必須・店舗所属・アクティブ）
 * - booking_date: 予約日（必須・未来日・営業日）
 * - start_time: 開始時間（必須・営業時間内）
 * - customer_id: 顧客ID（任意・店舗所属）
 * 
 * @package App\Http\Requests
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class CreateHoldTokenRequest extends FormRequest
{
    /**
     * リクエスト認可判定
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        // 認証済みユーザーのみ許可
        return auth()->check();
    }

    /**
     * バリデーションルール
     * 
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'menu_id' => [
                'required',
                'integer',
                'exists:menus,id',
            ],
            'resource_id' => [
                'required',
                'integer',
                'exists:resources,id',
            ],
            'booking_date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => [
                'required',
                'date_format:H:i',
            ],
            'customer_id' => [
                'nullable',
                'integer',
                'exists:customers,id',
            ],
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
            // menu_id
            'menu_id.required' => 'メニューIDは必須です',
            'menu_id.integer' => 'メニューIDは数値で入力してください',
            'menu_id.exists' => '指定されたメニューが見つかりません',

            // resource_id
            'resource_id.required' => 'リソースIDは必須です',
            'resource_id.integer' => 'リソースIDは数値で入力してください',
            'resource_id.exists' => '指定されたリソースが見つかりません',

            // booking_date
            'booking_date.required' => '予約日は必須です',
            'booking_date.date_format' => '予約日はY-m-d形式で入力してください',
            'booking_date.after_or_equal' => '予約日は今日以降の日付を選択してください',

            // start_time
            'start_time.required' => '開始時間は必須です',
            'start_time.date_format' => '開始時間はH:i形式で入力してください',

            // customer_id
            'customer_id.integer' => '顧客IDは数値で入力してください',
            'customer_id.exists' => '指定された顧客が見つかりません',
        ];
    }

    /**
     * カスタムバリデーション追加
     * 
     * マルチテナント検証・ビジネスロジック検証を実行
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $storeId = auth()->user()->store_id;
            $data = $this->validated();

            Log::info('Hold Token作成バリデーション開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id(),
                'request_data' => $data
            ]);

            // マルチテナント検証
            $this->validateTenantOwnership($validator, $storeId, $data);

            // リソースアクティブ状態チェック
            $this->validateResourceActive($validator, $storeId, $data);

            // 営業時間基本チェック
            $this->validateBusinessHours($validator, $storeId, $data);

            // メニューとリソースの組み合わせチェック
            $this->validateMenuResourceCompatibility($validator, $storeId, $data);
        });
    }

    /**
     * マルチテナント所属検証
     * 
     * メニュー・リソース・顧客が認証ユーザーの店舗に所属しているかチェック
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @param int $storeId 店舗ID
     * @param array $data バリデーション済みデータ
     * @return void
     */
    protected function validateTenantOwnership($validator, int $storeId, array $data): void
    {
        // メニューの店舗所属チェック
        if (isset($data['menu_id'])) {
            $menuExists = \App\Models\Menu::where('store_id', $storeId)
                ->where('id', $data['menu_id'])
                ->where('is_active', true)
                ->exists();

            if (!$menuExists) {
                Log::warning('クロステナント Menu アクセス試行（Hold Token作成）', [
                    'store_id' => $storeId,
                    'menu_id' => $data['menu_id'],
                    'user_id' => auth()->id()
                ]);
                $validator->errors()->add('menu_id', '指定されたメニューにアクセスする権限がありません');
            }
        }

        // リソースの店舗所属チェック
        if (isset($data['resource_id'])) {
            $resourceExists = \App\Models\Resource::where('store_id', $storeId)
                ->where('id', $data['resource_id'])
                ->exists();

            if (!$resourceExists) {
                Log::warning('クロステナント Resource アクセス試行（Hold Token作成）', [
                    'store_id' => $storeId,
                    'resource_id' => $data['resource_id'],
                    'user_id' => auth()->id()
                ]);
                $validator->errors()->add('resource_id', '指定されたリソースにアクセスする権限がありません');
            }
        }

        // 顧客の店舗所属チェック（指定時のみ）
        if (isset($data['customer_id'])) {
            $customerExists = \App\Models\Customer::where('store_id', $storeId)
                ->where('id', $data['customer_id'])
                ->exists();

            if (!$customerExists) {
                Log::warning('クロステナント Customer アクセス試行（Hold Token作成）', [
                    'store_id' => $storeId,
                    'customer_id' => $data['customer_id'],
                    'user_id' => auth()->id()
                ]);
                $validator->errors()->add('customer_id', '指定された顧客にアクセスする権限がありません');
            }
        }
    }

    /**
     * リソースアクティブ状態検証
     * 
     * 指定リソースがアクティブで利用可能かチェック
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @param int $storeId 店舗ID
     * @param array $data バリデーション済みデータ
     * @return void
     */
    protected function validateResourceActive($validator, int $storeId, array $data): void
    {
        if (!isset($data['resource_id'])) {
            return;
        }

        $resource = \App\Models\Resource::where('store_id', $storeId)
            ->find($data['resource_id']);

        if ($resource && !$resource->is_active) {
            $validator->errors()->add('resource_id', '指定されたリソースは現在利用できません');
        }
    }

    /**
     * 営業時間基本チェック
     * 
     * 指定日・時間が営業時間内かの基本チェック
     * 詳細チェックはAvailabilityServiceで実行
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @param int $storeId 店舗ID
     * @param array $data バリデーション済みデータ
     * @return void
     */
    protected function validateBusinessHours($validator, int $storeId, array $data): void
    {
        if (!isset($data['booking_date']) || !isset($data['start_time'])) {
            return;
        }

        try {
            $store = \App\Models\Store::find($storeId);
            
            if (!$store || !$store->business_hours) {
                $validator->errors()->add('booking_date', '営業時間情報が設定されていません');
                return;
            }

            // 特別営業カレンダーチェック
            $specialCalendar = \App\Models\BusinessCalendar::where('store_id', $storeId)
                ->whereDate('date', $data['booking_date'])
                ->first();

            if ($specialCalendar && $specialCalendar->is_closed) {
                $validator->errors()->add('booking_date', '指定日は定休日です');
                return;
            }

            // 通常営業時間チェック
            $dayOfWeek = \Carbon\Carbon::parse($data['booking_date'])->format('w');
            $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            $dayName = $dayNames[$dayOfWeek];

            $businessHours = $store->business_hours;
            
            if (!isset($businessHours[$dayName]) || !$businessHours[$dayName]['is_open']) {
                $validator->errors()->add('booking_date', '指定日は定休日です');
                return;
            }

            // 開始時間が営業時間内かチェック（基本チェックのみ）
            $dayHours = $businessHours[$dayName];
            $startTime = $data['start_time'];
            
            if ($startTime < $dayHours['start'] || $startTime >= $dayHours['end']) {
                $validator->errors()->add('start_time', '指定時間は営業時間外です');
            }

        } catch (\Exception $e) {
            Log::error('営業時間チェックエラー（Hold Token作成）', [
                'store_id' => $storeId,
                'date' => $data['booking_date'],
                'start_time' => $data['start_time'],
                'error' => $e->getMessage()
            ]);
            $validator->errors()->add('booking_date', '営業時間の確認に失敗しました');
        }
    }

    /**
     * メニューとリソースの組み合わせ検証
     * 
     * 指定メニューが指定リソースで実行可能かチェック
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @param int $storeId 店舗ID
     * @param array $data バリデーション済みデータ
     * @return void
     */
    protected function validateMenuResourceCompatibility($validator, int $storeId, array $data): void
    {
        if (!isset($data['menu_id']) || !isset($data['resource_id'])) {
            return;
        }

        try {
            $menu = \App\Models\Menu::where('store_id', $storeId)
                ->find($data['menu_id']);

            if (!$menu) {
                return; // 既に別のバリデーションでエラー
            }

            // メニューに利用可能リソースが指定されている場合
            if ($menu->available_resources && is_array($menu->available_resources)) {
                if (!in_array($data['resource_id'], $menu->available_resources)) {
                    $validator->errors()->add('resource_id', '指定されたリソースはこのメニューでは利用できません');
                }
            }

            // リソースタイプとメニューカテゴリーの基本的な整合性チェック
            $resource = \App\Models\Resource::where('store_id', $storeId)
                ->find($data['resource_id']);

            if ($resource) {
                // 基本的な組み合わせチェック（業種に応じてカスタマイズ可能）
                $incompatibleCombinations = [
                    // 例: 設備タイプのリソースでパーソナルメニューは不可
                    'equipment' => ['personal_consultation'],
                    // 他の組み合わせ制約も追加可能
                ];

                $resourceType = $resource->type;
                $menuCategory = $menu->category;

                if (isset($incompatibleCombinations[$resourceType]) && 
                    in_array($menuCategory, $incompatibleCombinations[$resourceType])) {
                    $validator->errors()->add('resource_id', 'このメニューとリソースの組み合わせは利用できません');
                }
            }

        } catch (\Exception $e) {
            Log::error('メニューリソース組み合わせチェックエラー（Hold Token作成）', [
                'store_id' => $storeId,
                'menu_id' => $data['menu_id'],
                'resource_id' => $data['resource_id'],
                'error' => $e->getMessage()
            ]);
            $validator->errors()->add('resource_id', 'メニューとリソースの組み合わせ確認に失敗しました');
        }
    }

    /**
     * 認証ユーザーの店舗ID取得
     * 
     * @return int 店舗ID
     */
    public function getStoreId(): int
    {
        return auth()->user()->store_id;
    }

    /**
     * バリデーション失敗時のログ出力
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        Log::warning('Hold Token作成バリデーション失敗', [
            'store_id' => auth()->user()->store_id ?? null,
            'user_id' => auth()->id(),
            'request_data' => $this->all(),
            'validation_errors' => $validator->errors()->toArray()
        ]);

        parent::failedValidation($validator);
    }
}
