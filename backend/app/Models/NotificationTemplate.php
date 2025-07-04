<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * 通知テンプレートモデル - 業種別通知テンプレート管理
 * 
 * tugicalサービスの通知テンプレートシステムを管理
 * 業種別カスタマイズ・変数置換・多言語対応・LINE リッチメッセージ対応
 * 
 * 主要機能:
 * - 業種別テンプレートカスタマイズ（美容/クリニック/レンタル/スクール/アクティビティ）
 * - 変数置換システム（顧客名、予約情報、店舗情報等）
 * - LINEリッチメッセージ対応（テキスト/画像/ボタン/カルーセル）
 * - 多言語対応（日本語/英語）
 * - テンプレート分類・管理
 * - プレビュー・テスト送信機能
 * 
 * テンプレート種別:
 * - booking_created: 予約作成時
 * - booking_confirmed: 予約確定時
 * - booking_reminder: 予約リマインダー
 * - booking_cancelled: 予約キャンセル時
 * - promotional: プロモーション
 * - welcome: 新規顧客歓迎
 * - birthday: 誕生日祝い
 * 
 * 変数置換対応:
 * - {customer_name}: 顧客名
 * - {booking_number}: 予約番号
 * - {booking_date}: 予約日
 * - {booking_time}: 予約時間
 * - {menu_name}: メニュー名
 * - {store_name}: 店舗名
 * - {total_price}: 料金
 * 
 * 関連テーブル:
 * - store: 所属店舗（多対1）
 * - notifications: 通知実績（1対多）
 * 
 * @property int $id テンプレートID
 * @property int $store_id 店舗ID
 * @property string $name テンプレート名
 * @property string $type テンプレートタイプ
 * @property string $industry_type 対象業種（beauty/clinic/rental/school/activity/all）
 * @property string $language 言語（ja/en）
 * @property string $title 通知タイトル
 * @property string $message 通知本文
 * @property string $message_type メッセージタイプ（text/rich）
 * @property array|null $rich_message_data リッチメッセージデータ（JSON: LINE Rich Message）
 * @property array $variables 利用可能変数（JSON: 変数一覧・説明）
 * @property array|null $preview_data プレビューデータ（JSON: テスト用データ）
 * @property string|null $description 説明
 * @property bool $is_active アクティブ状態
 * @property bool $is_system_template システムテンプレートフラグ
 * @property int $usage_count 使用回数
 * @property Carbon|null $last_used_at 最終使用日時
 * @property Carbon $created_at 作成日時
 * @property Carbon $updated_at 更新日時
 * 
 * @property-read Store $store 所属店舗
 * @property-read \Illuminate\Database\Eloquent\Collection<Notification> $notifications 通知実績一覧
 */
class NotificationTemplate extends Model
{
    use HasFactory;

    /**
     * テーブル名
     */
    protected $table = 'notification_templates';

    /**
     * 一括代入から保護する属性
     * 
     * 開発の柔軟性を重視し、IDのみを保護
     * これにより新しいフィールド追加時にfillableの更新が不要になる
     */
    protected $guarded = ['id'];

    /**
     * 属性のキャスト設定
     */
    protected $casts = [
        'rich_message_data' => 'array',
        'variables' => 'array',
        'preview_data' => 'array',
        'is_active' => 'boolean',
        'is_system_template' => 'boolean',
        'usage_count' => 'integer',
        'last_used_at' => 'datetime',
    ];

    /**
     * テンプレートタイプ定数
     */
    public const TYPE_BOOKING_CREATED = 'booking_created';
    public const TYPE_BOOKING_CONFIRMED = 'booking_confirmed';
    public const TYPE_BOOKING_REMINDER = 'booking_reminder';
    public const TYPE_BOOKING_CANCELLED = 'booking_cancelled';
    public const TYPE_PROMOTIONAL = 'promotional';
    public const TYPE_WELCOME = 'welcome';
    public const TYPE_BIRTHDAY = 'birthday';

    /**
     * メッセージタイプ定数
     */
    public const MESSAGE_TYPE_TEXT = 'text';
    public const MESSAGE_TYPE_RICH = 'rich';

    /**
     * 言語定数
     */
    public const LANGUAGE_JAPANESE = 'ja';
    public const LANGUAGE_ENGLISH = 'en';

    /**
     * 業種タイプ定数
     */
    public const INDUSTRY_BEAUTY = 'beauty';
    public const INDUSTRY_CLINIC = 'clinic';
    public const INDUSTRY_RENTAL = 'rental';
    public const INDUSTRY_SCHOOL = 'school';
    public const INDUSTRY_ACTIVITY = 'activity';
    public const INDUSTRY_ALL = 'all';

    /**
     * テンプレートタイプ情報
     */
    public static function getTemplateTypes(): array
    {
        return [
            self::TYPE_BOOKING_CREATED => [
                'name' => '予約作成通知',
                'description' => '新規予約が作成された際の通知',
                'required_variables' => ['customer_name', 'booking_number', 'menu_name', 'booking_date'],
                'optional_variables' => ['booking_time', 'total_price', 'store_name'],
            ],
            self::TYPE_BOOKING_CONFIRMED => [
                'name' => '予約確定通知',
                'description' => '予約が確定された際の通知',
                'required_variables' => ['customer_name', 'booking_number', 'booking_date', 'booking_time'],
                'optional_variables' => ['menu_name', 'total_price', 'store_name', 'staff_name'],
            ],
            self::TYPE_BOOKING_REMINDER => [
                'name' => '予約リマインダー',
                'description' => '予約日時の事前リマインダー通知',
                'required_variables' => ['customer_name', 'booking_date', 'booking_time'],
                'optional_variables' => ['booking_number', 'menu_name', 'store_name', 'staff_name'],
            ],
            self::TYPE_BOOKING_CANCELLED => [
                'name' => '予約キャンセル通知',
                'description' => '予約がキャンセルされた際の通知',
                'required_variables' => ['customer_name', 'booking_number'],
                'optional_variables' => ['booking_date', 'booking_time', 'cancellation_reason'],
            ],
            self::TYPE_PROMOTIONAL => [
                'name' => 'プロモーション通知',
                'description' => 'キャンペーンやお知らせの通知',
                'required_variables' => ['customer_name'],
                'optional_variables' => ['store_name', 'campaign_name', 'discount_rate', 'expire_date'],
            ],
            self::TYPE_WELCOME => [
                'name' => '新規顧客歓迎',
                'description' => '新規顧客への歓迎メッセージ',
                'required_variables' => ['customer_name', 'store_name'],
                'optional_variables' => ['welcome_bonus', 'next_booking_url'],
            ],
            self::TYPE_BIRTHDAY => [
                'name' => '誕生日祝い',
                'description' => '顧客の誕生日お祝いメッセージ',
                'required_variables' => ['customer_name'],
                'optional_variables' => ['birthday_discount', 'special_menu', 'store_name'],
            ],
        ];
    }

    /**
     * 利用可能変数一覧
     */
    public static function getAvailableVariables(): array
    {
        return [
            'customer_name' => [
                'name' => '顧客名',
                'description' => 'お客様のお名前',
                'example' => '山田太郎',
            ],
            'booking_number' => [
                'name' => '予約番号',
                'description' => 'システム生成の予約番号',
                'example' => 'TG20250628001',
            ],
            'booking_date' => [
                'name' => '予約日',
                'description' => '予約の日付',
                'example' => '2025年6月28日',
            ],
            'booking_time' => [
                'name' => '予約時間',
                'description' => '予約の開始時間',
                'example' => '14:30',
            ],
            'menu_name' => [
                'name' => 'メニュー名',
                'description' => '予約したメニュー・サービス名',
                'example' => 'カット＆カラー',
            ],
            'total_price' => [
                'name' => '総料金',
                'description' => '予約の合計金額',
                'example' => '¥8,500',
            ],
            'store_name' => [
                'name' => '店舗名',
                'description' => '店舗の名前',
                'example' => 'サロン ツギカル',
            ],
            'staff_name' => [
                'name' => 'スタッフ名',
                'description' => '担当スタッフの名前',
                'example' => '佐藤美咲',
            ],
            'cancellation_reason' => [
                'name' => 'キャンセル理由',
                'description' => '予約キャンセルの理由',
                'example' => 'お客様都合',
            ],
        ];
    }

    /**
     * 業種別デフォルトテンプレート
     */
    public static function getDefaultTemplates(): array
    {
        return [
            self::INDUSTRY_BEAUTY => [
                self::TYPE_BOOKING_CONFIRMED => [
                    'title' => '✨ご予約確定のお知らせ✨',
                    'message' => "{customer_name}様\n\nいつもありがとうございます！\nご予約が確定いたしました。\n\n【ご予約内容】\n📅 {booking_date} {booking_time}\n💄 {menu_name}\n💰 {total_price}\n\n当日お会いできることを楽しみにしております✨\n\n{store_name}",
                ],
                self::TYPE_BOOKING_REMINDER => [
                    'title' => '🔔明日のご予約について',
                    'message' => "{customer_name}様\n\n明日のご予約のお知らせです💕\n\n📅 {booking_date} {booking_time}\n💄 {menu_name}\n\nお待ちしております！\n何かご不明な点がございましたらお気軽にお声がけください。\n\n{store_name}",
                ],
            ],
            self::INDUSTRY_CLINIC => [
                self::TYPE_BOOKING_CONFIRMED => [
                    'title' => '診療予約確定のお知らせ',
                    'message' => "{customer_name}様\n\n診療予約が確定いたしました。\n\n【予約内容】\n📅 {booking_date} {booking_time}\n🏥 {menu_name}\n\n※来院の際は保険証をお忘れなくお持ちください。\n※体調に変化がございましたら事前にご連絡ください。\n\n{store_name}",
                ],
                self::TYPE_BOOKING_REMINDER => [
                    'title' => '明日の診療予約について',
                    'message' => "{customer_name}様\n\n明日の診療予約のご案内です。\n\n📅 {booking_date} {booking_time}\n🏥 {menu_name}\n\n【お持ちいただくもの】\n・健康保険証\n・お薬手帳（お持ちの方）\n\nお気をつけてお越しください。\n\n{store_name}",
                ],
            ],
        ];
    }

    /**
     * モデルの起動時処理
     */
    protected static function booted()
    {
        static::addGlobalScope(new TenantScope);

        // 作成時の処理
        static::creating(function ($template) {
            // デフォルト値設定
            $template->language = $template->language ?? self::LANGUAGE_JAPANESE;
            $template->message_type = $template->message_type ?? self::MESSAGE_TYPE_TEXT;
            $template->is_active = $template->is_active ?? true;
            $template->is_system_template = $template->is_system_template ?? false;
            $template->usage_count = $template->usage_count ?? 0;

            // 利用可能変数の自動設定
            if (!$template->variables) {
                $typeInfo = self::getTemplateTypes()[$template->type] ?? [];
                $allVariables = self::getAvailableVariables();

                $requiredVars = $typeInfo['required_variables'] ?? [];
                $optionalVars = $typeInfo['optional_variables'] ?? [];

                $templateVariables = [];
                foreach (array_merge($requiredVars, $optionalVars) as $varKey) {
                    if (isset($allVariables[$varKey])) {
                        $templateVariables[$varKey] = array_merge(
                            $allVariables[$varKey],
                            ['required' => in_array($varKey, $requiredVars)]
                        );
                    }
                }

                $template->variables = $templateVariables;
            }
        });
    }

    /**
     * 店舗との関係性
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * 通知実績との関係性
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'template_id');
    }

    /**
     * テンプレートタイプ情報取得
     */
    public function getTypeInfo(): array
    {
        $types = self::getTemplateTypes();
        return $types[$this->type] ?? [];
    }

    /**
     * 変数置換
     */
    public function replaceVariables(array $data): array
    {
        $title = $this->title;
        $message = $this->message;

        foreach ($data as $key => $value) {
            $placeholder = "{{$key}}";
            $title = str_replace($placeholder, $value, $title);
            $message = str_replace($placeholder, $value, $message);
        }

        return [
            'title' => $title,
            'message' => $message,
        ];
    }

    /**
     * プレビュー生成
     */
    public function generatePreview(): array
    {
        $previewData = $this->preview_data ?? $this->getDefaultPreviewData();
        return $this->replaceVariables($previewData);
    }

    /**
     * デフォルトプレビューデータ取得
     */
    private function getDefaultPreviewData(): array
    {
        $variables = self::getAvailableVariables();
        $data = [];

        foreach ($variables as $key => $info) {
            $data[$key] = $info['example'];
        }

        return $data;
    }

    /**
     * 必須変数チェック
     */
    public function validateRequiredVariables(array $data): array
    {
        $errors = [];
        $variables = $this->variables ?? [];

        foreach ($variables as $key => $info) {
            if (($info['required'] ?? false) && !isset($data[$key])) {
                $errors[] = "必須変数 '{$key}' が設定されていません。";
            }
        }

        return $errors;
    }

    /**
     * 使用回数増加
     */
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
        $this->update(['last_used_at' => now()]);
    }

    /**
     * LINEリッチメッセージ生成
     */
    public function generateRichMessage(array $data): array
    {
        if ($this->message_type !== self::MESSAGE_TYPE_RICH || !$this->rich_message_data) {
            return [];
        }

        $richData = $this->rich_message_data;

        // 変数置換
        $dataJson = json_encode($richData);
        foreach ($data as $key => $value) {
            $dataJson = str_replace("{{$key}}", $value, $dataJson);
        }

        return json_decode($dataJson, true);
    }

    /**
     * テンプレート複製
     */
    public function duplicate(string $newName): self
    {
        $duplicate = $this->replicate();
        $duplicate->name = $newName;
        $duplicate->is_system_template = false;
        $duplicate->usage_count = 0;
        $duplicate->last_used_at = null;
        $duplicate->save();

        return $duplicate;
    }

    /**
     * 業種適用チェック
     */
    public function isApplicableToIndustry(string $industryType): bool
    {
        return $this->industry_type === self::INDUSTRY_ALL ||
            $this->industry_type === $industryType;
    }

    /**
     * 検索スコープ: テンプレートタイプ別
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * 検索スコープ: 業種別
     */
    public function scopeByIndustry($query, string $industryType)
    {
        return $query->where(function ($q) use ($industryType) {
            $q->where('industry_type', $industryType)
                ->orWhere('industry_type', self::INDUSTRY_ALL);
        });
    }

    /**
     * 検索スコープ: 言語別
     */
    public function scopeByLanguage($query, string $language)
    {
        return $query->where('language', $language);
    }

    /**
     * 検索スコープ: アクティブ
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * 検索スコープ: システムテンプレート
     */
    public function scopeSystemTemplates($query)
    {
        return $query->where('is_system_template', true);
    }

    /**
     * 検索スコープ: カスタムテンプレート
     */
    public function scopeCustomTemplates($query)
    {
        return $query->where('is_system_template', false);
    }

    /**
     * 検索スコープ: メッセージタイプ別
     */
    public function scopeByMessageType($query, string $messageType)
    {
        return $query->where('message_type', $messageType);
    }

    /**
     * 検索スコープ: 使用回数順
     */
    public function scopeOrderByUsage($query, string $direction = 'desc')
    {
        return $query->orderBy('usage_count', $direction);
    }

    /**
     * 検索スコープ: 最近使用
     */
    public function scopeRecentlyUsed($query, int $days = 30)
    {
        return $query->where('last_used_at', '>=', now()->subDays($days));
    }

    /**
     * 検索スコープ: テンプレート検索
     */
    public function scopeSearch($query, string $keyword)
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('name', 'like', "%{$keyword}%")
                ->orWhere('title', 'like', "%{$keyword}%")
                ->orWhere('message', 'like', "%{$keyword}%")
                ->orWhere('description', 'like', "%{$keyword}%");
        });
    }
}
