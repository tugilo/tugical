# tugical データベース設計書
## テーブル定義書

**Version**: 1.0  
**Date**: 2025年6月28日  
**Project**: tugical（ツギカル）  
**Database**: MariaDB 10.6+

---

## 設計方針

### Multi-Tenant アーキテクチャ
- **方式**: Single Database, Multi-Schema
- **分離**: テナントIDによる完全データ分離
- **スケーラビリティ**: 水平・垂直スケーリング対応

### 命名規則
- **テーブル名**: 複数形、スネークケース（`bookings`, `notification_templates`）
- **カラム名**: スネークケース（`created_at`, `line_user_id`）
- **インデックス**: `idx_テーブル名_カラム名`
- **外部キー**: `fk_テーブル名_参照テーブル名`

---

## 1. テナント・店舗管理

### 1.1 tenants（事業者・テナント）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | テナントID（PK） |
| name | VARCHAR(255) | ✓ | - | 事業者名 |
| plan_type | ENUM | ✓ | 'free' | プラン種別 |
| subscription_expires_at | TIMESTAMP | | NULL | サブスク期限 |
| settings | JSON | | NULL | テナント設定 |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- INDEX `idx_tenants_plan_type` (`plan_type`)
- INDEX `idx_tenants_is_active` (`is_active`)

**ENUM値**:
- `plan_type`: 'free', 'standard', 'pro', 'enterprise'

---

### 1.2 stores（店舗）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | 店舗ID（PK） |
| tenant_id | BIGINT UNSIGNED | ✓ | - | テナントID（FK） |
| name | VARCHAR(255) | ✓ | - | 店舗名 |
| slug | VARCHAR(100) | ✓ | - | URL用識別子 |
| display_name | VARCHAR(255) | | NULL | 表示名 |
| description | TEXT | | NULL | 店舗説明 |
| industry_type | ENUM | ✓ | - | 業種タイプ |
| industry_settings | JSON | | NULL | 業種別設定 |
| phone | VARCHAR(20) | | NULL | 電話番号 |
| email | VARCHAR(255) | | NULL | メールアドレス |
| address | TEXT | | NULL | 住所 |
| postal_code | VARCHAR(10) | | NULL | 郵便番号 |
| latitude | DECIMAL(10,8) | | NULL | 緯度 |
| longitude | DECIMAL(11,8) | | NULL | 経度 |
| business_hours | JSON | ✓ | - | 営業時間設定（曜日別） |
| time_slot_interval | INT | ✓ | 30 | 予約時間間隔（分） |
| advance_booking_days | INT | ✓ | 30 | 事前予約可能日数 |
| accept_same_day_booking | BOOLEAN | ✓ | TRUE | 当日予約受付 |
| booking_mode | ENUM | ✓ | 'auto' | 予約承認モード |
| booking_limit_per_day | INT | ✓ | 50 | 日当たり予約上限 |
| hold_minutes | INT | ✓ | 10 | 仮押さえ時間（分） |
| require_customer_info | BOOLEAN | ✓ | FALSE | 顧客情報必須フラグ |
| notification_settings | JSON | | NULL | 通知設定 |
| send_booking_notifications | BOOLEAN | ✓ | TRUE | 予約通知送信 |
| send_reminder_notifications | BOOLEAN | ✓ | TRUE | リマインダー通知送信 |
| reminder_hours_before | INT | ✓ | 24 | リマインダー送信時間（時間前） |
| line_channel_id | VARCHAR(100) | | NULL | LINE チャンネルID |
| line_channel_secret | TEXT | | NULL | LINE チャンネルシークレット（暗号化） |
| line_access_token | TEXT | | NULL | LINE アクセストークン（暗号化） |
| line_liff_id | VARCHAR(100) | | NULL | LIFF アプリID |
| line_integration_active | BOOLEAN | ✓ | FALSE | LINE連携有効フラグ |
| logo_url | VARCHAR(255) | | NULL | ロゴ画像URL |
| cover_image_url | VARCHAR(255) | | NULL | カバー画像URL |
| theme_color | VARCHAR(7) | ✓ | '#10b981' | テーマカラー |
| custom_css | JSON | | NULL | カスタムCSS設定 |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| is_public | BOOLEAN | ✓ | TRUE | 公開フラグ |
| settings | JSON | | NULL | その他設定 |
| notes | TEXT | | NULL | 備考 |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_stores_tenant` (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_stores_slug` (`slug`)
- INDEX `idx_stores_tenant_active` (`tenant_id`, `is_active`)
- INDEX `idx_stores_industry` (`industry_type`)
- INDEX `idx_stores_public` (`is_public`)

**ENUM値**:
- `industry_type`: 'beauty', 'nail', 'clinic', 'therapy', 'rental', 'school', 'activity'
- `booking_mode`: 'auto', 'manual'

---

## 2. リソース管理

### 2.1 resources（スタッフ・部屋・設備等）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | リソースID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| type | ENUM | ✓ | 'staff' | リソース種別 |
| name | VARCHAR(255) | ✓ | - | リソース名 |
| display_name | VARCHAR(255) | | NULL | 表示名（業種別） |
| description | TEXT | | NULL | 説明 |
| photo_url | VARCHAR(255) | | NULL | 写真URL |
| attributes | JSON | | NULL | 属性情報 |
| working_hours | JSON | | NULL | 稼働時間 |
| efficiency_rate | DECIMAL(3,2) | ✓ | 1.00 | 作業効率率 |
| hourly_rate_diff | INT | ✓ | 0 | 指名料金差（円） |
| capacity | INT | ✓ | 1 | 収容・対応人数 |
| sort_order | INT | ✓ | 0 | 表示順序 |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_resources_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- INDEX `idx_resources_type` (`store_id`, `type`)
- INDEX `idx_resources_active` (`store_id`, `is_active`)

**ENUM値**:
- `type`: 'staff', 'room', 'equipment', 'vehicle'

**capacity フィールド説明**:
- `staff`: 同時対応可能な顧客数（1-10人）
- `room`: 部屋の収容人数（1-100人）
- `equipment`: 同時利用可能数（1-20台）
- `vehicle`: 乗車定員（1-50人）

**attributes JSON 構造例**:
```json
{
  "specialties": ["cut", "color", "perm"],
  "skill_level": "expert",
  "experience_years": 5,
  "certifications": ["美容師免許", "カラーリスト検定"],
  "languages": ["ja", "en"],
  "age_restrictions": {"min": 18, "max": 65},
  "gender_restrictions": "none",
  "equipment_specs": {
    "brand": "Panasonic",
    "model": "EH-CNA0E",
    "power": "1200W"
  },
  "room_features": ["individual", "soundproof", "wifi"],
  "vehicle_features": ["wheelchair_accessible", "air_conditioning"]
}
```

---

### 2.2 staff_accounts（スタッフアカウント）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | アカウントID（PK） |
| resource_id | BIGINT UNSIGNED | ✓ | - | リソースID（FK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| email | VARCHAR(255) | ✓ | - | ログインメール |
| email_verified_at | TIMESTAMP | | NULL | メール認証日時 |
| password | VARCHAR(255) | ✓ | - | パスワードハッシュ |
| role | ENUM | ✓ | 'staff' | 権限ロール |
| permissions | JSON | | NULL | 個別権限設定 |
| two_factor_secret | VARCHAR(255) | | NULL | 2FA秘密鍵 |
| two_factor_recovery_codes | TEXT | | NULL | 2FA復旧コード |
| remember_token | VARCHAR(100) | | NULL | ログイン保持トークン |
| last_login_at | TIMESTAMP | | NULL | 最終ログイン |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_staff_accounts_resource` (`resource_id`) REFERENCES `resources` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_staff_accounts_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_staff_accounts_email` (`email`)
- INDEX `idx_staff_accounts_store` (`store_id`)

**ENUM値**:
- `role`: 'owner', 'manager', 'staff', 'reception'

---

## 3. メニュー管理

### 3.1 menus（サービスメニュー）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | メニューID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| name | VARCHAR(255) | ✓ | - | メニュー名 |
| display_name | VARCHAR(255) | | NULL | 表示名 |
| description | TEXT | | NULL | 説明 |
| detailed_description | TEXT | | NULL | 詳細説明 |
| category | VARCHAR(100) | | NULL | カテゴリ |
| tags | JSON | | NULL | タグ（検索用） |
| service_type | ENUM | ✓ | 'individual' | サービス種別 |
| base_duration | INT | ✓ | - | 基本所要時間（分） |
| prep_duration | INT | ✓ | 0 | 準備時間（分） |
| cleanup_duration | INT | ✓ | 0 | 片付け時間（分） |
| buffer_duration | INT | ✓ | 0 | バッファ時間（分） |
| base_price | INT | ✓ | - | 基本料金（円） |
| pricing_options | JSON | | NULL | 料金オプション |
| price_varies_by_resource | BOOLEAN | ✓ | FALSE | リソース別料金フラグ |
| price_varies_by_time | BOOLEAN | ✓ | FALSE | 時間帯別料金フラグ |
| time_based_pricing | JSON | | NULL | 時間帯別料金設定 |
| requires_resource | BOOLEAN | ✓ | FALSE | リソース指定必須フラグ |
| allowed_resource_types | JSON | | NULL | 利用可能リソース種別 |
| required_resources | JSON | | NULL | 必須リソース一覧 |
| min_participants | INT | ✓ | 1 | 最小参加人数 |
| max_participants | INT | ✓ | 1 | 最大参加人数 |
| min_age | INT | | NULL | 最小年齢 |
| max_age | INT | | NULL | 最大年齢 |
| gender_restriction | ENUM | ✓ | 'none' | 性別制限 |
| advance_booking_hours | INT | ✓ | 1 | 事前予約必要時間 |
| cancellation_hours | INT | ✓ | 24 | キャンセル可能時間 |
| booking_rules | JSON | | NULL | 予約ルール |
| allow_online_booking | BOOLEAN | ✓ | TRUE | オンライン予約許可 |
| require_approval | BOOLEAN | ✓ | FALSE | 承認必要フラグ |
| image_url | VARCHAR(255) | | NULL | メイン画像URL |
| image_gallery | JSON | | NULL | 画像ギャラリー |
| icon_class | VARCHAR(255) | | NULL | アイコンクラス |
| background_color | VARCHAR(7) | | NULL | 背景色 |
| sort_order | INT | ✓ | 0 | 表示順序 |
| is_featured | BOOLEAN | ✓ | FALSE | おすすめフラグ |
| is_popular | BOOLEAN | ✓ | FALSE | 人気フラグ |
| is_new | BOOLEAN | ✓ | FALSE | 新着フラグ |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| is_bookable | BOOLEAN | ✓ | TRUE | 予約可能フラグ |
| settings | JSON | | NULL | その他設定 |
| notes | TEXT | | NULL | 備考 |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_menus_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- INDEX `idx_menus_store_active` (`store_id`, `is_active`)
- INDEX `idx_menus_category` (`store_id`, `category`)
- INDEX `idx_menus_bookable` (`store_id`, `is_bookable`)
- INDEX `idx_menus_sort` (`sort_order`)

**ENUM値**:
- `service_type`: 'individual', 'group', 'course', 'subscription'
- `gender_restriction`: 'none', 'male_only', 'female_only'

---

### 3.2 menu_options（メニューオプション）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | オプションID（PK） |
| menu_id | BIGINT UNSIGNED | ✓ | - | メニューID（FK） |
| name | VARCHAR(255) | ✓ | - | オプション名 |
| description | TEXT | | NULL | 説明 |
| price | INT | ✓ | 0 | 追加料金（円） |
| duration | INT | ✓ | 0 | 追加時間（分） |
| is_required | BOOLEAN | ✓ | FALSE | 必須選択フラグ |
| sort_order | INT | ✓ | 0 | 表示順序 |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_menu_options_menu` (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
- INDEX `idx_menu_options_active` (`menu_id`, `is_active`)

---

## 4. 顧客管理

### 4.1 customers（顧客）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | 顧客ID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| line_user_id | VARCHAR(100) | | NULL | LINE ユーザーID |
| line_display_name | VARCHAR(255) | | NULL | LINE表示名 |
| line_picture_url | VARCHAR(255) | | NULL | LINEプロフィール画像 |
| name | VARCHAR(255) | | NULL | 氏名 |
| name_kana | VARCHAR(255) | | NULL | 氏名カナ |
| phone | VARCHAR(20) | | NULL | 電話番号 |
| email | VARCHAR(255) | | NULL | メールアドレス |
| birthday | DATE | | NULL | 生年月日 |
| gender | ENUM | | NULL | 性別 |
| address | TEXT | | NULL | 住所 |
| notes | TEXT | | NULL | 備考・要望 |
| allergies | TEXT | | NULL | アレルギー情報 |
| preferences | JSON | | NULL | 個人設定 |
| loyalty_rank | ENUM | ✓ | 'regular' | 顧客ランク |
| total_bookings | INT | ✓ | 0 | 総予約回数 |
| total_spent | INT | ✓ | 0 | 総利用金額 |
| no_show_count | INT | ✓ | 0 | 無断キャンセル回数 |
| last_no_show_at | TIMESTAMP | | NULL | 最終無断キャンセル日 |
| is_restricted | BOOLEAN | ✓ | FALSE | 予約制限フラグ |
| restriction_until | TIMESTAMP | | NULL | 制限解除日時 |
| notification_settings | JSON | | NULL | 通知設定 |
| first_visit_at | TIMESTAMP | | NULL | 初回来店日 |
| last_visit_at | TIMESTAMP | | NULL | 最終来店日 |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_customers_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_customers_store_line` (`store_id`, `line_user_id`)
- INDEX `idx_customers_phone` (`store_id`, `phone`)
- INDEX `idx_customers_rank` (`store_id`, `loyalty_rank`)

**ENUM値**:
- `gender`: 'male', 'female', 'other'
- `loyalty_rank`: 'new', 'regular', 'vip', 'premium'

---

## 5. 予約管理

### 5.1 bookings（予約）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | 予約ID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| customer_id | BIGINT UNSIGNED | ✓ | - | 顧客ID（FK） |
| resource_id | BIGINT UNSIGNED | | NULL | リソースID（FK） |
| menu_id | BIGINT UNSIGNED | ✓ | - | メニューID（FK） |
| booking_number | VARCHAR(20) | ✓ | - | 予約番号 |
| booking_date | DATE | ✓ | - | 予約日 |
| start_time | TIME | ✓ | - | 開始時間 |
| end_time | TIME | ✓ | - | 終了時間 |
| status | ENUM | ✓ | 'pending' | 予約ステータス |
| total_price | INT | ✓ | 0 | 総料金（円） |
| base_price | INT | ✓ | 0 | 基本料金 |
| option_price | INT | ✓ | 0 | オプション料金 |
| resource_price | INT | ✓ | 0 | リソース指名料 |
| customer_name | VARCHAR(255) | | NULL | 顧客名（予約時点） |
| customer_phone | VARCHAR(20) | | NULL | 電話番号（予約時点） |
| customer_notes | TEXT | | NULL | 顧客要望 |
| staff_notes | TEXT | | NULL | スタッフメモ |
| internal_notes | TEXT | | NULL | 内部メモ |
| booking_source | ENUM | ✓ | 'line' | 予約経路 |
| preferred_times | JSON | | NULL | 希望時間（承認制の場合） |
| hold_token | VARCHAR(64) | | NULL | 仮押さえトークン |
| hold_expires_at | TIMESTAMP | | NULL | 仮押さえ期限 |
| confirmed_at | TIMESTAMP | | NULL | 承認日時 |
| cancelled_at | TIMESTAMP | | NULL | キャンセル日時 |
| cancellation_reason | TEXT | | NULL | キャンセル理由 |
| completed_at | TIMESTAMP | | NULL | 完了日時 |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_bookings_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_bookings_customer` (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_bookings_resource` (`resource_id`) REFERENCES `resources` (`id`) ON DELETE SET NULL
- FOREIGN KEY `fk_bookings_menu` (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_bookings_number` (`booking_number`)
- INDEX `idx_bookings_date_resource` (`store_id`, `booking_date`, `resource_id`)
- INDEX `idx_bookings_status` (`store_id`, `status`)
- INDEX `idx_bookings_customer` (`customer_id`, `status`)
- INDEX `idx_bookings_hold_token` (`hold_token`)

**ENUM値**:
- `status`: 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
- `booking_source`: 'line', 'phone', 'walk_in', 'web', 'staff'

---

### 5.2 booking_options（予約オプション）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | ID（PK） |
| booking_id | BIGINT UNSIGNED | ✓ | - | 予約ID（FK） |
| menu_option_id | BIGINT UNSIGNED | | NULL | メニューオプションID（FK） |
| option_name | VARCHAR(255) | ✓ | - | オプション名 |
| option_price | INT | ✓ | 0 | オプション料金 |
| option_duration | INT | ✓ | 0 | 追加時間（分） |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_booking_options_booking` (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_booking_options_menu_option` (`menu_option_id`) REFERENCES `menu_options` (`id`) ON DELETE SET NULL

---

### 5.3 booking_changes（予約変更履歴）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | ID（PK） |
| booking_id | BIGINT UNSIGNED | ✓ | - | 予約ID（FK） |
| changed_by_type | ENUM | ✓ | - | 変更者種別 |
| changed_by_id | BIGINT UNSIGNED | | NULL | 変更者ID |
| change_type | ENUM | ✓ | - | 変更種別 |
| before_data | JSON | | NULL | 変更前データ |
| after_data | JSON | | NULL | 変更後データ |
| reason | TEXT | | NULL | 変更理由 |
| ip_address | VARCHAR(45) | | NULL | IPアドレス |
| user_agent | TEXT | | NULL | ユーザーエージェント |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 変更日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_booking_changes_booking` (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
- INDEX `idx_booking_changes_booking` (`booking_id`)
- INDEX `idx_booking_changes_type` (`change_type`)

**ENUM値**:
- `changed_by_type`: 'staff', 'customer', 'system'
- `change_type`: 'create', 'update', 'cancel', 'confirm', 'complete', 'no_show'

---

## 6. 通知管理

### 6.1 notifications（通知履歴）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | 通知ID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| customer_id | BIGINT UNSIGNED | | NULL | 顧客ID（FK） |
| booking_id | BIGINT UNSIGNED | | NULL | 予約ID（FK） |
| notification_type | ENUM | ✓ | - | 通知種別 |
| channel | ENUM | ✓ | 'line' | 送信チャンネル |
| recipient | VARCHAR(255) | ✓ | - | 送信先 |
| subject | VARCHAR(255) | | NULL | 件名 |
| message_content | TEXT | ✓ | - | 送信内容 |
| line_message_id | VARCHAR(100) | | NULL | LINE メッセージID |
| status | ENUM | ✓ | 'pending' | 送信ステータス |
| scheduled_at | TIMESTAMP | ✓ | - | 送信予定日時 |
| sent_at | TIMESTAMP | | NULL | 実際の送信日時 |
| delivered_at | TIMESTAMP | | NULL | 配信確認日時 |
| error_message | TEXT | | NULL | エラーメッセージ |
| retry_count | INT | ✓ | 0 | 再送回数 |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_notifications_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_notifications_customer` (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_notifications_booking` (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
- INDEX `idx_notifications_scheduled` (`status`, `scheduled_at`)
- INDEX `idx_notifications_customer` (`customer_id`, `notification_type`)

**ENUM値**:
- `notification_type`: 'booking_received', 'booking_confirmed', 'booking_cancelled', 'reminder', 'change_request', 'promotional'
- `channel`: 'line', 'email', 'sms'
- `status`: 'pending', 'sent', 'delivered', 'failed', 'cancelled'

---

### 6.2 notification_templates（通知テンプレート）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | テンプレートID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| template_type | ENUM | ✓ | - | テンプレート種別 |
| name | VARCHAR(255) | ✓ | - | テンプレート名 |
| subject | VARCHAR(255) | | NULL | 件名テンプレート |
| content | TEXT | ✓ | - | 本文テンプレート |
| variables | JSON | | NULL | 利用可能変数 |
| is_default | BOOLEAN | ✓ | FALSE | デフォルトフラグ |
| is_active | BOOLEAN | ✓ | TRUE | 有効フラグ |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_notification_templates_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- INDEX `idx_notification_templates_type` (`store_id`, `template_type`)

**ENUM値**:
- `template_type`: 'booking_received', 'booking_confirmed', 'booking_cancelled', 'reminder', 'change_request'

---

## 7. システム管理

### 7.1 business_calendars（営業カレンダー）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | ID（PK） |
| store_id | BIGINT UNSIGNED | ✓ | - | 店舗ID（FK） |
| date | DATE | ✓ | - | 対象日 |
| is_holiday | BOOLEAN | ✓ | FALSE | 休業日フラグ |
| is_special_hours | BOOLEAN | ✓ | FALSE | 特別営業時間フラグ |
| special_hours | JSON | | NULL | 特別営業時間 |
| holiday_type | ENUM | | NULL | 休日種別 |
| notes | TEXT | | NULL | 備考 |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_business_calendars_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_business_calendars_store_date` (`store_id`, `date`)
- INDEX `idx_business_calendars_date` (`date`)

**ENUM値**:
- `holiday_type`: 'national_holiday', 'store_holiday', 'special_event', 'maintenance'

---

### 7.2 system_logs（システムログ）

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|---|----------|-----------|------|
| id | BIGINT UNSIGNED | ✓ | AUTO_INCREMENT | ログID（PK） |
| store_id | BIGINT UNSIGNED | | NULL | 店舗ID（FK） |
| user_id | BIGINT UNSIGNED | | NULL | ユーザーID |
| user_type | ENUM | | NULL | ユーザー種別 |
| action | VARCHAR(100) | ✓ | - | 実行アクション |
| resource_type | VARCHAR(100) | | NULL | 対象リソース種別 |
| resource_id | BIGINT UNSIGNED | | NULL | 対象リソースID |
| description | TEXT | | NULL | 説明 |
| metadata | JSON | | NULL | メタデータ |
| ip_address | VARCHAR(45) | | NULL | IPアドレス |
| user_agent | TEXT | | NULL | ユーザーエージェント |
| created_at | TIMESTAMP | ✓ | CURRENT_TIMESTAMP | 実行日時 |

**インデックス**:
- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_system_logs_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- INDEX `idx_system_logs_user` (`user_id`, `user_type`)
- INDEX `idx_system_logs_action` (`action`)
- INDEX `idx_system_logs_created` (`created_at`)

**ENUM値**:
- `user_type`: 'staff', 'customer', 'system'

---

## データ保持・削除ポリシー

### 自動削除対象
| テーブル | 保持期間 | 削除条件 |
|---------|----------|----------|
| system_logs | 1年 | created_at < 1年前 |
| notifications | 6ヶ月 | status = 'sent' AND created_at < 6ヶ月前 |
| booking_changes | 2年 | created_at < 2年前 |

### 論理削除対象
- customers（is_active = FALSE）
- bookings（ステータス変更のみ）
- resources（is_active = FALSE）

---

## セキュリティ考慮事項

### 暗号化対象
- `staff_accounts.password`（bcrypt）
- `stores.line_channel_secret`（AES-256）
- `stores.line_access_token`（AES-256）
- `staff_accounts.two_factor_secret`（AES-256）

### アクセス制御
- 全テーブルで`store_id`による分離
- テナント間のデータ漏洩防止
- 個人情報の匿名化機能

---

## パフォーマンス最適化

### 推奨インデックス
```sql
-- 予約検索の高速化
CREATE INDEX idx_bookings_search ON bookings (store_id, booking_date, status, resource_id);

-- 顧客検索の高速化  
CREATE INDEX idx_customers_search ON customers (store_id, name, phone);

-- 通知送信の高速化
CREATE INDEX idx_notifications_send ON notifications (status, scheduled_at, retry_count);
```

### パーティショニング候補
- `bookings`: booking_date による月次パーティション
- `notifications`: created_at による月次パーティション
- `system_logs`: created_at による月次パーティション

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0 | 2025-06-28 | 初版作成 | tugilo inc. |

