# tugical システム仕様書 v2.3

**作成日**: 2025-10-22 16:31  
**更新日**: 2025-01-07  
**バージョン**: 2.3  
**ステータス**: 統合完了（単一Laravelアプリケーション）

**更新履歴**:

- v2.3 (2025-01-07): **統合完了** - frontend + backend + liff → 単一Laravelアプリケーション、統合ビルドシステム、統合Docker構成
- v2.2 (2025-01-06): **複数メニュー組み合わせ対応・電話予約ワークフロー最適化** - booking_details テーブル設計、電話予約 UI/UX 設計、業種別最適化
- v2.1 (2025-07-06): 5 分刻み時間スロット設定システム実装

---

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [複数メニュー組み合わせシステム](#複数メニュー組み合わせシステム) **v2.2 新規**
4. [電話予約ワークフロー最適化](#電話予約ワークフロー最適化) **v2.2 新規**
5. [業種別 UI 最適化設計](#業種別ui最適化設計) **v2.2 新規**
6. [実装済み機能](#実装済み機能)
7. [FullCalendar Timeline 仕様](#fullcalendar-timeline仕様)
8. [Timeline 統合予約作成仕様](#timeline統合予約作成仕様)
9. [汎用時間スロット設定システム](#汎用時間スロット設定システム)
10. [汎用リソース予約 UI/UX 仕様](#汎用リソース予約uiux仕様)
11. [API 仕様](#api仕様)
12. [データベース設計](#データベース設計)
13. [UI/UX 設計](#uiux設計)
14. [セキュリティ仕様](#セキュリティ仕様)
15. [パフォーマンス仕様](#パフォーマンス仕様)
16. [デプロイメント仕様](#デプロイメント仕様)
17. [今後の実装予定](#今後の実装予定)

---

## システム概要

### プロジェクト情報

- **サービス名**: tugical（ツギカル）
- **公式コンセプト**: 時間貸しリソース予約システム
- **統一概念**: 予約 = リソース × 時間枠 × メニュー（複数組み合わせ対応）
- **スローガン**: "次の時間が、もっと自由になる。"
- **種別**: LINE 連携型予約管理 SaaS
- **対応業種**: 汎用プラットフォーム（5 分〜480 分の任意の時間ベース予約業務）
- **リポジトリ**: https://github.com/tugilo/tugical

### 🎯 汎用時間貸しリソース予約プラットフォーム

**tugical**は時間ベースのリソース予約が必要な全ての業種に対応する汎用プラットフォームです：

```yaml
適用業種（例）:
  医療系:
    - 予防接種: 5-10分スロット
    - 診察: 10-30分スロット
    - 検査: 30-120分スロット
    - リハビリ: 30-60分スロット

  美容・健康系:
    - 美容院: 30-120分スロット
    - ネイルサロン: 60-180分スロット
    - 整体・マッサージ: 30-90分スロット
    - エステ: 60-120分スロット

  施設・設備系:
    - 会議室: 30-480分スロット
    - レンタルスペース: 60-1440分スロット
    - スタジオ: 60-240分スロット
    - 車両レンタル: 60-1440分スロット

  教育・研修系:
    - 個別指導: 30-90分スロット
    - セミナー: 60-480分スロット
    - ワークショップ: 120-480分スロット
    - 資格講座: 240-480分スロット

  アクティビティ系:
    - 体験教室: 60-180分スロット
    - アウトドア: 120-480分スロット
    - フィットネス: 30-90分スロット
    - スポーツ: 60-240分スロット
```

### 電話予約シナリオ改善例

```yaml
従来の課題:
  現在: "少々お待ちください" → 別画面で空き時間確認 → 30秒の沈黙
  改善後: Timeline上で即座に空き時間確認 → 5秒で提案 → 直感的予約作成

対面予約シナリオ:
  現在: 担当者がシステムを操作 → 顧客は待つ
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

### 統合システム構成図 (v2.3)

```
┌─────────────────────────────────────────────────────────────┐
│                tugical 統合Laravelアプリケーション            │
├─────────────────────────────────────────────────────────────┤
│  Laravel Backend (統合アプリケーション)                      │
│  ├── resources/js/ (統合フロントエンド)                     │
│  │   ├── components/                                        │
│  │   │   ├── admin/ (管理者機能)                            │
│  │   │   │   ├── 予約管理 (FullCalendar Timeline)          │
│  │   │   │   ├── 顧客管理 (検索・フィルタリング)            │
│  │   │   │   ├── メニュー管理 (CRUD操作)                    │
│  │   │   │   ├── リソース管理 (汎用リソース・設備)          │
│  │   │   │   └── 設定管理 (業種・通知設定)                  │
│  │   │   └── liff/ (LIFF機能)                              │
│  │   │       ├── 予約フロー (5ステップ)                     │
│  │   │       ├── メニュー選択                               │
│  │   │       └── 時間スロット選択                           │
│  │   ├── pages/                                            │
│  │   │   ├── admin/ (管理者画面)                           │
│  │   │   └── liff/ (LIFF画面)                              │
│  │   ├── stores/ (状態管理)                                │
│  │   ├── services/ (API)                                    │
│  │   └── utils/ (ユーティリティ)                           │
│  ├── app/ (Laravel Backend)                               │
│  │   ├── 認証・認可 (Sanctum)                              │
│  │   ├── マルチテナント (店舗分離)                          │
│  │   ├── 予約管理 (競合チェック・仮押さえ)                  │
│  │   ├── 柔軟時間スロット設定 (5分〜480分)                  │
│  │   ├── 通知システム (LINE API)                           │
│  │   └── 業種テンプレート                                   │
│  ├── docs/ (統合ドキュメント)                              │
│  │   ├── 仕様書・設計書                                     │
│  │   ├── API仕様                                           │
│  │   └── 進捗管理                                          │
│  └── package.json (統合依存関係)                           │
├─────────────────────────────────────────────────────────────┤
│  Database (MariaDB)                                        │
│  ├── 店舗・テナント管理                                     │
│  ├── 予約・顧客データ                                       │
│  ├── メニュー・リソース                                     │
│  ├── 時間スロット設定 (JSON構造)                           │
│  └── 通知・設定データ                                       │
├─────────────────────────────────────────────────────────────┤
│  External Services                                         │
│  ├── LINE Messaging API                                   │
│  ├── LINE LIFF                                            │
│  └── Redis (キャッシュ・セッション)                        │
└─────────────────────────────────────────────────────────────┘
```

### 統合アーキテクチャの特徴

#### **1. 単一Laravelアプリケーション**
- **統合フロントエンド**: React + TypeScript + Vite
- **統合ビルド**: 単一Viteビルドで管理者・LIFF両対応
- **統合依存関係**: 単一package.json管理
- **統合ルーティング**: Laravel web routes + React Router

#### **2. 統合開発環境**
- **単一リポジトリ**: コード管理の簡素化
- **統合ビルド**: `npm run build` で全体ビルド
- **統合テスト**: 単一テストスイート
- **統合デプロイ**: 単一コンテナ運用

#### **3. 統合運用**
- **単一Dockerコンテナ**: 管理・監視の簡素化
- **統合ログ**: デバッグ・監視の効率化
- **リソース最適化**: メモリ・CPU使用量削減
- **スケーラビリティ**: 単一アプリケーションの水平スケール

### 汎用リソース概念

```typescript
// 汎用リソース定義
interface UniversalResource {
  id: number;
  store_id: number;
  type: "staff" | "room" | "equipment" | "vehicle" | "facility";
  name: string;
  display_name: string; // 業種別表示名

  // 汎用属性
  capacity: number; // 収容・対応人数
  efficiency_rate: number; // 作業効率率 (0.5-2.0)
  hourly_rate_diff: number; // 指名・設備差額

  // 柔軟な属性設定
  attributes: {
    specialties?: string[]; // 専門分野
    certifications?: string[]; // 資格・認定
    equipment_specs?: object; // 設備仕様
    restrictions?: {
      // 制約条件
      age?: { min: number; max: number };
      gender?: "male" | "female" | "none";
      medical_conditions?: string[];
    };
  };

  // 稼働設定
  working_hours: {
    [dayOfWeek: string]: {
      start: string;
      end: string;
      break_start?: string;
      break_end?: string;
    };
  };
}

// 業種別表示名例
const industryDisplayNames = {
  medical: {
    staff: "医師・看護師",
    room: "診察室",
    equipment: "医療機器",
  },
  beauty: {
    staff: "スタッフ",
    room: "個室",
    equipment: "設備",
  },
  rental: {
    staff: "管理者",
    room: "部屋",
    equipment: "備品",
  },
  education: {
    staff: "講師",
    room: "教室",
    equipment: "教材",
  },
};
```

---

## 汎用時間スロット設定システム

### Phase 21.3 実装済み機能

#### データベース設計

```sql
-- stores テーブルに追加済み
ALTER TABLE stores ADD COLUMN time_slot_settings JSON DEFAULT NULL;

-- time_slot_settings JSON 構造
{
  "slot_duration_minutes": 30,
  "available_durations": [5, 10, 15, 30, 60, 120, 240, 480],
  "business_hours": {
    "monday": {"start": "09:00", "end": "18:00"},
    "tuesday": {"start": "09:00", "end": "18:00"},
    "wednesday": {"start": "09:00", "end": "18:00"},
    "thursday": {"start": "09:00", "end": "18:00"},
    "friday": {"start": "09:00", "end": "18:00"},
    "saturday": {"start": "09:00", "end": "17:00"},
    "sunday": {"closed": true}
  },
  "break_times": [
    {"start": "12:00", "end": "13:00", "label": "昼休み"}
  ],
  "timezone": "Asia/Tokyo"
}
```

#### Store モデル機能

```php
// 実装済みメソッド
class Store extends Model
{
    // 時間スロット設定の取得（デフォルト値補完）
    public function getTimeSlotSettings(): array

    // 時間スロット設定の更新（バリデーション付き）
    public function updateTimeSlotSettings(array $settings): bool

    // 業種別初期設定
    public function initializeTimeSlotSettingsForIndustry(string $industry): array

    // 現在のスロット間隔取得
    public function getSlotDurationMinutes(): int

    // 選択可能なスロット間隔一覧
    public function getAvailableSlotDurations(): array
}
```

#### API エンドポイント

```php
// 実装済みエンドポイント
GET    /api/v1/store/time-slot-settings  // 設定取得
PUT    /api/v1/store/time-slot-settings  // 設定更新

// StoreController メソッド
public function getTimeSlotSettings(): JsonResponse
public function updateTimeSlotSettings(Request $request): JsonResponse
```

#### フロントエンド統合

```typescript
// 実装済み機能
interface TimeSlotSettings {
  slot_duration_minutes: number;
  available_durations: number[];
  business_hours: Record<string, BusinessHours>;
  break_times: BreakTime[];
  timezone: string;
}

// API クライアント
class StoreApi {
  async getTimeSlotSettings(): Promise<TimeSlotSettings>;
  async updateTimeSlotSettings(settings: TimeSlotSettings): Promise<void>;
}

// FullCalendar 動的設定
function getFullCalendarConfig(
  timeSlotSettings: TimeSlotSettings
): CalendarOptions {
  return {
    slotDuration: `${timeSlotSettings.slot_duration_minutes}:00`,
    slotLabelInterval: `${timeSlotSettings.slot_duration_minutes}:00`,
    businessHours: convertBusinessHours(timeSlotSettings.business_hours),
    // ... その他の設定
  };
}
```

### 業種別推奨時間スロット

```yaml
医療系:
  予防接種: 5-10分
  診察: 10-30分
  検査: 30-120分
  手術: 60-480分

美容・健康系:
  カット: 30-60分
  カラー: 60-120分
  パーマ: 90-180分
  エステ: 60-120分

施設・設備系:
  会議室: 30-240分
  レンタルスペース: 60-480分
  スタジオ: 60-240分

教育・研修系:
  個別指導: 30-90分
  セミナー: 60-240分
  ワークショップ: 120-480分
  資格講座: 240-480分
```

---

## 複数メニュー組み合わせシステム **v2.2 新機能**

### 問題解決

#### 従来の組み合わせ爆発問題

```yaml
課題:
  美容院の例: カット・カラー・パーマの3つのメニュー
  従来方式: 7つの個別メニューが必要
    - カット単体
    - カラー単体
    - パーマ単体
    - カット+カラー
    - カット+パーマ
    - カラー+パーマ
    - カット+カラー+パーマ

解決策:
  新方式: 3つの基本メニュー + 組み合わせルール
    - 任意の組み合わせが可能
    - セット割引の自動適用
    - 自動追加サービス対応
```

### システム設計

#### データベース構造

```sql
-- 予約ヘッダー (bookings)
{
  "id": 123,
  "booking_type": "combination",
  "total_price": 9500,
  "set_discount_amount": 500,
  "auto_added_services": ["シャンプー", "ブロー"]
}

-- 予約明細 (booking_details)
[
  {
    "booking_id": 123,
    "menu_id": 1,
    "sequence_order": 1,
    "service_name": "カット",
    "start_time_offset": 0,
    "end_time_offset": 60
  },
  {
    "booking_id": 123,
    "menu_id": 2,
    "sequence_order": 2,
    "service_name": "カラー",
    "start_time_offset": 60,
    "end_time_offset": 150
  }
]
```

#### 業種別適用例

```yaml
美容院:
  基本メニュー: カット, カラー, パーマ, トリートメント
  自動追加: シャンプー(カラー時必須), ブロー(仕上げ)
  セット割引: カット+カラー(-500円), カット+パーマ(-300円)

クリニック:
  基本メニュー: 診察, 検査, 処置, 注射
  自動追加: 問診(初回必須), 経過観察(処置後)
  時間調整: 検査結果待ち時間の自動考慮

レンタルスペース:
  基本メニュー: 会議室, プロジェクター, ケータリング
  自動追加: 基本清掃, セットアップ時間
  時間割引: 長時間利用(4時間以上20%オフ)

教室・スクール:
  基本メニュー: 英語, 数学, 理科, プログラミング
  自動追加: 宿題チェック, 進度確認
  パッケージ: 受験対策セット(複数科目組み合わせ)
```

### 料金・時間計算システム

#### 自動計算ロジック

```typescript
interface BookingCalculation {
  // 基本料金の積み上げ
  base_total_price: number;

  // オプション料金の合計
  option_total_price: number;

  // セット割引の適用
  set_discount_amount: number;

  // 最終料金
  total_price: number;

  // 時間計算
  total_duration: number;
  estimated_end_time: string;

  // 自動追加サービス
  auto_added_services: AutoAddedService[];
}

interface AutoAddedService {
  service_name: string;
  reason: string; // "カラー施術必須", "仕上げ作業"
  duration: number;
  price: number;
}
```

#### 組み合わせルール設定

```json
{
  "combination_rules": {
    "discounts": [
      {
        "condition": ["カット", "カラー"],
        "type": "fixed",
        "amount": 500,
        "name": "カット+カラーセット"
      },
      {
        "condition": ["会議室4時間以上"],
        "type": "percentage",
        "amount": 20,
        "name": "長時間利用割引"
      }
    ],
    "auto_additions": [
      {
        "trigger": "カラー",
        "add_service": "シャンプー",
        "reason": "カラー施術時必須",
        "position": "after"
      },
      {
        "trigger": "診察",
        "add_service": "問診",
        "reason": "初回診察時必須",
        "position": "before",
        "condition": "first_visit"
      }
    ]
  }
}
```

---

## 電話予約ワークフロー最適化 **v2.2 新機能**

### 現実的ユースケース

#### 美容院での電話予約シナリオ

```yaml
シチュエーション:
  美容師: 片手で電話、もう片方でタブレット操作
  顧客: "カットとカラーお願いします。今日か明日で空いてる時間ありますか？"

従来の問題: 1. "少々お待ちください" → 30秒の沈黙
  2. 別画面で空き時間確認
  3. 料金計算を別途実施
  4. 予約作成で複数回タップ

改善後のフロー:
  1. メニュー選択: カット+カラー (リアルタイム料金表示)
  2. 空き時間確認: Timeline で即座に確認
  3. 代替案提示: "明日14時からいかがですか？"
  4. ワンタップ予約作成: 5秒で完了
```

### Timeline 統合予約作成

#### 空きスロットクリック機能

```typescript
interface AvailableSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  resource_id: number;
  is_available: boolean;
}

// Timeline上の空きスロットクリック
function handleTimelineSlotClick(slot: AvailableSlot) {
  // 1. 選択されたメニューの所要時間をチェック
  const totalDuration = calculateCombinationDuration(selectedMenus);

  // 2. スロットに収まるかを確認
  if (slot.duration_minutes >= totalDuration) {
    // 3. インライン予約フォームを表示
    showInlineBookingForm(slot);
  } else {
    // 4. 代替時間を提案
    suggestAlternativeSlots(totalDuration);
  }
}
```

#### 複数日程対応

```typescript
// 電話予約最適化API
interface PhoneAvailabilityRequest {
  resource_id: number;
  duration: number; // 組み合わせ後の総時間
  date_from: string;
  date_to: string;
}

interface PhoneAvailabilityResponse {
  availability: {
    [date: string]: {
      date_label: string; // "今日", "明日", "1月8日(月)"
      available_slots: AvailableSlot[];
      slots_count: number;
    };
  };
  summary: {
    total_available_days: number;
    total_available_slots: number;
    earliest_available: string;
  };
}
```

### 片手操作最適化

#### タッチターゲット設計

```css
/* 最小タッチサイズ: 44px */
.phone-booking-button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* 大きな選択エリア */
.menu-selection-card {
  height: 80px;
  touch-action: manipulation;
}

/* 片手操作を考慮した配置 */
.phone-ui-layout {
  /* 右手操作想定: 右下エリアに重要ボタン */
  .primary-actions {
    position: fixed;
    bottom: 20px;
    right: 20px;
  }

  /* 左手操作対応: 左下エリアにも配置 */
  .secondary-actions {
    position: fixed;
    bottom: 20px;
    left: 20px;
  }
}
```

#### 認知負荷軽減

```typescript
// ステップ表示の簡略化
interface PhoneBookingStep {
  step: number;
  title: string;
  is_current: boolean;
  is_completed: boolean;
}

const phoneBookingSteps: PhoneBookingStep[] = [
  { step: 1, title: "顧客", is_current: true, is_completed: false },
  { step: 2, title: "メニュー", is_current: false, is_completed: false },
  { step: 3, title: "時間", is_current: false, is_completed: false },
];

// 1画面完結の設計
interface PhoneBookingForm {
  customer_search: CustomerQuickSearch;
  menu_selection: MultiMenuSelector;
  time_selection: TimelineSlotPicker;
  price_display: RealTimePriceCalculator;
  quick_actions: QuickActionButtons;
}
```

---

## 業種別 UI 最適化設計 **v2.2 新機能**

### 適応的 UI 設計

#### 業種別表示名マッピング

```typescript
interface IndustryDisplayNames {
  resource: string;
  customer: string;
  booking: string;
  menu: string;
}

const industryDisplayNames: Record<string, IndustryDisplayNames> = {
  beauty: {
    resource: "スタッフ",
    customer: "お客様",
    booking: "ご予約",
    menu: "メニュー",
  },
  clinic: {
    resource: "先生",
    customer: "患者様",
    booking: "診療予約",
    menu: "診療内容",
  },
  rental: {
    resource: "部屋・設備",
    customer: "ご利用者様",
    booking: "利用予約",
    menu: "利用プラン",
  },
  school: {
    resource: "講師",
    customer: "生徒様",
    booking: "授業予約",
    menu: "コース",
  },
  activity: {
    resource: "ガイド・インストラクター",
    customer: "参加者様",
    booking: "体験予約",
    menu: "体験プログラム",
  },
};
```

#### 業種別ワークフロー

```typescript
// 美容院: 指名重視・仕上がり重視
interface BeautyWorkflow {
  customer_priority: "loyalty_rank" | "appointment_frequency";
  resource_selection: "preference_based"; // お気に入りスタッフ
  menu_combination: "style_focused"; // 仕上がり重視
  time_flexibility: "moderate"; // ある程度融通
}

// クリニック: 症状重視・効率重視
interface ClinicWorkflow {
  customer_priority: "medical_urgency";
  resource_selection: "specialist_match"; // 専門医マッチング
  menu_combination: "symptom_based"; // 症状ベース
  time_flexibility: "high"; // 緊急時対応
}

// レンタルスペース: 設備重視・コスト重視
interface RentalWorkflow {
  customer_priority: "usage_frequency";
  resource_selection: "equipment_based"; // 設備重視
  menu_combination: "package_optimized"; // パッケージ最適化
  time_flexibility: "high"; // 長時間対応
}
```

### レスポンシブ業種 UI

#### 業種別カラーテーマ

```css
/* 美容・健康系: 温かみのあるカラー */
.industry-beauty {
  --primary-color: #e91e63; /* ピンク */
  --secondary-color: #f8bbd9;
  --accent-color: #ad1457;
}

/* 医療系: 信頼性のあるブルー */
.industry-clinic {
  --primary-color: #1976d2; /* ブルー */
  --secondary-color: #bbdefb;
  --accent-color: #0d47a1;
}

/* 施設系: プロフェッショナルなグレー */
.industry-rental {
  --primary-color: #424242; /* グレー */
  --secondary-color: #e0e0e0;
  --accent-color: #212121;
}

/* 教育系: 成長をイメージしたグリーン */
.industry-school {
  --primary-color: #388e3c; /* グリーン */
  --secondary-color: #c8e6c9;
  --accent-color: #1b5e20;
}

/* アクティビティ系: エネルギッシュなオレンジ */
.industry-activity {
  --primary-color: #f57c00; /* オレンジ */
  --secondary-color: #ffe0b2;
  --accent-color: #e65100;
}
```

#### 業種別アイコンセット

```typescript
const industryIcons = {
  beauty: {
    resource: "👩‍💼", // スタッフ
    menu: "✂️", // メニュー
    booking: "📅", // 予約
    customer: "💅", // 顧客
  },
  clinic: {
    resource: "👨‍⚕️", // 医師
    menu: "🩺", // 診療
    booking: "📋", // 診療予約
    customer: "🏥", // 患者
  },
  rental: {
    resource: "🏢", // 施設
    menu: "📊", // プラン
    booking: "🔑", // 利用予約
    customer: "🏬", // 利用者
  },
  school: {
    resource: "👨‍🏫", // 講師
    menu: "📚", // コース
    booking: "🎓", // 授業予約
    customer: "👨‍🎓", // 生徒
  },
  activity: {
    resource: "🏃‍♂️", // インストラクター
    menu: "🎯", // プログラム
    booking: "🏕️", // 体験予約
    customer: "👥", // 参加者
  },
};
```

### 複雑さの適切な分離

#### バックエンド複雑性（高機能）

```typescript
// 柔軟で高機能なビジネスロジック
class BookingService {
  // 複雑な組み合わせ計算
  calculateComplexCombination(
    menus: Menu[],
    options: MenuOption[],
    discountRules: DiscountRule[],
    autoAddRules: AutoAddRule[]
  ): BookingCalculation;

  // 高度な空き時間計算
  findOptimalAvailability(
    duration: number,
    resourcePreferences: ResourcePreference[],
    timeConstraints: TimeConstraint[],
    businessRules: BusinessRule[]
  ): AvailabilityOption[];
}
```

#### フロントエンド簡潔性（シンプル）

```typescript
// シンプルで直感的なUI
interface SimpleBookingForm {
  // 顧客: 検索ボックス1つ
  customer_search: string;

  // メニュー: チェックボックス選択
  selected_menus: number[];

  // 時間: Timeline上でクリック
  selected_slot: AvailableSlot;

  // 自動計算結果表示（編集不可）
  readonly calculated_price: number;
  readonly calculated_duration: number;
}

// ユーザーは複雑性を意識せずに操作
function handleSimpleBooking(form: SimpleBookingForm) {
  // バックエンドで複雑な計算を実行
  const calculation = await bookingApi.calculate(form);

  // 結果をシンプルに表示
  displayBookingPreview(calculation);
}
```

---

## 実装済み機能

### ✅ Phase 1-21.3: 基盤〜柔軟時間スロット設定完了

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
- Timeline表示 (FullCalendar統合)
- 時間選択UI (空き時間可視化)
- 空きスロットクリック予約作成
- リアルタイム空き時間表示
- 表示モード切り替え (リスト/タイムライン)
- フィルタリング (日付・ステータス・リソース)
- 検索機能
- ページネーション
- 柔軟時間スロット設定 (5分〜480分)

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
```

#### **時間スロット設定システム**

```typescript
// Phase 21.3 実装済み機能
- 5分〜480分の柔軟なスロット設定
- 業種別推奨設定
- リアルタイム FullCalendar 反映
- 営業時間・休憩時間設定
- タイムゾーン対応
- 設定取得・更新 API
- フロントエンド統合
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

### 🎯 電話予約ワークフロー最適化

#### **汎用電話予約シナリオ（業種別事例）**

```yaml
# 従来の共通問題フロー
Step1: スタッフ「少々お待ちください」
Step2: 別画面で空き時間確認
Step3: 頭で計算・メモ確認
Step4: 顧客に回答
Step5: 予約作成画面を開く
Step6: 入力作業
Step7: スタッフ「お待たせしました」
Total: 30-60秒の沈黙

# 改善後の統一フロー
Step1: スタッフ「いつ頃がご希望ですか？」
Step2: Timeline上で即座に空き時間確認
Step3: スタッフ「〇時からでしたら空いております」
Step4: 顧客「お願いします」
Step5: Timeline上該当スロットクリック
Step6: インライン予約フォーム即座表示
Step7: 顧客情報・サービス選択
Step8: スタッフ「予約完了しました」
Total: 5-10秒で完了

# 業種別適用例
美容院: 「カットとカラーで14時から空いております」
クリニック: 「診察で15時半から空きがあります」
レンタルスペース: 「会議室とプロジェクターで16時から空いています」
教室: 「英語の個人レッスンで17時から空いています」
アクティビティ: 「体験ツアーで10時から空きがあります」
```

#### **対面予約シナリオ（業種共通）**

```yaml
# 従来の共通問題フロー
Step1: スタッフがシステムを操作
Step2: 顧客は画面が見えない
Step3: スタッフ「〇時はいかがですか？」
Step4: 顧客「他の時間は？」
Step5: スタッフが再度確認
透明性: 低い、顧客は待つだけ

# 改善後の統一フロー
Step1: スタッフ「一緒に確認しましょう」
Step2: Timeline画面を顧客と共有
Step3: 顧客「この時間は空いていますか？」
Step4: スタッフ「はい、空いています」
Step5: 顧客と協働で時間選択
Step6: その場で予約作成
透明性: 高い、顧客との協働
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

## 汎用予約管理 UI/UX 仕様

### 🎯 業種別ペルソナ設定

```yaml
共通シチュエーション:
  - 電話対応中の片手操作（美容・クリニック・受付等）
  - 業務中の合間確認（診療・施術・レッスン中等）
  - 顧客との画面共有（対面予約・相談）
  - 繁忙時間帯での高速操作（各業種共通）

業種別ペルソナ例:
  美容院: 美容師（30代・女性）- 施術中に電話対応
  クリニック: 受付スタッフ（40代・女性）- 診療中に予約受付
  レンタルスペース: 管理者（35代・男性）- 施設案内中に空き確認
  教室: 講師（45代・女性）- レッスン中に次回予約調整
  アクティビティ: ガイド（30代・男性）- ツアー中に予約相談

汎用要求事項:
  - 直感的な操作（業種問わず説明不要）
  - 高速な応答（待ち時間なし）
  - 視覚的な情報提示（言語・業種に依存しない）
  - エラーの少ない設計（業種特有の複雑さに対応）
```

### 📱 モバイルファースト設計

#### **画面サイズ対応**

```typescript
// レスポンシブブレークポイント
const Breakpoints = {
  mobile: 320, // 最小対応サイズ
  tablet: 768,
  desktop: 1024,

  // 業種別推奨サイズ
  industryOptimized: {
    smartphone: 375, // iPhone標準（個人店舗・移動スタッフ）
    tablet: 768, // iPad標準（受付・カウンター）
    desktop: 1200, // 店舗PC（管理者・複数スタッフ）
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

#### **汎用電話予約コンポーネント**

```typescript
// 業種横断共通コンポーネント
const UniversalPhoneBookingComponents = {
  // 高速顧客検索
  CustomerQuickSearch: {
    features: [
      "電話番号・顧客名での検索",
      "部分一致検索",
      "最近利用顧客の上位表示",
      "タップで即選択",
    ],
    ui: {
      inputHeight: 52,
      fontSize: 16,
      placeholder: "顧客名・電話番号・ID等で検索",
      autoComplete: true,
    },
    industryAdaptation: {
      beauty: "お客様名・電話番号で検索",
      clinic: "患者様名・診察券番号で検索",
      rental: "ご利用者名・会員番号で検索",
      school: "生徒様名・学籍番号で検索",
      activity: "参加者名・予約番号で検索",
    },
  },

  // サービス選択グリッド
  ServiceQuickGrid: {
    features: [
      "所要時間による適合表示",
      "料金・時間の併記",
      "よく使うサービスの優先表示",
      "大きなタッチターゲット",
    ],
    ui: {
      cardSize: 120, // px
      gridColumns: "auto-fit",
      spacing: 12,
      cornerRadius: 8,
    },
    industryAdaptation: {
      beauty: "メニュー（カット・カラー等）",
      clinic: "診療内容（診察・検査等）",
      rental: "利用プラン（会議室・設備等）",
      school: "コース（英語・数学等）",
      activity: "プログラム（体験・ツアー等）",
    },
  },

  // 時間調整スライダー
  TimeAdjustmentSlider: {
    features: [
      "業種別時間単位の調整",
      "営業時間内制限",
      "他予約との競合チェック",
      "視覚的フィードバック",
    ],
    ui: {
      trackHeight: 8,
      thumbSize: 24,
      range: true,
    },
    industrySteps: {
      beauty: 30, // 30分単位
      clinic: 15, // 15分単位
      rental: 60, // 60分単位
      school: 30, // 30分単位
      activity: 60, // 60分単位
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
**ドキュメントバージョン**: 2.1  
**システムバージョン**: Phase 21.3 完了（5 分刻み時間スロット設定システム実装済み）
