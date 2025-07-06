# tugical API 設計書

## RESTful API 仕様書

**Version**: 1.2  
**Date**: 2025 年 1 月 6 日  
**Project**: tugical（ツギカル）  
**Base URL**: `https://api.tugical.com`

**更新履歴**:

- v1.2 (2025-01-06): **複数メニュー組み合わせ対応** - 電話予約最適化 API、メニュー組み合わせ計算 API 追加
- v1.1 (2025-07-06): 時間スロット設定 API 追加

---

## 基本仕様

### 認証方式

- **管理者 API**: Laravel Sanctum（Bearer Token）
- **LIFF API**: LINE User ID 検証
- **LINE Webhook**: Channel Secret 検証

### レスポンス形式

```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "meta": {
    "timestamp": "2025-06-28T10:00:00+09:00",
    "version": "1.0"
  }
}
```

### エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": object
  },
  "meta": {
    "timestamp": "2025-06-28T10:00:00+09:00"
  }
}
```

### HTTP ステータスコード

- `200` OK - 成功
- `201` Created - リソース作成成功
- `400` Bad Request - リクエストエラー
- `401` Unauthorized - 認証エラー
- `403` Forbidden - 権限エラー
- `404` Not Found - リソースが存在しない
- `409` Conflict - 予約競合等
- `422` Unprocessable Entity - バリデーションエラー
- `500` Internal Server Error - サーバーエラー

---

## 1. 認証 API

### 1.1 管理者ログイン

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123",
  "store_id": 1
}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "token": "sanctum_token_here",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "owner",
      "store": {
        "id": 1,
        "name": "サンプル美容院",
        "plan_type": "standard"
      }
    },
    "permissions": ["booking.manage", "customer.view", "staff.manage"]
  },
  "message": "ログインに成功しました"
}
```

### 1.2 ログアウト

```http
POST /api/v1/auth/logout
Authorization: Bearer {token}
```

### 1.3 ユーザー情報取得

```http
GET /api/v1/auth/user
Authorization: Bearer {token}
```

---

## 2. 予約管理 API

### 2.1 予約一覧取得

```http
GET /api/v1/bookings?date=2025-06-28&status=confirmed&resource_id=1&page=1&per_page=20
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 123,
        "booking_number": "R20250628001",
        "booking_date": "2025-06-28",
        "start_time": "14:00",
        "end_time": "15:00",
        "status": "confirmed",
        "total_price": 4500,
        "customer": {
          "id": 456,
          "name": "山田太郎",
          "phone": "090-1234-5678"
        },
        "menu": {
          "id": 789,
          "name": "カット",
          "base_duration": 60
        },
        "resource": {
          "id": 1,
          "name": "田中美容師",
          "type": "staff"
        },
        "customer_notes": "短めにお願いします",
        "created_at": "2025-06-27T10:00:00+09:00"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 150,
      "last_page": 8
    }
  }
}
```

### 2.2 予約詳細取得

```http
GET /api/v1/bookings/123
Authorization: Bearer {token}
```

### 2.3 予約作成（管理者・複数メニュー対応）**v1.2 拡張**

#### 単体メニュー予約（従来）

```http
POST /api/v1/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 456,
  "booking_type": "single",
  "menu_id": 789,
  "resource_id": 1,
  "booking_date": "2025-06-28",
  "start_time": "14:00",
  "customer_notes": "初回利用です",
  "staff_notes": "カウンセリング重視",
  "options": [1, 2],
  "booking_source": "phone"
}
```

#### 複数メニュー組み合わせ予約（新機能）

```http
POST /api/v1/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 456,
  "booking_type": "combination",
  "primary_resource_id": 1,
  "booking_date": "2025-06-28",
  "start_time": "14:00",
  "customer_notes": "カット後にカラーをお願いします",
  "staff_notes": "初回カラーのため、パッチテスト済み確認",
  "booking_source": "phone",
  "menus": [
    {
      "menu_id": 1,
      "resource_id": 1,
      "sequence_order": 1,
      "selected_options": [
        {"option_id": 5, "option_name": "デザインカット", "price": 1000}
      ]
    },
    {
      "menu_id": 2,
      "resource_id": 1,
      "sequence_order": 2,
      "selected_options": [
        {"option_id": 12, "option_name": "特殊カラー", "price": 2000}
      ]
    }
  ],
  "apply_set_discounts": true,
  "auto_add_services": true,
  "phone_booking_context": {
    "call_start_time": "2025-06-28T13:45:00+09:00",
    "customer_requests": ["短時間で", "料金重視"],
    "alternative_dates_checked": ["2025-06-29", "2025-06-30"]
  }
}
```

**レスポンス（複数メニュー）**:

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 123,
      "booking_number": "TG20250106001",
      "booking_type": "combination",
      "booking_date": "2025-06-28",
      "start_time": "14:00",
      "end_time": "16:45",
      "estimated_duration": 165,
      "status": "confirmed",
      "total_price": 9500,
      "base_total_price": 10000,
      "set_discount_amount": 500,
      "auto_added_services": ["シャンプー", "ブロー"],
      "customer": {
        "id": 456,
        "name": "山田太郎"
      },
      "details": [
        {
          "id": 1,
          "menu_id": 1,
          "service_name": "カット",
          "sequence_order": 1,
          "base_price": 4000,
          "total_duration": 60,
          "start_time_offset": 0,
          "end_time_offset": 60,
          "selected_options": [
            { "option_name": "デザインカット", "price": 1000 }
          ]
        },
        {
          "id": 2,
          "menu_id": 2,
          "service_name": "カラー",
          "sequence_order": 2,
          "base_price": 6000,
          "total_duration": 90,
          "start_time_offset": 60,
          "end_time_offset": 150,
          "selected_options": [{ "option_name": "特殊カラー", "price": 2000 }]
        },
        {
          "id": 3,
          "menu_id": 10,
          "service_name": "シャンプー",
          "sequence_order": 3,
          "base_price": 0,
          "total_duration": 15,
          "is_auto_added": true,
          "auto_add_reason": "カラー施術必須",
          "start_time_offset": 150,
          "end_time_offset": 165
        }
      ],
      "combination_rules": {
        "applied_discounts": [{ "rule": "カット+カラーセット", "amount": 500 }],
        "auto_additions": [
          { "service": "シャンプー", "reason": "カラー施術必須" }
        ]
      }
    }
  },
  "message": "予約が正常に作成されました"
}
```

### 2.3.1 メニュー組み合わせ計算 API **v1.2 新機能**

電話予約時にリアルタイムで料金・時間を計算

```http
POST /api/v1/bookings/calculate
Authorization: Bearer {token}
Content-Type: application/json

{
  "menu_ids": [1, 2],
  "resource_id": 1,
  "booking_date": "2025-06-28",
  "selected_options": {
    "1": [5],
    "2": [12]
  }
}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "calculation": {
      "total_price": 9500,
      "base_total_price": 10000,
      "set_discount_amount": 500,
      "total_duration": 165,
      "estimated_end_time": "16:45",
      "price_breakdown": [
        { "service": "カット", "base_price": 4000, "options_price": 1000 },
        { "service": "カラー", "base_price": 6000, "options_price": 2000 },
        { "service": "シャンプー", "base_price": 0, "auto_added": true }
      ],
      "time_breakdown": [
        { "service": "カット", "duration": 60, "start_offset": 0 },
        { "service": "カラー", "duration": 90, "start_offset": 60 },
        { "service": "シャンプー", "duration": 15, "start_offset": 150 }
      ],
      "applied_discounts": [{ "rule": "カット+カラーセット", "amount": 500 }],
      "auto_added_services": [
        { "service": "シャンプー", "reason": "カラー施術必須" }
      ]
    }
  }
}
```

### 2.3.2 電話予約最適化 API **v1.2 新機能**

美容師が電話中に瞬時に空き時間を確認

```http
GET /api/v1/bookings/phone-availability?resource_id=1&duration=165&date_from=2025-06-28&date_to=2025-07-05
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "availability": {
      "2025-06-28": {
        "date_label": "今日",
        "available_slots": [
          {
            "start_time": "10:00",
            "end_time": "12:45",
            "duration_minutes": 165
          },
          {
            "start_time": "15:30",
            "end_time": "18:15",
            "duration_minutes": 165
          }
        ],
        "slots_count": 2
      },
      "2025-06-29": {
        "date_label": "明日",
        "available_slots": [
          {
            "start_time": "09:00",
            "end_time": "11:45",
            "duration_minutes": 165
          },
          {
            "start_time": "14:00",
            "end_time": "16:45",
            "duration_minutes": 165
          }
        ],
        "slots_count": 2
      },
      "2025-06-30": {
        "date_label": "6月30日(月)",
        "available_slots": [
          {
            "start_time": "13:00",
            "end_time": "15:45",
            "duration_minutes": 165
          }
        ],
        "slots_count": 1
      }
    },
    "summary": {
      "total_available_days": 3,
      "total_available_slots": 5,
      "earliest_available": "2025-06-28 10:00",
      "resource_name": "田中美容師"
    }
  }
}
```

### 2.4 予約更新

```http
PUT /api/v1/bookings/123
Authorization: Bearer {token}
Content-Type: application/json

{
  "booking_date": "2025-06-29",
  "start_time": "15:00",
  "status": "confirmed",
  "staff_notes": "時間変更対応済み"
}
```

### 2.5 予約キャンセル

```http
DELETE /api/v1/bookings/123
Authorization: Bearer {token}
Content-Type: application/json

{
  "cancellation_reason": "お客様都合によるキャンセル",
  "send_notification": true
}
```

### 2.6 予約ステータス変更

```http
PATCH /api/v1/bookings/123/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "completed",
  "completion_notes": "施術完了、次回予約の提案済み"
}
```

---

## 3. 空き時間・可用性 API

### 3.1 空き時間取得

```http
GET /api/v1/availability?date=2025-06-28&menu_id=789&resource_id=1
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "start_time": "09:00",
        "end_time": "10:00",
        "duration": 60,
        "resource_id": 1,
        "resource_name": "田中美容師"
      },
      {
        "start_time": "14:00",
        "end_time": "15:00",
        "duration": 60,
        "resource_id": 1,
        "resource_name": "田中美容師"
      }
    ],
    "business_hours": {
      "start": "09:00",
      "end": "18:00",
      "break_time": {
        "start": "12:00",
        "end": "13:00"
      }
    }
  }
}
```

### 3.2 仮押さえ作成

```http
POST /api/v1/hold-slots
Authorization: Bearer {token}
Content-Type: application/json

{
  "menu_id": 789,
  "resource_id": 1,
  "booking_date": "2025-06-28",
  "start_time": "14:00",
  "customer_id": 456
}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "hold_token": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
    "expires_at": "2025-06-28T14:10:00+09:00",
    "booking_slot": {
      "date": "2025-06-28",
      "start_time": "14:00",
      "end_time": "15:00",
      "resource_id": 1
    }
  },
  "message": "時間枠を10分間仮押さえしました"
}
```

### 3.3 仮押さえ解除

```http
DELETE /api/v1/hold-slots/{hold_token}
Authorization: Bearer {token}
```

---

## 4. 顧客管理 API

### 4.1 顧客一覧取得

```http
GET /api/v1/customers?search=山田&rank=vip&page=1&per_page=20
Authorization: Bearer {token}
```

### 4.2 顧客詳細取得

```http
GET /api/v1/customers/456
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 456,
      "line_user_id": "U1234567890abcdef",
      "name": "山田太郎",
      "phone": "090-1234-5678",
      "email": "yamada@example.com",
      "loyalty_rank": "regular",
      "total_bookings": 15,
      "total_spent": 67500,
      "no_show_count": 1,
      "is_restricted": false,
      "first_visit_at": "2024-12-01T14:00:00+09:00",
      "last_visit_at": "2025-06-15T16:00:00+09:00",
      "allergies": "パーマ液でかゆみあり",
      "preferences": {
        "preferred_staff": [1, 3],
        "preferred_time": "afternoon",
        "communication_style": "casual"
      }
    }
  }
}
```

### 4.3 顧客作成

```http
POST /api/v1/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "line_user_id": "U1234567890abcdef",
  "name": "佐藤花子",
  "phone": "080-9876-5432",
  "email": "sato@example.com",
  "allergies": "特になし",
  "notes": "新規顧客、カウンセリング重視"
}
```

### 4.4 顧客更新

```http
PUT /api/v1/customers/456
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "090-1111-2222",
  "loyalty_rank": "vip",
  "notes": "常連顧客、特別対応"
}
```

---

## 4. 店舗管理 API

### 4.1 時間スロット設定取得

```http
GET /api/v1/store/time-slot-settings
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "time_slot_settings": {
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
  },
  "message": "時間スロット設定を取得しました"
}
```

### 4.2 時間スロット設定更新

```http
PUT /api/v1/store/time-slot-settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "slot_duration_minutes": 15,
  "available_durations": [5, 10, 15, 30, 60],
  "business_hours": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" },
    "wednesday": { "start": "09:00", "end": "18:00" },
    "thursday": { "start": "09:00", "end": "18:00" },
    "friday": { "start": "09:00", "end": "18:00" },
    "saturday": { "start": "09:00", "end": "17:00" },
    "sunday": { "closed": true }
  },
  "break_times": [
    { "start": "12:00", "end": "13:00", "label": "昼休み" }
  ],
  "timezone": "Asia/Tokyo",
  "slot_label_format": "HH:mm",
  "auto_update_calendar": true
}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "time_slot_settings": {
      "slot_duration_minutes": 15,
      "available_durations": [5, 10, 15, 30, 60],
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
  },
  "message": "時間スロット設定を更新しました"
}
```

**バリデーションエラー例**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {
      "slot_duration_minutes": "時間スロットは5分から480分の間で設定してください",
      "business_hours.monday.start": "開始時間は終了時間より前に設定してください"
    }
  }
}
```

**業種別推奨設定**:

```json
// 医療系（5-10分間隔）
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
  "break_times": [{"start": "12:00", "end": "13:00", "label": "昼休み"}]
}

// 美容系（30分間隔）
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

// 施設・研修系（60分間隔）
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

## 6. リソース管理 API

### 6.1 リソース一覧取得

```http
GET /api/v1/resources?type=staff&is_active=true
Authorization: Bearer {token}
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": 1,
        "type": "staff",
        "name": "田中美容師",
        "display_name": "田中 一郎",
        "description": "カット・カラー専門、経験15年",
        "photo_url": "https://cdn.tugical.com/staff/tanaka.jpg",
        "attributes": {
          "specialties": ["cut", "color"],
          "skill_level": "expert",
          "languages": ["japanese"]
        },
        "working_hours": {
          "monday": { "start": "10:00", "end": "19:00" },
          "tuesday": { "start": "09:00", "end": "18:00" },
          "wednesday": "off"
        },
        "efficiency_rate": 0.9,
        "hourly_rate_diff": 500,
        "capacity": 2,
        "is_active": true
      }
    ]
  }
}
```

### 6.2 リソース作成

```http
POST /api/v1/resources
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "staff",
  "name": "佐藤美容師",
  "display_name": "佐藤 花子",
  "description": "パーマ・縮毛矯正専門",
  "attributes": {
    "specialties": ["perm", "straightening"],
    "skill_level": "advanced"
  },
  "working_hours": {
    "tuesday": {"start": "10:00", "end": "18:00"},
    "thursday": {"start": "10:00", "end": "18:00"},
    "saturday": {"start": "09:00", "end": "17:00"}
  },
  "efficiency_rate": 1.1,
  "hourly_rate_diff": 300,
  "capacity": 1
}
```

---

## 7. メニュー管理 API

### 7.1 メニュー一覧取得

```http
GET /api/v1/menus?category=hair&is_active=true
Authorization: Bearer {token}
```

### 7.2 メニュー作成

```http
POST /api/v1/menus
Authorization: Bearer {token}
Content-Type: application/json

{
  "category": "hair",
  "name": "カット+カラー",
  "description": "カット＋フルカラーのセットメニュー",
  "base_duration": 120,
  "prep_duration": 15,
  "cleanup_duration": 15,
  "base_price": 8000,
  "tax_included": true,
  "available_resources": [1, 2, 3],
  "options": [
    {
      "name": "トリートメント追加",
      "price": 1500,
      "duration": 20
    }
  ]
}
```

---

## 8. 通知管理 API

### 8.1 通知履歴取得

```http
GET /api/v1/notifications?customer_id=456&type=reminder&status=sent
Authorization: Bearer {token}
```

### 8.2 通知送信

```http
POST /api/v1/notifications/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 456,
  "type": "reminder",
  "message": "明日14:00からの予約のリマインドです。",
  "scheduled_at": "2025-06-27T19:00:00+09:00"
}
```

### 8.3 通知テンプレート取得

```http
GET /api/v1/notification-templates?type=booking_confirmed
Authorization: Bearer {token}
```

---

## 9. LIFF API（顧客向け）

### 9.1 店舗情報取得

```http
GET /api/v1/liff/stores/{store_slug}
X-Line-User-Id: U1234567890abcdef
```

**レスポンス**:

```json
{
  "success": true,
  "data": {
    "store": {
      "id": 1,
      "name": "サンプル美容院",
      "description": "カット・カラー専門の美容院",
      "address": "東京都渋谷区○○1-2-3",
      "phone": "03-1234-5678",
      "business_hours": {
        "monday": { "start": "09:00", "end": "18:00" },
        "tuesday": { "start": "09:00", "end": "18:00" }
      },
      "booking_settings": {
        "approval_mode": "auto",
        "advance_booking_days": 30,
        "cancellation_hours": 24
      }
    }
  }
}
```

### 9.2 顧客情報取得・作成

```http
GET /api/v1/liff/customers/profile
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 9.3 メニュー一覧取得

```http
GET /api/v1/liff/menus
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 9.4 空き時間取得

```http
GET /api/v1/liff/availability?menu_id=789&date=2025-06-28&resource_id=1
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 9.5 予約申込み

```http
POST /api/v1/liff/bookings
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
Content-Type: application/json

{
  "menu_id": 789,
  "resource_id": 1,
  "booking_date": "2025-06-28",
  "start_time": "14:00",
  "customer_info": {
    "name": "山田太郎",
    "phone": "090-1234-5678",
    "notes": "初回利用です"
  },
  "hold_token": "abc123def456...",
  "preferred_times": [
    {"date": "2025-06-28", "time": "14:00"},
    {"date": "2025-06-28", "time": "15:00"},
    {"date": "2025-06-29", "time": "10:00"}
  ]
}
```

### 9.6 予約履歴取得

```http
GET /api/v1/liff/bookings/history
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 9.7 予約変更依頼

```http
POST /api/v1/liff/bookings/123/change-request
X-Line-User-Id: U1234567890abcdef
Content-Type: application/json

{
  "new_preferred_times": [
    {"date": "2025-06-29", "time": "14:00"},
    {"date": "2025-06-29", "time": "15:00"}
  ],
  "reason": "都合が悪くなったため"
}
```

---

## 10. LINE Webhook API

### 10.1 メッセージ受信

```http
POST /api/v1/line/webhook
X-Line-Signature: signature_here
Content-Type: application/json

{
  "destination": "xxxxxxxxxx",
  "events": [
    {
      "type": "message",
      "mode": "active",
      "timestamp": 1625097600000,
      "source": {
        "type": "user",
        "userId": "U1234567890abcdef"
      },
      "message": {
        "id": "444444444444444444",
        "type": "text",
        "text": "予約したい"
      },
      "replyToken": "0f3779fba3b349968c5d07db31eab56f"
    }
  ]
}
```

### 10.2 友だち追加

```http
POST /api/v1/line/webhook
X-Line-Signature: signature_here
Content-Type: application/json

{
  "events": [
    {
      "type": "follow",
      "mode": "active",
      "timestamp": 1625097600000,
      "source": {
        "type": "user",
        "userId": "U1234567890abcdef"
      },
      "replyToken": "0f3779fba3b349968c5d07db31eab56f"
    }
  ]
}
```

---

## 11. エラーコード一覧

### 認証エラー

- `AUTH_TOKEN_INVALID` - 認証トークンが無効
- `AUTH_TOKEN_EXPIRED` - 認証トークンが期限切れ
- `AUTH_INSUFFICIENT_PERMISSION` - 権限不足

### 予約関連エラー

- `BOOKING_CONFLICT` - 予約時間の競合
- `BOOKING_NOT_FOUND` - 予約が見つからない
- `BOOKING_ALREADY_CANCELLED` - 既にキャンセル済み
- `BOOKING_CANCELLATION_DEADLINE_PASSED` - キャンセル期限超過
- `HOLD_TOKEN_INVALID` - 仮押さえトークンが無効
- `HOLD_TOKEN_EXPIRED` - 仮押さえトークンが期限切れ

### 顧客関連エラー

- `CUSTOMER_NOT_FOUND` - 顧客が見つからない
- `CUSTOMER_RESTRICTED` - 予約制限中の顧客
- `LINE_USER_NOT_LINKED` - LINE ユーザーが店舗に未登録

### リソース関連エラー

- `RESOURCE_NOT_AVAILABLE` - リソースが利用不可
- `RESOURCE_NOT_FOUND` - リソースが見つからない
- `MENU_RESOURCE_MISMATCH` - メニューとリソースの組み合わせが無効

### 営業時間関連エラー

- `OUTSIDE_BUSINESS_HOURS` - 営業時間外
- `STORE_HOLIDAY` - 店舗休業日
- `ADVANCE_BOOKING_LIMIT_EXCEEDED` - 事前予約期限超過

### 店舗設定関連エラー

- `INVALID_TIME_SLOT_DURATION` - 時間スロット間隔が無効（5 分〜480 分範囲外）
- `INVALID_BUSINESS_HOURS` - 営業時間設定が無効
- `INVALID_BREAK_TIME_SETTING` - 休憩時間設定が無効
- `TIME_SLOT_SETTINGS_NOT_FOUND` - 時間スロット設定が見つからない

---

## 12. レート制限

### プラン別制限

- **フリープラン**: 100 requests/minute
- **スタンダードプラン**: 500 requests/minute
- **プロプラン**: 1000 requests/minute
- **エンタープライズプラン**: 2000 requests/minute

### 制限超過時のレスポンス

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト制限を超過しました",
    "details": {
      "limit": 100,
      "reset_at": "2025-06-28T10:01:00+09:00"
    }
  }
}
```

---

## 13. セキュリティ

### CORS 設定

```
Access-Control-Allow-Origin: https://liff.line.me, https://admin.tugical.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Authorization, Content-Type, X-Line-User-Id, X-Store-Id
```

### セキュリティヘッダー

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 変更履歴

| バージョン | 日付       | 変更内容                  | 担当者      |
| ---------- | ---------- | ------------------------- | ----------- |
| 1.0        | 2025-06-28 | 初版作成                  | tugilo inc. |
| 1.1        | 2025-07-06 | 時間スロット設定 API 追加 | tugilo inc. |

---
