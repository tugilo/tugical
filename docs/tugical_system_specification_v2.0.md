# tugical システム仕様書 v2.0

**更新日**: 2025-07-05  
**バージョン**: 2.0  
**ステータス**: Phase 17 完了、Phase 18 実装予定

---

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [実装済み機能](#実装済み機能)
4. [FullCalendar Timeline 仕様](#fullcalendar-timeline仕様)
5. [API 仕様](#api仕様)
6. [データベース設計](#データベース設計)
7. [UI/UX 設計](#uiux設計)
8. [セキュリティ仕様](#セキュリティ仕様)
9. [パフォーマンス仕様](#パフォーマンス仕様)
10. [デプロイメント仕様](#デプロイメント仕様)
11. [今後の実装予定](#今後の実装予定)

---

## システム概要

### プロジェクト情報

- **サービス名**: tugical（ツギカル）
- **コンセプト**: "次の時間が、もっと自由になる。"
- **種別**: LINE 連携型予約管理 SaaS
- **対象業種**: 美容室、クリニック、レンタルスペース、学校、アクティビティ
- **リポジトリ**: https://github.com/tugilo/tugical

### 技術スタック

```yaml
Frontend:
  - React 18 + TypeScript
  - Vite (ビルドツール)
  - Tailwind CSS (tugicalデザインシステム)
  - Framer Motion (アニメーション)
  - FullCalendar Timeline (予約管理)
  - React Router (ルーティング)
  - Zustand (状態管理)

Backend:
  - Laravel 10 + PHP 8.2
  - MariaDB 10.11 (データベース)
  - Redis 7.2 (キャッシュ・セッション)
  - Laravel Sanctum (認証)
  - Laravel Queue (非同期処理)

Infrastructure:
  - Docker + Docker Compose
  - Nginx (リバースプロキシ)
  - VPS統一運用 → 段階的クラウド移行
```

### 開発環境

```bash
Development:   http://dev.tugical.com (http://localhost)
Staging:       https://staging.tugical.com
Production:    https://tugical.com
```

---

## アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        tugical System                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ├── Admin Dashboard (管理者用)                             │
│  │   ├── 予約管理 (FullCalendar Timeline)                  │
│  │   ├── 顧客管理 (検索・フィルタリング)                   │
│  │   ├── メニュー管理 (CRUD操作)                           │
│  │   ├── リソース管理 (担当者・設備)                       │
│  │   └── 設定管理 (業種・通知設定)                         │
│  └── LIFF App (顧客用LINE連携)                              │
│      ├── 予約フロー (5ステップ)                             │
│      ├── 予約履歴                                           │
│      └── 顧客情報管理                                       │
├─────────────────────────────────────────────────────────────┤
│  Backend API (Laravel)                                     │
│  ├── 認証・認可 (Sanctum)                                  │
│  ├── マルチテナント (店舗分離)                              │
│  ├── 予約管理 (競合チェック・仮押さえ)                      │
│  ├── 通知システム (LINE API)                               │
│  └── 業種テンプレート                                       │
├─────────────────────────────────────────────────────────────┤
│  Database (MariaDB)                                        │
│  ├── 店舗・テナント管理                                     │
│  ├── 予約・顧客データ                                       │
│  ├── メニュー・リソース                                     │
│  └── 通知・設定データ                                       │
├─────────────────────────────────────────────────────────────┤
│  External Services                                         │
│  ├── LINE Messaging API                                   │
│  ├── LINE LIFF                                            │
│  └── Redis (キャッシュ・セッション)                        │
└─────────────────────────────────────────────────────────────┘
```

### マルチテナント設計

```typescript
// 全テーブルにstore_id分離
interface BaseModel {
  id: number;
  store_id: number; // 必須：テナント分離
  created_at: string;
  updated_at: string;
  deleted_at?: string; // SoftDeletes対応
}

// 自動スコープ適用
class TenantScope implements Scope {
  apply(builder: Builder, model: Model): void {
    if (auth().check() && auth().user().store_id) {
      builder.where(model.getTable() + ".store_id", auth().user().store_id);
    }
  }
}
```

---

## 実装済み機能

### ✅ Phase 1-17: 基盤〜Timeline 準備完了

#### **認証システム**

```typescript
// 実装済み機能
- ログイン・ログアウト
- Sanctum トークン認証
- マルチテナント対応
- 認証ガード・ミドルウェア

// テストアカウント
owner@tugical.test / tugical123
```

#### **予約管理システム**

```typescript
// 実装済み機能
- CRUD操作 (作成・表示・更新・削除)
- リスト表示 (タイムライン形式)
- 時間選択UI (空き時間可視化)
- 表示モード切り替え (リスト/タイムライン)
- フィルタリング (日付・ステータス・担当者)
- 検索機能
- ページネーション

// API エンドポイント
GET    /api/v1/bookings
POST   /api/v1/bookings
GET    /api/v1/bookings/{id}
PUT    /api/v1/bookings/{id}
DELETE /api/v1/bookings/{id}
```

#### **顧客管理システム**

```typescript
// 実装済み機能
- CRUD操作
- 検索・フィルタリング
- ロイヤリティランク管理
- LINE連携準備
- 住所自動補完

// 顧客データ構造
interface Customer {
  id: number;
  store_id: number;
  line_user_id?: string; // nullable
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyalty_rank: 'new' | 'regular' | 'vip' | 'premium';
}
```

#### **メニュー管理システム**

```typescript
// 実装済み機能
- CRUD操作
- カテゴリ別管理
- オプション管理
- 動的オプション読み込み
- 価格・時間管理

// メニューデータ構造
interface Menu {
  id: number;
  store_id: number;
  name: string;
  category: string;
  base_price: number;
  base_duration: number; // 分
  is_active: boolean;
  options?: MenuOption[];
}
```

#### **リソース管理システム**

```typescript
// 統一リソース概念実装
type ResourceType = "staff" | "room" | "equipment" | "vehicle";

interface Resource {
  id: number;
  store_id: number;
  type: ResourceType;
  name: string;
  display_name: string;
  capacity?: number;
  efficiency_rate: number; // 0.8-1.2
  hourly_rate_diff: number; // 指名料金差
  working_hours: Record<string, any>; // JSON
  is_active: boolean;
}

// 業種別表示名
const displayNames = {
  beauty: { resource: "スタッフ", customer: "お客様" },
  clinic: { resource: "先生", customer: "患者様" },
  rental: { resource: "部屋", customer: "ご利用者様" },
  school: { resource: "講師", customer: "生徒様" },
  activity: { resource: "ガイド", customer: "参加者様" },
};
```

#### **UI/UX コンポーネント**

```typescript
// 実装済みコンポーネント
- Button (5バリアント・5サイズ)
- Card (ヘッダー・ボディ・フッター)
- Modal (統一モーダルシステム)
- LoadingScreen
- ToastContainer (4通知タイプ)
- DatePicker (カスタム実装)
- FormField (バリデーション対応)

// レイアウトシステム
- DashboardLayout (レスポンシブサイドバー)
- 認証ガード
- ルーティングシステム
```

---

## FullCalendar Timeline 仕様

### 🚀 Phase 18 実装予定機能

#### **基本設定**

```typescript
// FullCalendar Timeline設定
const calendarConfig = {
  plugins: [resourceTimelinePlugin, interactionPlugin],
  initialView: "resourceTimelineDay",
  headerToolbar: {
    left: "prev,next today",
    center: "title",
    right: "resourceTimelineDay,resourceTimelineWeek",
  },

  // 時間軸設定
  slotMinTime: "09:00:00",
  slotMaxTime: "21:00:00",
  slotDuration: "00:30:00",
  slotLabelInterval: "01:00:00",

  // 日本語対応
  locale: "ja",
  timeZone: "Asia/Tokyo",

  // スタイル設定
  height: "auto",
  contentHeight: 400,
  resourceAreaWidth: "200px",
};
```

#### **リソース設定**

```typescript
// リソース（担当者）データ変換
const calendarResources: ResourceInput[] = [
  // 指定なしリソース
  {
    id: "unassigned",
    title: "指定なし",
    extendedProps: { type: "unassigned", color: "#gray-300" },
  },
  // スタッフリソース
  ...resources.map((resource) => ({
    id: resource.id.toString(),
    title: resource.display_name || resource.name,
    extendedProps: {
      type: resource.type,
      color: getResourceColor(resource.type),
      photo: resource.image_url,
    },
  })),
];

// リソースタイプ別色分け
const resourceColors = {
  staff: "#10b981", // エメラルドグリーン
  room: "#3b82f6", // ブルー
  equipment: "#8b5cf6", // パープル
  vehicle: "#f59e0b", // アンバー
};
```

#### **イベント表示**

```typescript
// 予約データのイベント変換
const calendarEvents: EventInput[] = bookings.map((booking) => ({
  id: booking.id.toString(),
  title: `${booking.customer.name} - ${booking.menu.name}`,
  start: new Date(`${booking.booking_date}T${booking.start_time}`),
  end: new Date(`${booking.booking_date}T${booking.end_time}`),
  resourceId: booking.resource_id?.toString() || "unassigned",
  backgroundColor: getStatusColor(booking.status),
  borderColor: getStatusBorderColor(booking.status),
  textColor: getStatusTextColor(booking.status),
  extendedProps: {
    booking,
    customerName: booking.customer.name,
    menuName: booking.menu.name,
    price: booking.total_price,
    status: booking.status,
    notes: booking.customer_notes,
  },
}));

// ステータス別色分け
const statusColors = {
  pending: "#fbbf24", // イエロー
  confirmed: "#10b981", // グリーン
  cancelled: "#ef4444", // レッド
  completed: "#6b7280", // グレー
  no_show: "#dc2626", // ダークレッド
};
```

#### **インタラクション機能**

```typescript
// ドラッグ&ドロップ処理
const handleEventDrop = async (info: any) => {
  const booking = info.event.extendedProps.booking;
  const newStart = info.event.start;
  const newEnd = info.event.end;
  const newResourceId = info.event.getResources()[0]?.id;

  try {
    await bookingApi.update(booking.id, {
      booking_date: format(newStart, "yyyy-MM-dd"),
      start_time: format(newStart, "HH:mm"),
      end_time: format(newEnd, "HH:mm"),
      resource_id: newResourceId === "unassigned" ? null : newResourceId,
    });

    addNotification({
      type: "success",
      title: "予約移動完了",
      message: `${booking.customer.name}様の予約を移動しました`,
    });
  } catch (error) {
    info.revert(); // エラー時は元に戻す
    addNotification({
      type: "error",
      title: "予約移動エラー",
      message: "予約の移動に失敗しました",
    });
  }
};
```

---

## API 仕様

### 認証エンドポイント

```typescript
POST / api / v1 / auth / login;
POST / api / v1 / auth / logout;
GET / api / v1 / auth / user;
```

### 予約管理エンドポイント

```typescript
GET / api / v1 / bookings; // 予約一覧
POST / api / v1 / bookings; // 予約作成
GET / api / v1 / bookings / { id }; // 予約詳細
PUT / api / v1 / bookings / { id }; // 予約更新
DELETE / api / v1 / bookings / { id }; // 予約削除
PATCH / api / v1 / bookings / { id } / status; // ステータス変更

GET / api / v1 / availability; // 空き時間取得
POST / api / v1 / hold - slots; // 仮押さえ作成
DELETE / api / v1 / hold - slots / { token }; // 仮押さえ削除
```

### API レスポンス形式

```typescript
// 成功レスポンス
interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  meta: {
    timestamp: string;
    version: string;
  };
}

// エラーレスポンス
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // バリデーションエラー
  };
  meta: {
    timestamp: string;
  };
}
```

---

## 今後の実装予定

### Phase 18: FullCalendar Timeline 実装

```typescript
Priority 1: Core Timeline機能
- resourceTimelinePlugin設定
- 時間軸・リソース軸設定
- 基本的なイベント表示
- 日本語対応・タイムゾーン設定

Priority 2: ドラッグ&ドロップ機能
- eventDrop: 時間・担当者変更
- eventResize: 開始・終了時間変更
- バリデーション・競合チェック
- エラーハンドリング

Priority 3: 美容室向けカスタマイズ
- 担当者情報表示
- 空き時間可視化
- 営業時間制御
- パフォーマンス最適化
```

### Phase 19-21: LIFF 実装

```typescript
LIFF App Development:
- LINE LIFF SDK統合
- 5ステップ予約フロー
- 顧客認証・プロファイル管理
- 予約履歴・管理機能
- LINE通知システム
```

---

**最終更新**: 2025-07-05 08:31:32  
**ドキュメントバージョン**: 2.0  
**システムバージョン**: Phase 17 完了、Phase 18 準備完了
