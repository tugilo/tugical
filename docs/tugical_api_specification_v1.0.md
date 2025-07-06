# tugical API 設計書

## RESTful API 仕様書

**Version**: 1.1  
**Date**: 2025 年 7 月 6 日  
**Project**: tugical（ツギカル）  
**Base URL**: `https://api.tugical.com`

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

### 2.3 予約作成（管理者）

```http
POST /api/v1/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 456,
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

## 5. リソース管理 API

### 5.1 リソース一覧取得

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

### 5.2 リソース作成

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

## 6. メニュー管理 API

### 6.1 メニュー一覧取得

```http
GET /api/v1/menus?category=hair&is_active=true
Authorization: Bearer {token}
```

### 6.2 メニュー作成

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

## 7. 通知管理 API

### 7.1 通知履歴取得

```http
GET /api/v1/notifications?customer_id=456&type=reminder&status=sent
Authorization: Bearer {token}
```

### 7.2 通知送信

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

### 7.3 通知テンプレート取得

```http
GET /api/v1/notification-templates?type=booking_confirmed
Authorization: Bearer {token}
```

---

## 8. LIFF API（顧客向け）

### 8.1 店舗情報取得

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

### 8.2 顧客情報取得・作成

```http
GET /api/v1/liff/customers/profile
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 8.3 メニュー一覧取得

```http
GET /api/v1/liff/menus
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 8.4 空き時間取得

```http
GET /api/v1/liff/availability?menu_id=789&date=2025-06-28&resource_id=1
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 8.5 予約申込み

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

### 8.6 予約履歴取得

```http
GET /api/v1/liff/bookings/history
X-Line-User-Id: U1234567890abcdef
X-Store-Id: 1
```

### 8.7 予約変更依頼

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

## 9. LINE Webhook API

### 9.1 メッセージ受信

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

### 9.2 友だち追加

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

## 10. エラーコード一覧

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

---

## 11. レート制限

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

## 12. セキュリティ

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
