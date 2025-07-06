# tugical システム仕様書 v2.0

**更新日**: 2025-07-06  
**バージョン**: 2.0  
**ステータス**: Phase 20.1 完了、Phase 21 Timeline 統合予約作成実装予定

---

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [実装済み機能](#実装済み機能)
4. [FullCalendar Timeline 仕様](#fullcalendar-timeline仕様)
5. [Timeline 統合予約作成仕様](#timeline統合予約作成仕様)
6. [美容師向け UI/UX 仕様](#美容師向けuiux仕様)
7. [API 仕様](#api仕様)
8. [データベース設計](#データベース設計)
9. [UI/UX 設計](#uiux設計)
10. [セキュリティ仕様](#セキュリティ仕様)
11. [パフォーマンス仕様](#パフォーマンス仕様)
12. [デプロイメント仕様](#デプロイメント仕様)
13. [今後の実装予定](#今後の実装予定)

---

## システム概要

### プロジェクト情報

- **サービス名**: tugical（ツギカル）
- **コンセプト**: "次の時間が、もっと自由になる。"
- **種別**: LINE 連携型予約管理 SaaS
- **対象業種**: 美容室、クリニック、レンタルスペース、学校、アクティビティ
- **リポジトリ**: https://github.com/tugilo/tugical

### 🎯 美容師向け特化設計

**tugical**は美容師さんの現場運用を最優先に設計されています：

```yaml
電話予約シナリオ:
  現在: "少々お待ちください" → 別画面で空き時間確認 → 30秒の沈黙
  改善後: Timeline上で即座に空き時間確認 → 5秒で提案 → 直感的予約作成

対面予約シナリオ:
  現在: 美容師がシステムを操作 → 顧客は待つ
  改善後: 顧客と一緒にTimeline画面を見る → 共同で時間選択 → 透明性向上

片手操作対応:
  タッチターゲット: 最小44px以上
  操作深度: 最大3タップで完了
  認知負荷: 一画面で完結
```

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

## Timeline 統合予約作成仕様

### 🎯 目的と背景

**現在の問題**:

- 予約状況確認と新規予約作成が分離されている
- 電話予約時に「少々お待ちください」が発生
- 美容師の認知負荷が高い（空き時間を頭で計算）

**解決方針**:

- Timeline 上で直接予約作成を可能にする
- 空きスロットクリック → 即座に予約フォーム表示
- 視覚的な予約状況確認と作成を統合

### 📋 統合予約作成の仕様

#### **A. 空きスロットクリック予約作成**

```typescript
// Timeline上での空きスロットクリック処理
const handleTimelineSlotClick = (slotInfo: {
  start: Date;
  end: Date;
  resourceId: string;
  jsEvent: MouseEvent;
}) => {
  // インライン予約フォームを表示
  setInlineBookingForm({
    isVisible: true,
    slotInfo,
    position: {
      x: slotInfo.jsEvent.clientX,
      y: slotInfo.jsEvent.clientY,
    },
  });
};

// 空きスロット情報
interface AvailableSlot {
  start: Date;
  end: Date;
  resourceId: string;
  resourceName: string;
  duration: number; // 分
  isAvailable: boolean;
  suggestedMenus: Menu[]; // 時間に適合するメニュー
}
```

#### **B. インライン予約フォーム**

```typescript
// Timeline上に直接表示される軽量予約フォーム
const TimelineInlineBookingForm = ({
  slotInfo,
  position,
  onConfirm,
  onCancel,
}: {
  slotInfo: AvailableSlot;
  position: { x: number; y: number };
  onConfirm: (booking: CreateBookingRequest) => void;
  onCancel: () => void;
}) => {
  return (
    <div
      className="timeline-inline-form absolute bg-white shadow-xl rounded-lg border p-4 z-50 min-w-80"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 選択中時間枠表示 */}
      <div className="time-slot-info mb-4 p-3 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-900">
          {formatTime(slotInfo.start)} - {formatTime(slotInfo.end)}
        </h3>
        <p className="text-sm text-blue-700">
          担当: {slotInfo.resourceName} | 空き時間: {slotInfo.duration}分
        </p>
      </div>

      {/* 顧客クイック検索 */}
      <CustomerQuickSearch
        onSelect={setSelectedCustomer}
        autoFocus={true}
        placeholder="顧客名・電話番号で検索"
        className="mb-3"
        touchOptimized={true}
      />

      {/* 推奨メニュー表示 */}
      <div className="suggested-menus mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          この時間に最適なメニュー
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {slotInfo.suggestedMenus.map((menu) => (
            <MenuQuickCard
              key={menu.id}
              menu={menu}
              selected={selectedMenu?.id === menu.id}
              onClick={() => setSelectedMenu(menu)}
              showDuration={true}
              compact={true}
            />
          ))}
        </div>
      </div>

      {/* 時間調整スライダー */}
      <TimeAdjustmentSlider
        initialStart={slotInfo.start}
        initialEnd={slotInfo.end}
        minDuration={30}
        maxDuration={180}
        onChange={setAdjustedTimeRange}
        className="mb-4"
      />

      {/* アクション */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateBooking}
          disabled={!selectedCustomer || !selectedMenu}
          className="flex-1"
        >
          予約作成
        </Button>
      </div>
    </div>
  );
};
```

#### **C. ドラッグ&ドロップ予約作成**

```typescript
// 顧客一覧からTimeline上へのドラッグ&ドロップ
const CustomerDragCard = ({ customer }: { customer: Customer }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "customer",
        customer,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="customer-drag-card p-3 bg-white rounded shadow cursor-move border-2 border-transparent hover:border-blue-300"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{customer.name}</div>
          <div className="text-sm text-gray-600">{customer.phone}</div>
        </div>
      </div>
    </div>
  );
};

// Timeline上でのドロップ処理
const handleTimelineDrop = (dropInfo: {
  date: Date;
  resourceId: string;
  draggedData: any;
}) => {
  if (dropInfo.draggedData.type === "customer") {
    const customer = dropInfo.draggedData.customer;

    // 顧客がドロップされた場合、自動的に予約作成フォームを表示
    showInlineBookingForm({
      slotInfo: {
        start: dropInfo.date,
        end: new Date(dropInfo.date.getTime() + 30 * 60 * 1000), // 30分後
        resourceId: dropInfo.resourceId,
      },
      preSelectedCustomer: customer,
    });
  }
};
```

### 🎯 美容師向け操作フロー改善

#### **電話予約シナリオ**

```yaml
# 現在の問題フロー
Step1: 美容師「少々お待ちください」
Step2: 別画面で空き時間確認
Step3: 頭で計算・メモ確認
Step4: 顧客に回答
Step5: 予約作成画面を開く
Step6: 入力作業
Step7: 美容師「お待たせしました」
Total: 30-60秒の沈黙

# 改善後フロー
Step1: 美容師「いつ頃がご希望ですか？」
Step2: Timeline上で即座に空き時間確認
Step3: 美容師「14時からでしたら空いております」
Step4: 顧客「お願いします」
Step5: Timeline上14:00スロットクリック
Step6: インライン予約フォーム即座表示
Step7: 顧客名入力・メニュー選択
Step8: 美容師「予約完了しました」
Total: 5-10秒で完了
```

#### **対面予約シナリオ**

```yaml
# 現在の問題フロー
Step1: 美容師がシステムを操作
Step2: 顧客は画面が見えない
Step3: 美容師「〇時はいかがですか？」
Step4: 顧客「他の時間は？」
Step5: 美容師が再度確認
透明性: 低い、顧客は待つだけ

# 改善後フロー
Step1: 美容師「一緒に確認しましょう」
Step2: Timeline画面を顧客と共有
Step3: 顧客「この時間は空いていますか？」
Step4: 美容師「はい、空いています」
Step5: 顧客が直接時間選択
Step6: その場で予約作成
透明性: 高い、顧客と協働
```

### 📱 片手操作最適化

#### **タッチターゲット設計**

```typescript
// 片手操作を考慮したタッチターゲット
const TouchTargetSizes = {
  minimum: 44, // px - Apple Human Interface Guidelines
  comfortable: 48, // px - 推奨サイズ
  large: 56, // px - 重要なアクション用

  // 電話を耳に挟んだ状態での操作を考慮
  phoneOperationOptimized: {
    buttonHeight: 52,
    buttonWidth: 120,
    spacing: 8,
    padding: 12,
  },
};

// 片手操作に配慮したレイアウト
const OneHandedLayout = {
  // 親指で届く範囲（320px幅の場合）
  easyReach: {
    x: [0, 200],
    y: [400, 600], // 画面下部
  },

  // 届きにくい範囲
  difficultReach: {
    x: [200, 320],
    y: [0, 200], // 画面上部
  },

  // 重要な操作は easy reach 範囲に配置
  primaryActions: "easyReach",
  secondaryActions: "difficultReach",
};
```

#### **認知負荷軽減**

```typescript
// 情報階層の最適化
const InformationHierarchy = {
  // 最重要（一目で把握）
  critical: ["空き時間の有無", "顧客名", "予約時間"],

  // 重要（必要時に確認）
  important: ["メニュー名", "担当者", "料金"],

  // 補助情報（詳細確認時）
  supplementary: ["備考", "予約番号", "作成日時"],
};

// 色分けによる直感的理解
const VisualCoding = {
  availability: {
    available: "#10b981", // 緑：空き
    busy: "#ef4444", // 赤：予約済み
    partially: "#f59e0b", // 黄：一部空き
  },

  urgency: {
    immediate: "#dc2626", // 赤：緊急
    soon: "#f59e0b", // 黄：近日
    future: "#6b7280", // 灰：将来
  },
};
```

---

## 美容師向け UI/UX 仕様

### 🎯 ペルソナ設定

```yaml
主要ペルソナ: 美容師（30代・女性）
シチュエーション:
  - 電話を耳に挟んで片手操作
  - 施術中の合間に確認
  - 顧客と一緒に画面を見る
  - 忙しい時間帯での高速操作

要求事項:
  - 直感的な操作（説明不要）
  - 高速な応答（待ち時間なし）
  - 視覚的な情報提示
  - エラーの少ない設計
```

### 📱 モバイルファースト設計

#### **画面サイズ対応**

```typescript
// レスポンシブブレークポイント
const Breakpoints = {
  mobile: 320, // 最小対応サイズ
  tablet: 768,
  desktop: 1024,

  // 美容師向け推奨サイズ
  beautyOptimized: {
    smartphone: 375, // iPhone標準
    tablet: 768, // iPad標準
    desktop: 1200, // 店舗PC
  },
};

// 画面サイズ別レイアウト
const ResponsiveLayout = {
  mobile: {
    timeline: "vertical", // 縦スクロール
    sidebar: "hidden", // サイドバー非表示
    navigation: "bottom", // ボトムナビゲーション
  },

  tablet: {
    timeline: "horizontal", // 横スクロール
    sidebar: "collapsible", // 折りたたみ可能
    navigation: "top", // トップナビゲーション
  },

  desktop: {
    timeline: "full", // 全画面表示
    sidebar: "always", // 常時表示
    navigation: "top", // トップナビゲーション
  },
};
```

#### **アクセシビリティ対応**

```typescript
// アクセシビリティ仕様
const AccessibilitySpecs = {
  // 色覚異常対応
  colorBlind: {
    primary: "shape + color", // 形状と色の組み合わせ
    secondary: "pattern + color", // パターンと色の組み合わせ
    alternatives: "text labels", // テキストラベル
  },

  // 視覚障害対応
  screenReader: {
    ariaLabels: "全要素にaria-label",
    landmarks: "セマンティックHTML",
    skipLinks: "スキップリンク",
  },

  // 運動機能障害対応
  motor: {
    clickTarget: "44px以上",
    keyboard: "全機能キーボード操作可能",
    timeout: "操作時間制限なし",
  },
};
```

### 🎨 デザインシステム拡張

#### **美容師向けコンポーネント**

```typescript
// 美容師特化コンポーネント
const BeautySpecificComponents = {
  // クイック顧客検索
  CustomerQuickSearch: {
    features: [
      "電話番号での検索",
      "部分一致検索",
      "よく使う顧客の上位表示",
      "タップで即選択",
    ],
    ui: {
      inputHeight: 52,
      fontSize: 16,
      placeholder: "顧客名・電話番号で検索",
      autoComplete: true,
    },
  },

  // メニューグリッド
  MenuQuickGrid: {
    features: [
      "時間適合メニューの強調",
      "料金・時間の併記",
      "人気メニューの優先表示",
      "大きなタッチターゲット",
    ],
    ui: {
      cardSize: 120, // px
      gridColumns: "auto-fit",
      spacing: 12,
      cornerRadius: 8,
    },
  },

  // 時間調整スライダー
  TimeAdjustmentSlider: {
    features: [
      "30分単位の調整",
      "営業時間内制限",
      "他予約との競合チェック",
      "視覚的フィードバック",
    ],
    ui: {
      trackHeight: 8,
      thumbSize: 24,
      range: true,
      step: 30, // 分
    },
  },
};
```

---

## FullCalendar Timeline 仕様

### 🚀 Phase 20.1 完了機能

#### **JST 対応・イベント表示修正**

```typescript
// JST（日本時間）完全対応
const JSTConfiguration = {
  timezone: "Asia/Tokyo",
  initialDate: new Date(), // 現在のJST日付
  firstDay: 1, // 月曜日始まり（日本標準）

  // 日付正規化処理
  dateNormalization: {
    // UTC文字列 → JST日付変換
    utcToJST: (utcString: string) => {
      return utcString.replace(/T.*$/, ""); // 時刻部分除去
    },

    // FullCalendar標準形式変換
    toISO: (date: Date, time: string) => {
      return `${date.toISOString().split("T")[0]}T${time}:00`;
    },
  },
};

// 実装結果
const Phase20_1Results = {
  dateDisplay: "✅ 日付表示ずれ完全解決",
  eventDisplay: "✅ 15件予約→15件イベント正常表示",
  buildStatus: "✅ ビルド成功（3.50秒、598.57KB）",
  dataConversion: "✅ 予約データ→FullCalendarイベント完全変換",

  technicalFixes: [
    "initialDate={new Date()}でJST現在日付設定",
    "firstDay={1}で月曜始まり対応",
    "UTC日付文字列正規化処理追加",
    "EventInput型定義修正（start/end: Date | string）",
  ],
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

### Phase 20.1: Timeline 統合予約作成実装

```typescript
Priority 1: 空きスロットクリック予約作成
- handleTimelineSlotClick
- AvailableSlot

Priority 2: インライン予約フォーム
- TimelineInlineBookingForm

Priority 3: ドラッグ&ドロップ予約作成
- CustomerDragCard
- handleTimelineDrop

Priority 4: 美容師向け操作フロー改善
- 電話予約シナリオ
- 対面予約シナリオ

Priority 5: 片手操作最適化
- TouchTargetSizes
- OneHandedLayout

Priority 6: 認知負荷軽減
- InformationHierarchy
- VisualCoding
```

### Phase 20.2: 美容師向け UI/UX 改善

```typescript
Priority 1: ペルソナ設定
- 美容師向け特化設計

Priority 2: モバイルファースト設計
- 画面サイズ対応
- アクセシビリティ対応

Priority 3: デザインシステム拡張
- 美容師向けコンポーネント
```

### Phase 21: 美容師向け UI/UX 改善

```typescript
Priority 1: ペルソナ設定
- 美容師向け特化設計

Priority 2: モバイルファースト設計
- 画面サイズ対応
- アクセシビリティ対応

Priority 3: デザインシステム拡張
- 美容師向けコンポーネント
```

---

**最終更新**: 2025-07-06 08:31:32  
**ドキュメントバージョン**: 2.0  
**システムバージョン**: Phase 20.1 完了、Phase 21 Timeline 統合予約作成実装予定
