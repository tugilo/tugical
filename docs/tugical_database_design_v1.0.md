# tugical データベース設計書

## テーブル定義書

**Version**: 1.2  
**Date**: 2025 年 1 月 6 日  
**Project**: tugical（ツギカル）  
**Database**: MariaDB 10.6+

**更新履歴**:

- v1.2 (2025-01-06): **複数メニュー組み合わせ対応** - booking_details テーブル追加、電話予約ワークフロー最適化
- v1.1 (2025-07-06): 時間スロット設定機能追加

---

## 設計方針

### Multi-Tenant アーキテクチャ

- **方式**: Single Database, Multi-Schema
- **分離**: テナント ID による完全データ分離
- **スケーラビリティ**: 水平・垂直スケーリング対応

### 汎用時間貸しリソース予約システム

- **統一概念**: 予約 = リソース × 時間枠 × メニュー（複数）
- **柔軟時間スロット**: 5 分〜480 分対応
- **業種対応**: 医療・美容・施設・教育・アクティビティ等
- **複数メニュー組み合わせ**: カット+カラー、診察+検査、会議室+設備等の自由な組み合わせ
- **電話予約最適化**: 美容師が電話を耳に挟みながら片手で操作可能なワークフロー設計

### 命名規則

- **テーブル名**: 複数形、スネークケース（`bookings`, `notification_templates`）
- **カラム名**: スネークケース（`created_at`, `line_user_id`）
- **インデックス**: `idx_テーブル名_カラム名`
- **外部キー**: `fk_テーブル名_参照テーブル名`

---

## 1. テナント・店舗管理

### 1.1 tenants（事業者・テナント）

| カラム名                | 型              | NOT NULL | デフォルト                  | 説明              |
| ----------------------- | --------------- | -------- | --------------------------- | ----------------- |
| id                      | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | テナント ID（PK） |
| name                    | VARCHAR(255)    | ✓        | -                           | 事業者名          |
| plan_type               | ENUM            | ✓        | 'free'                      | プラン種別        |
| subscription_expires_at | TIMESTAMP       |          | NULL                        | サブスク期限      |
| settings                | JSON            |          | NULL                        | テナント設定      |
| is_active               | BOOLEAN         | ✓        | TRUE                        | 有効フラグ        |
| created_at              | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時          |
| updated_at              | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時          |

**インデックス**:

- PRIMARY KEY (`id`)
- INDEX `idx_tenants_plan_type` (`plan_type`)
- INDEX `idx_tenants_is_active` (`is_active`)

**ENUM 値**:

- `plan_type`: 'free', 'standard', 'pro', 'enterprise'

---

### 1.2 stores（店舗）

| カラム名                    | 型              | NOT NULL | デフォルト                  | 説明                                    |
| --------------------------- | --------------- | -------- | --------------------------- | --------------------------------------- |
| id                          | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | 店舗 ID（PK）                           |
| tenant_id                   | BIGINT UNSIGNED | ✓        | -                           | テナント ID（FK）                       |
| name                        | VARCHAR(255)    | ✓        | -                           | 店舗名                                  |
| slug                        | VARCHAR(100)    | ✓        | -                           | URL 用識別子                            |
| display_name                | VARCHAR(255)    |          | NULL                        | 表示名                                  |
| description                 | TEXT            |          | NULL                        | 店舗説明                                |
| industry_type               | ENUM            | ✓        | -                           | 業種タイプ                              |
| industry_settings           | JSON            |          | NULL                        | 業種別設定                              |
| phone                       | VARCHAR(20)     |          | NULL                        | 電話番号                                |
| email                       | VARCHAR(255)    |          | NULL                        | メールアドレス                          |
| address                     | TEXT            |          | NULL                        | 住所                                    |
| postal_code                 | VARCHAR(10)     |          | NULL                        | 郵便番号                                |
| latitude                    | DECIMAL(10,8)   |          | NULL                        | 緯度                                    |
| longitude                   | DECIMAL(11,8)   |          | NULL                        | 経度                                    |
| business_hours              | JSON            | ✓        | -                           | 営業時間設定（曜日別）                  |
| time_slot_settings          | JSON            |          | NULL                        | **時間スロット設定（v1.1 追加）**       |
| time_slot_interval          | INT             | ✓        | 30                          | **廃止予定：time_slot_settings に移行** |
| advance_booking_days        | INT             | ✓        | 30                          | 事前予約可能日数                        |
| accept_same_day_booking     | BOOLEAN         | ✓        | TRUE                        | 当日予約受付                            |
| booking_mode                | ENUM            | ✓        | 'auto'                      | 予約承認モード                          |
| booking_limit_per_day       | INT             | ✓        | 50                          | 日当たり予約上限                        |
| hold_minutes                | INT             | ✓        | 10                          | 仮押さえ時間（分）                      |
| require_customer_info       | BOOLEAN         | ✓        | FALSE                       | 顧客情報必須フラグ                      |
| notification_settings       | JSON            |          | NULL                        | 通知設定                                |
| send_booking_notifications  | BOOLEAN         | ✓        | TRUE                        | 予約通知送信                            |
| send_reminder_notifications | BOOLEAN         | ✓        | TRUE                        | リマインダー通知送信                    |
| reminder_hours_before       | INT             | ✓        | 24                          | リマインダー送信時間（時間前）          |
| line_channel_id             | VARCHAR(100)    |          | NULL                        | LINE チャンネル ID                      |
| line_channel_secret         | TEXT            |          | NULL                        | LINE チャンネルシークレット（暗号化）   |
| line_access_token           | TEXT            |          | NULL                        | LINE アクセストークン（暗号化）         |
| line_liff_id                | VARCHAR(100)    |          | NULL                        | LIFF アプリ ID                          |
| line_integration_active     | BOOLEAN         | ✓        | FALSE                       | LINE 連携有効フラグ                     |
| logo_url                    | VARCHAR(255)    |          | NULL                        | ロゴ画像 URL                            |
| cover_image_url             | VARCHAR(255)    |          | NULL                        | カバー画像 URL                          |
| theme_color                 | VARCHAR(7)      | ✓        | '#10b981'                   | テーマカラー                            |
| custom_css                  | JSON            |          | NULL                        | カスタム CSS 設定                       |
| is_active                   | BOOLEAN         | ✓        | TRUE                        | 有効フラグ                              |
| is_public                   | BOOLEAN         | ✓        | TRUE                        | 公開フラグ                              |
| settings                    | JSON            |          | NULL                        | その他設定                              |
| notes                       | TEXT            |          | NULL                        | 備考                                    |
| deleted_at                  | TIMESTAMP       |          | NULL                        | 削除日時（SoftDeletes）                 |
| created_at                  | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                                |
| updated_at                  | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                                |

**インデックス**:

- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_stores_tenant` (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
- UNIQUE KEY `uk_stores_slug` (`slug`)
- INDEX `idx_stores_tenant_active` (`tenant_id`, `is_active`)
- INDEX `idx_stores_industry` (`industry_type`)
- INDEX `idx_stores_public` (`is_public`)

**ENUM 値**:

- `industry_type`: 'medical', 'beauty', 'nail', 'clinic', 'therapy', 'rental', 'school', 'activity', 'fitness', 'other'
- `booking_mode`: 'auto', 'manual'

#### **time_slot_settings JSON 構造（v1.1 新機能）**

```json
{
  "slot_duration_minutes": 30,
  "available_durations": [5, 10, 15, 30, 60, 120, 240, 480],
  "business_hours": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" },
    "wednesday": { "start": "09:00", "end": "18:00" },
    "thursday": { "start": "09:00", "end": "18:00" },
    "friday": { "start": "09:00", "end": "18:00" },
    "saturday": { "start": "09:00", "end": "17:00" },
    "sunday": { "closed": true }
  },
  "break_times": [{ "start": "12:00", "end": "13:00", "label": "昼休み" }],
  "timezone": "Asia/Tokyo",
  "slot_label_format": "HH:mm",
  "auto_update_calendar": true
}
```

#### **業種別推奨設定例**

```json
// 医療系
{
  "slot_duration_minutes": 10,
  "available_durations": [5, 10, 15, 30, 60],
  "business_hours": {
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "12:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": {"start": "09:00", "end": "17:00"},
    "saturday": {"start": "09:00", "end": "12:00"},
    "sunday": {"closed": true}
  },
  "break_times": [
    {"start": "12:00", "end": "13:00", "label": "昼休み"}
  ]
}

// 美容系
{
  "slot_duration_minutes": 30,
  "available_durations": [30, 60, 90, 120, 180],
  "business_hours": {
    "monday": {"closed": true},
    "tuesday": {"start": "10:00", "end": "19:00"},
    "wednesday": {"start": "10:00", "end": "19:00"},
    "thursday": {"start": "10:00", "end": "19:00"},
    "friday": {"start": "10:00", "end": "19:00"},
    "saturday": {"start": "09:00", "end": "18:00"},
    "sunday": {"start": "09:00", "end": "18:00"}
  }
}

// 施設・レンタル系
{
  "slot_duration_minutes": 60,
  "available_durations": [30, 60, 120, 240, 480],
  "business_hours": {
    "monday": {"start": "08:00", "end": "22:00"},
    "tuesday": {"start": "08:00", "end": "22:00"},
    "wednesday": {"start": "08:00", "end": "22:00"},
    "thursday": {"start": "08:00", "end": "22:00"},
    "friday": {"start": "08:00", "end": "22:00"},
    "saturday": {"start": "08:00", "end": "22:00"},
    "sunday": {"start": "08:00", "end": "22:00"}
  }
}
```

---

## 2. リソース管理

### 2.1 resources（スタッフ・部屋・設備等）

| カラム名         | 型              | NOT NULL | デフォルト                  | 説明                    |
| ---------------- | --------------- | -------- | --------------------------- | ----------------------- |
| id               | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | リソース ID（PK）       |
| store_id         | BIGINT UNSIGNED | ✓        | -                           | 店舗 ID（FK）           |
| type             | ENUM            | ✓        | 'staff'                     | リソース種別            |
| name             | VARCHAR(255)    | ✓        | -                           | リソース名              |
| display_name     | VARCHAR(255)    |          | NULL                        | 表示名（業種別）        |
| description      | TEXT            |          | NULL                        | 説明                    |
| photo_url        | VARCHAR(255)    |          | NULL                        | 写真 URL                |
| attributes       | JSON            |          | NULL                        | 属性情報                |
| working_hours    | JSON            |          | NULL                        | 稼働時間                |
| efficiency_rate  | DECIMAL(3,2)    | ✓        | 1.00                        | 作業効率率              |
| hourly_rate_diff | INT             | ✓        | 0                           | 指名料金差（円）        |
| capacity         | INT             | ✓        | 1                           | 収容・対応人数          |
| sort_order       | INT             | ✓        | 0                           | 表示順序                |
| is_active        | BOOLEAN         | ✓        | TRUE                        | 有効フラグ              |
| deleted_at       | TIMESTAMP       |          | NULL                        | 削除日時（SoftDeletes） |
| created_at       | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                |
| updated_at       | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                |

**インデックス**:

- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_resources_store` (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
- INDEX `idx_resources_type` (`store_id`, `type`)
- INDEX `idx_resources_active` (`store_id`, `is_active`)

**ENUM 値**:

- `type`: 'staff', 'room', 'equipment', 'vehicle', 'facility'

**capacity フィールド説明**:

- `staff`: 同時対応可能な顧客数（1-10 人）
- `room`: 部屋の収容人数（1-100 人）
- `equipment`: 同時利用可能数（1-20 台）
- `vehicle`: 乗車定員（1-50 人）
- `facility`: 施設利用可能人数（1-1000 人）

#### **業種別 attributes JSON 構造例**:

```json
// 医療系スタッフ
{
  "specialties": ["内科", "小児科", "予防接種"],
  "license_number": "12345678",
  "experience_years": 10,
  "certifications": ["医師免許", "専門医資格"],
  "languages": ["ja", "en"],
  "consultation_types": ["初診", "再診", "検査"],
  "age_restrictions": {"min": 0, "max": 100},
  "gender_restrictions": "none"
}

// 美容系スタッフ
{
  "specialties": ["cut", "color", "perm", "treatment"],
  "skill_level": "expert",
  "experience_years": 5,
  "certifications": ["美容師免許", "カラーリスト検定1級"],
  "languages": ["ja"],
  "gender_restrictions": "none",
  "appointment_required": true
}

// 医療機器・設備
{
  "equipment_type": "MRI",
  "model": "Siemens MAGNETOM",
  "specifications": {
    "tesla": 3.0,
    "bore_diameter": "70cm"
  },
  "maintenance_schedule": "monthly",
  "operator_required": true,
  "preparation_time": 15,
  "cleanup_time": 10
}

// 会議室・施設
{
  "room_type": "conference",
  "floor": 3,
  "capacity": 20,
  "features": ["projector", "whiteboard", "wifi", "air_conditioning"],
  "equipment_included": ["PC", "microphone", "camera"],
  "accessibility": ["wheelchair_accessible", "elevator_access"],
  "catering_available": true
}

// 車両
{
  "vehicle_type": "van",
  "model": "Toyota Hiace",
  "year": 2022,
  "capacity": 10,
  "features": ["wheelchair_accessible", "air_conditioning", "gps"],
  "license_required": "普通免許",
  "fuel_type": "gasoline"
}
```

#### **working_hours JSON 構造例**:

```json
{
  "monday": {
    "start": "09:00",
    "end": "18:00",
    "break_start": "12:00",
    "break_end": "13:00"
  },
  "tuesday": {
    "start": "09:00",
    "end": "18:00",
    "break_start": "12:00",
    "break_end": "13:00"
  },
  "wednesday": {
    "start": "09:00",
    "end": "12:00"
  },
  "thursday": {
    "start": "09:00",
    "end": "18:00",
    "break_start": "12:00",
    "break_end": "13:00"
  },
  "friday": {
    "start": "09:00",
    "end": "18:00",
    "break_start": "12:00",
    "break_end": "13:00"
  },
  "saturday": {
    "start": "09:00",
    "end": "15:00"
  },
  "sunday": {
    "closed": true
  }
}
```

---

## 3. メニュー管理

### 3.1 menus（サービスメニュー）

| カラム名            | 型              | NOT NULL | デフォルト                  | 説明                    |
| ------------------- | --------------- | -------- | --------------------------- | ----------------------- |
| id                  | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | メニュー ID（PK）       |
| store_id            | BIGINT UNSIGNED | ✓        | -                           | 店舗 ID（FK）           |
| category            | VARCHAR(100)    |          | NULL                        | カテゴリ                |
| name                | VARCHAR(255)    | ✓        | -                           | メニュー名              |
| description         | TEXT            |          | NULL                        | 説明                    |
| base_price          | INT             | ✓        | 0                           | 基本料金（円）          |
| base_duration       | INT             | ✓        | 60                          | 標準所要時間（分）      |
| prep_duration       | INT             | ✓        | 0                           | 事前準備時間（分）      |
| cleanup_duration    | INT             | ✓        | 0                           | 事後片付け時間（分）    |
| min_duration        | INT             |          | NULL                        | 最小時間（分）          |
| max_duration        | INT             |          | NULL                        | 最大時間（分）          |
| duration_step       | INT             | ✓        | 30                          | 時間刻み（分）          |
| available_resources | JSON            |          | NULL                        | 利用可能リソース        |
| attributes          | JSON            |          | NULL                        | メニュー属性            |
| image_url           | VARCHAR(255)    |          | NULL                        | メニュー画像 URL        |
| sort_order          | INT             | ✓        | 0                           | 表示順序                |
| is_active           | BOOLEAN         | ✓        | TRUE                        | 有効フラグ              |
| is_online_bookable  | BOOLEAN         | ✓        | TRUE                        | オンライン予約可能      |
| deleted_at          | TIMESTAMP       |          | NULL                        | 削除日時（SoftDeletes） |
| created_at          | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                |
| updated_at          | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                |

#### **業種別メニュー例**:

```json
// 医療系メニュー
{
  "category": "予防接種",
  "name": "インフルエンザワクチン",
  "base_duration": 10,
  "prep_duration": 5,
  "cleanup_duration": 0,
  "attributes": {
    "age_restrictions": {"min": 6, "max": 100},
    "contraindications": ["発熱", "重篤なアレルギー"],
    "required_documents": ["問診票", "母子手帳"],
    "insurance_covered": true
  }
}

// 美容系メニュー
{
  "category": "カット",
  "name": "カット＋シャンプー",
  "base_duration": 60,
  "prep_duration": 5,
  "cleanup_duration": 10,
  "attributes": {
    "hair_length": ["short", "medium", "long"],
    "additional_services": ["頭皮マッサージ", "スタイリング"],
    "skill_level_required": "basic"
  }
}

// 施設系メニュー
{
  "category": "会議室",
  "name": "中会議室（20名）",
  "base_duration": 120,
  "min_duration": 60,
  "max_duration": 480,
  "duration_step": 60,
  "attributes": {
    "capacity": 20,
    "equipment": ["projector", "whiteboard", "wifi"],
    "catering_options": ["coffee", "lunch", "snacks"],
    "setup_required": true
  }
}
```

---

## 4. 顧客管理

### 4.1 customers（顧客）

| カラム名          | 型              | NOT NULL | デフォルト                  | 説明                         |
| ----------------- | --------------- | -------- | --------------------------- | ---------------------------- |
| id                | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | 顧客 ID（PK）                |
| store_id          | BIGINT UNSIGNED | ✓        | -                           | 店舗 ID（FK）                |
| line_user_id      | VARCHAR(255)    |          | NULL                        | LINE ユーザー ID（nullable） |
| line_display_name | VARCHAR(255)    |          | NULL                        | LINE 表示名                  |
| line_picture_url  | VARCHAR(255)    |          | NULL                        | LINE プロフィール画像        |
| customer_number   | VARCHAR(50)     |          | NULL                        | 顧客番号（業種別）           |
| name              | VARCHAR(255)    | ✓        | -                           | 氏名                         |
| name_kana         | VARCHAR(255)    |          | NULL                        | 氏名（カナ）                 |
| phone             | TEXT            |          | NULL                        | 電話番号（暗号化）           |
| email             | TEXT            |          | NULL                        | メールアドレス（暗号化）     |
| birthday          | DATE            |          | NULL                        | 生年月日                     |
| gender            | ENUM            |          | NULL                        | 性別                         |
| address           | JSON            |          | NULL                        | 住所情報                     |
| emergency_contact | JSON            |          | NULL                        | 緊急連絡先                   |
| medical_info      | JSON            |          | NULL                        | 医療情報（アレルギー等）     |
| preferences       | JSON            |          | NULL                        | 顧客設定・要望               |
| loyalty_rank      | ENUM            | ✓        | 'new'                       | ロイヤリティランク           |
| total_visits      | INT             | ✓        | 0                           | 来店回数                     |
| total_spent       | INT             | ✓        | 0                           | 累計利用金額                 |
| last_visit_date   | DATE            |          | NULL                        | 最終来店日                   |
| notes             | TEXT            |          | NULL                        | 備考                         |
| is_active         | BOOLEAN         | ✓        | TRUE                        | 有効フラグ                   |
| deleted_at        | TIMESTAMP       |          | NULL                        | 削除日時（SoftDeletes）      |
| created_at        | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                     |
| updated_at        | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                     |

**ENUM 値**:

- `gender`: 'male', 'female', 'other', 'prefer_not_to_say'
- `loyalty_rank`: 'new', 'regular', 'vip', 'premium'

#### **業種別顧客情報例**:

```json
// 医療系顧客
{
  "customer_number": "P202500123",
  "medical_info": {
    "allergies": ["ペニシリン", "卵"],
    "chronic_conditions": ["高血圧"],
    "medications": ["降圧剤"],
    "insurance_info": {
      "type": "国民健康保険",
      "number": "12345678"
    }
  },
  "emergency_contact": {
    "name": "田中花子",
    "relationship": "配偶者",
    "phone": "090-1234-5678"
  }
}

// 美容系顧客
{
  "customer_number": "B202500456",
  "preferences": {
    "preferred_staff": [1, 3],
    "hair_type": "くせ毛",
    "scalp_condition": "乾燥肌",
    "previous_treatments": ["カラー", "パーマ"],
    "allergies": ["ジアミン系染料"]
  }
}

// 施設系顧客
{
  "customer_number": "F202500789",
  "preferences": {
    "preferred_room_type": "会議室",
    "regular_usage": "月2回程度",
    "equipment_needs": ["プロジェクター", "ホワイトボード"],
    "catering_preferences": ["コーヒー", "軽食"]
  }
}
```

---

## 5. 予約管理

### 5.1 bookings（予約ヘッダー）**v1.2 構造変更**

**変更内容**: 複数メニュー組み合わせ対応のため、`menu_id` を削除し、詳細は `booking_details` テーブルで管理

| カラム名            | 型              | NOT NULL | デフォルト                  | 説明                                       |
| ------------------- | --------------- | -------- | --------------------------- | ------------------------------------------ |
| id                  | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | 予約 ID（PK）                              |
| store_id            | BIGINT UNSIGNED | ✓        | -                           | 店舗 ID（FK）                              |
| customer_id         | BIGINT UNSIGNED | ✓        | -                           | 顧客 ID（FK）                              |
| primary_resource_id | BIGINT UNSIGNED |          | NULL                        | 主担当リソース ID（FK）                    |
| booking_number      | VARCHAR(50)     | ✓        | -                           | 予約番号                                   |
| booking_date        | DATE            | ✓        | -                           | 予約日                                     |
| start_time          | TIME            | ✓        | -                           | 開始時間                                   |
| end_time            | TIME            | ✓        | -                           | 終了時間                                   |
| estimated_duration  | INT             | ✓        | 0                           | 見積所要時間（分）                         |
| actual_start_time   | TIMESTAMP       |          | NULL                        | 実際開始時間                               |
| actual_end_time     | TIMESTAMP       |          | NULL                        | 実際終了時間                               |
| status              | ENUM            | ✓        | 'pending'                   | 予約状態                                   |
| booking_source      | ENUM            | ✓        | 'liff'                      | 予約元                                     |
| booking_type        | ENUM            | ✓        | 'single'                    | **新規**: 予約タイプ（単体/組み合わせ）    |
| total_price         | INT             | ✓        | 0                           | 合計料金                                   |
| base_total_price    | INT             | ✓        | 0                           | **新規**: 基本料金合計（詳細の積み上げ）   |
| option_total_price  | INT             | ✓        | 0                           | **新規**: オプション料金合計               |
| set_discount_amount | INT             | ✓        | 0                           | **新規**: セット割引額                     |
| resource_price_diff | INT             | ✓        | 0                           | リソース料金差                             |
| auto_added_services | JSON            |          | NULL                        | **新規**: 自動追加サービス一覧             |
| customer_notes      | TEXT            |          | NULL                        | 顧客メモ                                   |
| staff_notes         | TEXT            |          | NULL                        | スタッフメモ                               |
| internal_notes      | TEXT            |          | NULL                        | 内部メモ                                   |
| combination_rules   | JSON            |          | NULL                        | **新規**: 組み合わせルール（割引・追加等） |
| cancellation_reason | TEXT            |          | NULL                        | キャンセル理由                             |
| cancelled_at        | TIMESTAMP       |          | NULL                        | キャンセル日時                             |
| confirmed_at        | TIMESTAMP       |          | NULL                        | 確定日時                                   |
| completed_at        | TIMESTAMP       |          | NULL                        | 完了日時                                   |
| hold_token          | VARCHAR(255)    |          | NULL                        | 仮押さえトークン                           |
| hold_expires_at     | TIMESTAMP       |          | NULL                        | 仮押さえ期限                               |
| phone_booking_data  | JSON            |          | NULL                        | **新規**: 電話予約時の操作ログ             |
| metadata            | JSON            |          | NULL                        | メタデータ                                 |
| deleted_at          | TIMESTAMP       |          | NULL                        | 削除日時（SoftDeletes）                    |
| created_at          | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                                   |
| updated_at          | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                                   |

**ENUM 値**:

- `status`: 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
- `booking_source`: 'liff', 'admin', 'phone', 'web', 'api'
- `booking_type`: 'single', 'combination', 'package', 'course'

### 5.2 booking_details（予約明細）**v1.2 新規テーブル**

**用途**: 1 つの予約に対する複数メニューの組み合わせを管理

| カラム名              | 型              | NOT NULL | デフォルト                  | 説明                                   |
| --------------------- | --------------- | -------- | --------------------------- | -------------------------------------- |
| id                    | BIGINT UNSIGNED | ✓        | AUTO_INCREMENT              | 予約明細 ID（PK）                      |
| booking_id            | BIGINT UNSIGNED | ✓        | -                           | 予約 ID（FK）                          |
| menu_id               | BIGINT UNSIGNED | ✓        | -                           | メニュー ID（FK）                      |
| resource_id           | BIGINT UNSIGNED |          | NULL                        | 担当リソース ID（FK）                  |
| sequence_order        | INT             | ✓        | 1                           | 実施順序（カット → カラー等）          |
| service_name          | VARCHAR(255)    | ✓        | -                           | サービス名（予約時点）                 |
| service_description   | TEXT            |          | NULL                        | サービス説明（予約時点）               |
| base_price            | INT             | ✓        | 0                           | 基本料金（予約時点）                   |
| base_duration         | INT             | ✓        | 0                           | 基本所要時間（分）                     |
| prep_duration         | INT             | ✓        | 0                           | 準備時間（分）                         |
| cleanup_duration      | INT             | ✓        | 0                           | 片付け時間（分）                       |
| total_duration        | INT             | ✓        | 0                           | 合計所要時間（分）                     |
| resource_price_diff   | INT             | ✓        | 0                           | リソース料金差                         |
| detail_discount       | INT             | ✓        | 0                           | 明細単位の割引                         |
| is_auto_added         | BOOLEAN         | ✓        | FALSE                       | 自動追加サービスフラグ                 |
| auto_add_reason       | VARCHAR(255)    |          | NULL                        | 自動追加理由                           |
| selected_options      | JSON            |          | NULL                        | 選択されたオプション一覧               |
| service_attributes    | JSON            |          | NULL                        | サービス属性（予約時点）               |
| start_time_offset     | INT             | ✓        | 0                           | 予約開始からのオフセット時間（分）     |
| end_time_offset       | INT             | ✓        | 0                           | 予約開始からの終了オフセット時間（分） |
| actual_start_time     | TIMESTAMP       |          | NULL                        | 実際開始時間                           |
| actual_end_time       | TIMESTAMP       |          | NULL                        | 実際終了時間                           |
| completion_status     | ENUM            | ✓        | 'pending'                   | 実施状況                               |
| staff_notes           | TEXT            |          | NULL                        | スタッフメモ（明細別）                 |
| customer_satisfaction | INT             |          | NULL                        | 顧客満足度（1-5）                      |
| created_at            | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP           | 作成日時                               |
| updated_at            | TIMESTAMP       | ✓        | CURRENT_TIMESTAMP ON UPDATE | 更新日時                               |

**ENUM 値**:

- `completion_status`: 'pending', 'in_progress', 'completed', 'cancelled', 'skipped'

**インデックス**:

- PRIMARY KEY (`id`)
- FOREIGN KEY `fk_booking_details_booking` (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
- FOREIGN KEY `fk_booking_details_menu` (`menu_id`) REFERENCES `menus` (`id`) ON DELETE RESTRICT
- FOREIGN KEY `fk_booking_details_resource` (`resource_id`) REFERENCES `resources` (`id`) ON DELETE SET NULL
- INDEX `idx_booking_details_booking_sequence` (`booking_id`, `sequence_order`)
- INDEX `idx_booking_details_menu` (`menu_id`)
- INDEX `idx_booking_details_resource` (`resource_id`)

#### **美容院での複数メニュー予約例**:

```json
// bookings テーブル
{
  "id": 123,
  "booking_number": "TG20250106001",
  "customer_id": 456,
  "booking_type": "combination",
  "total_price": 9500,
  "base_total_price": 10000,
  "set_discount_amount": 500,
  "auto_added_services": ["シャンプー", "ブロー"],
  "combination_rules": {
    "applied_discounts": [
      {"rule": "カット+カラーセット", "amount": 500}
    ],
    "auto_additions": [
      {"service": "シャンプー", "reason": "カラー施術必須"},
      {"service": "ブロー", "reason": "セット仕上げ"}
    ]
  }
}

// booking_details テーブル（複数レコード）
[
  {
    "booking_id": 123,
    "menu_id": 1,
    "sequence_order": 1,
    "service_name": "カット",
    "base_price": 4000,
    "total_duration": 60,
    "start_time_offset": 0,
    "end_time_offset": 60
  },
  {
    "booking_id": 123,
    "menu_id": 2,
    "sequence_order": 2,
    "service_name": "カラー",
    "base_price": 6000,
    "total_duration": 90,
    "start_time_offset": 60,
    "end_time_offset": 150,
    "selected_options": [
      {"option_id": 5, "name": "特殊カラー", "price": 2000}
    ]
  },
  {
    "booking_id": 123,
    "menu_id": 10,
    "sequence_order": 3,
    "service_name": "シャンプー",
    "base_price": 0,
    "total_duration": 15,
    "is_auto_added": true,
    "auto_add_reason": "カラー施術必須",
    "start_time_offset": 150,
    "end_time_offset": 165
  }
]
```

**ENUM 値**:

- `status`: 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
- `booking_source`: 'liff', 'admin', 'phone', 'walk_in', 'api'

---

## 6. Phase 21.3 実装済み機能

### API 実装

| エンドポイント                     | メソッド | 説明                 | 実装状況 |
| ---------------------------------- | -------- | -------------------- | -------- |
| `/api/v1/store/time-slot-settings` | GET      | 時間スロット設定取得 | ✅ 完了  |
| `/api/v1/store/time-slot-settings` | PUT      | 時間スロット設定更新 | ✅ 完了  |

### Store モデル機能

| メソッド                                  | 説明                         | 実装状況 |
| ----------------------------------------- | ---------------------------- | -------- |
| `getTimeSlotSettings()`                   | デフォルト値補完して設定取得 | ✅ 完了  |
| `updateTimeSlotSettings()`                | バリデーション付き設定更新   | ✅ 完了  |
| `initializeTimeSlotSettingsForIndustry()` | 業種別初期設定               | ✅ 完了  |
| `getSlotDurationMinutes()`                | 現在のスロット間隔取得       | ✅ 完了  |
| `getAvailableSlotDurations()`             | 選択可能間隔一覧             | ✅ 完了  |

### フロントエンド統合

| 機能                   | 説明                     | 実装状況 |
| ---------------------- | ------------------------ | -------- |
| 動的 FullCalendar 設定 | スロット設定に基づく表示 | ✅ 完了  |
| 空き時間生成           | 柔軟間隔対応             | ✅ 完了  |
| 設定 API 統合          | React コンポーネント統合 | ✅ 完了  |

---

## 7. マイグレーション履歴

### 実行済みマイグレーション

| ファイル名                                                            | 説明                            | 実行日     |
| --------------------------------------------------------------------- | ------------------------------- | ---------- |
| `2025_07_06_103327_add_time_slot_settings_to_stores_table.php`        | time_slot_settings カラム追加   | 2025-07-06 |
| `2025_07_04_135700_make_line_user_id_nullable_in_customers_table.php` | line_user_id を nullable に変更 | 2025-07-04 |
| `2025_07_04_135356_add_deleted_at_to_bookings_table.php`              | bookings に deleted_at 追加     | 2025-07-04 |

### 今後予定のマイグレーション

| 予定機能           | 説明                        | 予定時期 |
| ------------------ | --------------------------- | -------- |
| 業種別テンプレート | industry_templates テーブル | Phase 22 |
| 定期予約機能       | recurring_bookings テーブル | Phase 24 |
| 分析レポート       | analytics テーブル          | Phase 25 |

---

## 8. パフォーマンス最適化

### インデックス戦略

```sql
-- 予約検索の最適化
CREATE INDEX idx_bookings_store_date_status ON bookings(store_id, booking_date, status);
CREATE INDEX idx_bookings_resource_date ON bookings(resource_id, booking_date, start_time);

-- 顧客検索の最適化
CREATE INDEX idx_customers_store_phone ON customers(store_id, phone(50));
CREATE INDEX idx_customers_line_user ON customers(line_user_id);

-- リソース検索の最適化
CREATE INDEX idx_resources_store_type_active ON resources(store_id, type, is_active);
```

### JSON フィールド最適化

```sql
-- time_slot_settings の検索最適化
CREATE INDEX idx_stores_slot_duration ON stores((JSON_EXTRACT(time_slot_settings, '$.slot_duration_minutes')));
```

---

## 9. データ整合性

### 外部キー制約

```sql
-- 予約の整合性
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE;
```

### チェック制約

```sql
-- 時間の整合性チェック
ALTER TABLE bookings ADD CONSTRAINT chk_booking_times CHECK (start_time < end_time);
ALTER TABLE bookings ADD CONSTRAINT chk_booking_date CHECK (booking_date >= CURRENT_DATE - INTERVAL 1 YEAR);

-- 料金の整合性チェック
ALTER TABLE bookings ADD CONSTRAINT chk_booking_prices CHECK (total_price >= 0 AND base_price >= 0);
```

---

**最終更新**: 2025 年 7 月 6 日  
**バージョン**: 1.1  
**実装状況**: Phase 21.3 完了（柔軟時間スロット設定システム）
