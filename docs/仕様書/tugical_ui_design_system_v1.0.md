---
marp: true
theme: default
size: 16:9
paginate: true
header: "tugical UI設計書・デザインシステム"
footer: "© tugilo inc. all rights reserved"
---

# tugical UI設計書・デザインシステム
## React Component Specification（完全版）

**Version**: 1.1  
**Date**: 2025年6月29日  
**Project**: tugical（ツギカル）  
**Framework**: React + TypeScript + Tailwind CSS + Framer Motion

---

## デザイン基本方針

### ブランドアイデンティティ
- **コンセプト**: 次の時間が、もっと自由になる
- **ターゲット**: 美容・サービス業界の店舗オーナー
- **キーワード**: シンプル、直感的、信頼性、効率性

### デザイン原則
1. **Mobile First**: スマートフォン優先の設計
2. **Touch Friendly**: 指での操作に最適化
3. **Accessibility**: 誰もが使いやすいUI
4. **Consistency**: 一貫性のある操作体験
5. **Performance**: 高速な表示・操作

---

## カラーシステム

### プライマリカラー
```css
/* メインブランドカラー */
--color-primary-50: #f0fdfa;   /* 背景用薄いミント */
--color-primary-100: #ccfbf1;  /* ホバー状態 */
--color-primary-500: #10b981;  /* メインカラー（ミントグリーン） */
--color-primary-600: #059669;  /* アクティブ状態 */
--color-primary-900: #064e3b;  /* 濃いアクセント */
```

### セカンダリカラー
```css
/* ダークグレー系 */
--color-gray-50: #f9fafb;      /* 背景用薄いグレー */
--color-gray-100: #f3f4f6;     /* カード背景 */
--color-gray-500: #6b7280;     /* テキストグレー */
--color-gray-700: #374151;     /* 見出し用 */
--color-gray-900: #1f2937;     /* メインテキスト */
```

---

## ステータスカラー

### 機能別カラー
```css
--color-success: #10b981;      /* 成功・確定 */
--color-warning: #f59e0b;      /* 警告・保留 */
--color-error: #ef4444;        /* エラー・キャンセル */
--color-info: #3b82f6;         /* 情報・通知 */
```

### 予約ステータス専用カラー
```css
--color-booking-pending: #f59e0b;     /* 申込み中 */
--color-booking-confirmed: #10b981;   /* 確定 */
--color-booking-cancelled: #ef4444;   /* キャンセル */
--color-booking-completed: #6b7280;   /* 完了 */
--color-booking-no-show: #dc2626;     /* 無断キャンセル */
```

---

## タイポグラフィ

### フォントファミリー
```css
/* メインフォント */
font-family: 'Nunito', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;

/* モノスペース（コード・番号表示用） */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### フォントサイズ階層
```css
/* 見出し */
--text-4xl: 2.25rem;    /* h1: メインタイトル */
--text-3xl: 1.875rem;   /* h2: セクションタイトル */
--text-2xl: 1.5rem;     /* h3: サブセクション */
--text-xl: 1.25rem;     /* h4: カードタイトル */

/* 本文 */
--text-lg: 1.125rem;    /* 大きめ本文 */
--text-base: 1rem;      /* 標準本文 */
--text-sm: 0.875rem;    /* 小さめ本文・キャプション */
--text-xs: 0.75rem;     /* 注釈・ラベル */
```

---

## フォントウェイト

```css
--font-light: 300;      /* キャプション */
--font-normal: 400;     /* 本文 */
--font-medium: 500;     /* 強調テキスト */
--font-semibold: 600;   /* 見出し */
--font-bold: 700;       /* 重要な見出し */
```

---

## スペーシングシステム

### 基本スペーシング
```css
/* 基本単位: 4px */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
```

### コンポーネント内スペーシング
- **カード内余白**: `p-4` (16px)
- **セクション間**: `mb-8` (32px)
- **要素間**: `mb-4` (16px)
- **インライン要素間**: `mr-2` (8px)

---

## 基本コンポーネント：Button

### Button Props
```typescript
interface ButtonProps {
  /** ボタンの見た目バリエーション */
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** サイズ */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 無効状態 */
  disabled?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** 全幅表示 */
  fullWidth?: boolean;
  /** アイコン */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** クリックハンドラー */
  onClick?: () => void;
  children: React.ReactNode;
}
```

### Button 使用例
```jsx
<Button variant="primary" size="md" leftIcon={<PlusIcon />}>
  新規予約
</Button>
```

---

## 基本コンポーネント：Input

### Input Props
```typescript
interface InputProps {
  /** 入力タイプ */
  type: 'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'time';
  /** ラベル */
  label: string;
  /** プレースホルダー */
  placeholder?: string;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  help?: string;
  /** 必須フィールド */
  required?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** 値 */
  value: string;
  /** 変更ハンドラー */
  onChange: (value: string) => void;
}
```

---

## 基本コンポーネント：Card

### Card Props
```typescript
interface CardProps {
  /** カードタイトル */
  title?: string;
  /** サブタイトル */
  subtitle?: string;
  /** ヘッダーアクション */
  headerAction?: React.ReactNode;
  /** フッターアクション */
  footerAction?: React.ReactNode;
  /** クリック可能 */
  clickable?: boolean;
  /** クリックハンドラー */
  onClick?: () => void;
  /** 影の強さ */
  shadow: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

---

## 予約管理専用コンポーネント：BookingCard

### BookingCard Props
```typescript
interface BookingCardProps {
  /** 予約データ */
  booking: {
    id: number;
    booking_number: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    customer: {
      name: string;
      phone: string;
    };
    menu: {
      name: string;
      duration: number;
    };
    resource?: {
      name: string;
    };
    total_price: number;
    customer_notes?: string;
  };
  /** アクション */
  onEdit?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onComplete?: (booking: Booking) => void;
  /** 表示モード */
  mode: 'compact' | 'detailed';
}
```

---

## BookingCard 使用例

```jsx
<BookingCard 
  booking={booking}
  mode="compact"
  onEdit={handleEdit}
  onCancel={handleCancel}
/>
```

---

## 予約管理専用コンポーネント：CalendarView

### CalendarView Props
```typescript
interface CalendarViewProps {
  /** 表示日付 */
  currentDate: Date;
  /** 予約データ */
  bookings: Booking[];
  /** 営業時間 */
  businessHours: {
    start: string;
    end: string;
  };
  /** 表示モード */
  view: 'day' | 'week' | 'month';
  /** 時間枠クリック */
  onTimeSlotClick?: (date: Date, time: string) => void;
  /** 予約クリック */
  onBookingClick?: (booking: Booking) => void;
  /** ドラッグ&ドロップ */
  onBookingDrop?: (booking: Booking, newDateTime: Date) => void;
}
```

---

## 予約管理専用コンポーネント：ResourceSelector

### ResourceSelector Props
```typescript
interface ResourceSelectorProps {
  /** 利用可能リソース */
  resources: Resource[];
  /** 選択中のリソース */
  selectedResource?: Resource;
  /** 選択ハンドラー */
  onSelect: (resource: Resource | null) => void;
  /** 「おまかせ」オプション */
  allowAuto?: boolean;
  /** 表示モード */
  mode: 'grid' | 'list';
}
```

---

## LIFF専用コンポーネント：BookingStepIndicator

### BookingStepIndicator Props
```typescript
interface BookingStepIndicatorProps {
  /** 現在のステップ */
  currentStep: number;
  /** 総ステップ数 */
  totalSteps: number;
  /** ステップラベル */
  stepLabels: string[];
  /** 完了済みステップ */
  completedSteps: number[];
}
```

### 使用例
```jsx
<BookingStepIndicator 
  currentStep={2}
  totalSteps={5}
  stepLabels={['メニュー', 'スタッフ', '日時', '情報', '確認']}
  completedSteps={[1]}
/>
```

---

## LIFF専用コンポーネント：MenuSelectionCard

### MenuSelectionCard Props
```typescript
interface MenuSelectionCardProps {
  /** メニューデータ */
  menu: {
    id: number;
    name: string;
    description: string;
    base_duration: number;
    base_price: number;
    photo_url?: string;
    tax_included: boolean;
  };
  /** 選択状態 */
  selected?: boolean;
  /** 選択ハンドラー */
  onSelect: (menu: Menu) => void;
  /** 詳細表示ハンドラー */
  onShowDetails?: (menu: Menu) => void;
}
```

---

## LIFF専用コンポーネント：TimeSlotPicker

### TimeSlotPicker Props
```typescript
interface TimeSlotPickerProps {
  /** 利用可能な時間枠 */
  availableSlots: TimeSlot[];
  /** 選択中の時間枠 */
  selectedSlots: TimeSlot[];
  /** 最大選択数 */
  maxSelections: number;
  /** 選択ハンドラー */
  onSelect: (slots: TimeSlot[]) => void;
  /** 表示モード */
  mode: 'single' | 'multiple';
  /** 承認モード */
  approvalMode: 'auto' | 'manual';
}
```

---

## 画面レイアウト：管理者画面

### 基本レイアウト構造
```
┌─ Header (64px) ──────────────────────────┐
│ [tugical] [店舗選択▼] [通知] [ユーザー▼]   │
├─ Sidebar (240px) ─┬─ Main Content ────────┤
│ ダッシュボード      │                    │
│ 予約管理          │ Page Content        │
│ 顧客管理          │                    │
│ スタッフ管理       │                    │
│ メニュー管理       │                    │
│ 設定              │                    │
│ サポート          │                    │
└─────────────────┴────────────────────┘
```

---

## レスポンシブ対応

### レスポンシブ設計
```css
/* Desktop (1024px+) */
.layout-desktop {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 64px 1fr;
}

/* Tablet (768px-1023px) */
.layout-tablet {
  /* サイドバーをオーバーレイ表示 */
}

/* Mobile (767px以下) */
.layout-mobile {
  /* フルスクリーン、ボトムナビゲーション */
}
```

---

## 画面レイアウト：LIFF画面

### 基本レイアウト構造
```
┌─ Header (56px) ──────────────────┐
│ [← 戻る] Step 2/5 [メニュー]      │
├─ Progress Bar (4px) ─────────────┤
│ ████████░░░░░░░░░░░ (40%)        │
├─ Main Content ───────────────────┤
│                                 │
│   Content Area                  │
│                                 │
│                                 │
├─ Bottom Action (64px) ───────────┤
│ [戻る]              [次へ]       │
└─────────────────────────────────┘
```

---

## アニメーション・インタラクション

### 基本アニメーション
```typescript
// Framer Motion設定
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

const slideUp = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2, ease: 'easeOut' }
};
```

---

## インタラクションパターン

### インタラクション設定
```typescript
// ホバーエフェクト
const hoverCard = {
  whileHover: { 
    scale: 1.02, 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
  },
  transition: { duration: 0.2 }
};

// タップエフェクト
const tapButton = {
  whileTap: { scale: 0.98 },
  transition: { duration: 0.1 }
};

// ローディングアニメーション
const loadingSpinner = {
  animate: { rotate: 360 },
  transition: { 
    duration: 1, 
    repeat: Infinity, 
    ease: 'linear' 
  }
};
```

---

## ページ遷移アニメーション

### ページ遷移設定
```typescript
// LIFF ステップ遷移
const stepTransition = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
  transition: { duration: 0.3, ease: 'easeInOut' }
};
```

---

## 状態管理パターン

### コンポーネント状態パターン
```typescript
// カスタムフック例
function useBookingForm(storeId: number) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateBookingData = useCallback((data: Partial<BookingFormData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
    // フォーム離脱時の保存
    localStorage.setItem('booking_draft', JSON.stringify({ ...bookingData, ...data }));
  }, [bookingData]);

  const submitBooking = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await bookingApi.create(bookingData);
      // 成功処理
      localStorage.removeItem('booking_draft');
      return result;
    } catch (error) {
      setErrors(error.details);
    } finally {
      setIsLoading(false);
    }
  }, [bookingData]);

  return {
    step,
    setStep,
    bookingData,
    updateBookingData,
    isLoading,
    errors,
    submitBooking
  };
}
```

---

## グローバル状態管理

### Zustand store例
```typescript
interface AppStore {
  // 認証状態
  user: User | null;
  store: Store | null;
  
  // UI状態
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  
  // データキャッシュ
  bookings: Booking[];
  customers: Customer[];
  
  // アクション
  setUser: (user: User) => void;
  setSidebarOpen: (open: boolean) => void;
  fetchBookings: () => Promise<void>;
}
```

---

## エラーハンドリング・フィードバック

### エラー表示パターン
```typescript
interface ErrorDisplayProps {
  /** エラーレベル */
  level: 'info' | 'warning' | 'error' | 'success';
  /** エラーメッセージ */
  message: string;
  /** 詳細情報 */
  details?: string;
  /** アクションボタン */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 自動非表示時間（秒） */
  autoHide?: number;
}
```

---

## Toast通知使用例

```typescript
// Toast通知
<Toast 
  level="error"
  message="予約の作成に失敗しました"
  details="時間が重複しています"
  action={{
    label: "時間を変更",
    onClick: () => setStep(3)
  }}
  autoHide={5}
/>
```

---

## ローディング状態

### ローディングパターン
```typescript
// ページレベルローディング
<LoadingOverlay message="予約を作成しています..." />

// ボタンローディング
<Button loading={isSubmitting}>
  {isSubmitting ? '送信中...' : '予約する'}
</Button>

// スケルトン表示
<BookingCardSkeleton count={5} />
```

---

## アクセシビリティ

### キーボードナビゲーション
- Tab順序の適切な設定
- ショートカットキー対応
- フォーカスの視覚的表示

### スクリーンリーダー対応
```typescript
// ARIA属性の適切な使用
<Button 
  aria-label="新規予約を作成"
  aria-describedby="booking-help-text"
>
  予約作成
</Button>

<div id="booking-help-text" className="sr-only">
  メニューと日時を選択して新しい予約を作成します
</div>
```

### カラーコントラスト
- WCAG AA基準準拠（4.5:1以上）
- 重要な情報は色だけでなく形状・テキストでも表現

---

## パフォーマンス最適化

### コンポーネント最適化
```typescript
// React.memo の適切な使用
const BookingCard = React.memo<BookingCardProps>(({ booking, onEdit }) => {
  return (
    <motion.div {...fadeIn}>
      {/* コンポーネント内容 */}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.booking.id === nextProps.booking.id &&
         prevProps.booking.status === nextProps.booking.status;
});

// useMemo, useCallback の活用
const filteredBookings = useMemo(() => {
  return bookings.filter(booking => 
    booking.status === selectedStatus &&
    booking.booking_date === selectedDate
  );
}, [bookings, selectedStatus, selectedDate]);
```

---

## 画像最適化

### 画像最適化手法
- WebP形式の使用
- レスポンシブ画像
- 遅延読み込み

### バンドル最適化
- コード分割（React.lazy）
- 動的インポート
- Tree shaking

---

## 多言語対応

### 国際化対応
```typescript
// react-i18next使用
const { t } = useTranslation();

<Button>
  {t('booking.create')}  {/* 日本語: "予約作成" */}
</Button>

// 言語切り替え
<LanguageSelector 
  currentLanguage="ja"
  availableLanguages={['ja', 'en']}
  onChange={setLanguage}
/>
```

---

## 日付・時刻・通貨フォーマット

### フォーマット対応
```typescript
// 日本のフォーマットに対応
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(price);
};

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
```

---

## 開発ガイドライン

### コンポーネント作成ルール
```typescript
// 1. ファイル構成
components/
├── ui/                    # 基本UIコンポーネント
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
├── booking/               # 予約関連コンポーネント
├── customer/              # 顧客関連コンポーネント
└── layout/                # レイアウトコンポーネント

// 2. 命名規則
interface ComponentNameProps {
  // Props定義
}

const ComponentName: React.FC<ComponentNameProps> = ({ ... }) => {
  // コンポーネント実装
};

export default ComponentName;
```

---

## スタイリングルール

### Tailwind CSS使用例
```typescript
// 1. Tailwind CSS クラス使用
<div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">

// 2. 条件付きスタイル
const buttonClasses = cn(
  'px-4 py-2 rounded-md font-medium transition-colors',
  {
    'bg-primary-500 text-white hover:bg-primary-600': variant === 'primary',
    'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
    'opacity-50 cursor-not-allowed': disabled
  }
);

// 3. カスタムCSS（最小限）
// 複雑なアニメーションやTailwindで表現困難な場合のみ
```

---

## テスト戦略

### コンポーネントテスト
```typescript
// Jest + React Testing Library
describe('BookingCard', () => {
  it('予約情報を正しく表示する', () => {
    const booking = createMockBooking();
    render(<BookingCard booking={booking} />);
    
    expect(screen.getByText(booking.customer.name)).toBeInTheDocument();
    expect(screen.getByText(booking.menu.name)).toBeInTheDocument();
  });

  it('編集ボタンクリックで編集関数が呼ばれる', () => {
    const handleEdit = jest.fn();
    const booking = createMockBooking();
    
    render(<BookingCard booking={booking} onEdit={handleEdit} />);
    fireEvent.click(screen.getByText('編集'));
    
    expect(handleEdit).toHaveBeenCalledWith(booking);
  });
});
```

---

## Storybook対応

### Storybook設定例
```typescript
// BookingCard.stories.tsx
export default {
  title: 'Components/Booking/BookingCard',
  component: BookingCard,
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['compact', 'detailed']
    }
  }
};

export const Default = {
  args: {
    booking: createMockBooking(),
    mode: 'compact'
  }
};

export const WithActions = {
  args: {
    booking: createMockBooking(),
    mode: 'detailed',
    onEdit: action('onEdit'),
    onCancel: action('onCancel')
  }
};
```

---

## 実装済みモック画面・参考資料

### 管理者画面
| 画面名 | URL | 主要機能 |
|--------|-----|----------|
| ダッシュボード | [Link](https://claude.ai/public/artifacts/8ac4aa2e-a426-4917-8a13-1609b4f71ada) | 今日の予約・売上・通知一覧 |
| 予約管理 | [Link](https://claude.ai/public/artifacts/34e6d2d3-c69b-4ed8-badb-b9a3a62dbcc1) | 予約一覧・フィルタ・検索 |
| 予約承認画面 | [Link](https://claude.ai/public/artifacts/22e1cddc-d67a-44ac-8e66-732d94322282) | 手動承認モード・第3希望まで |
| 顧客管理 | [Link](https://claude.ai/public/artifacts/85aaf66c-2f71-4d38-9cf8-5dba7ca269c9) | 顧客一覧・詳細・ランク管理 |
| スタッフ管理 | [Link](https://claude.ai/public/artifacts/dd4cda4c-c19f-495c-ace1-670a2dc7f6eb) | リソース管理・稼働時間設定 |
| メニュー管理 | [Link](https://claude.ai/public/artifacts/a401a015-aa53-484c-b095-b43a7942132f) | メニュー・オプション設定 |
| 設定画面 | [Link](https://claude.ai/public/artifacts/85aaf66c-2f71-4d38-9cf8-5dba7ca269c9) | 営業時間・通知・業種設定 |

---

## LIFF画面（顧客側）

| 画面名 | URL | 主要機能 |
|--------|-----|----------|
| メニュー選択 | [Link](https://claude.ai/public/artifacts/ba499c4e-7edd-45b9-83ae-ab5f061eb018) | カード形式・詳細モーダル |
| 日時選択 | [Link](https://claude.ai/public/artifacts/849ea506-151a-4ba9-8cf3-4027444aa906) | カレンダー・仮押さえ表示 |
| 予約完了画面 | [Link](https://claude.ai/public/artifacts/56784c27-3fe7-45eb-a0c3-b60081e28600) | 予約番号・LINE通知連携 |
| 予約履歴 | [Link](https://claude.ai/public/artifacts/8065eebd-9e4d-425f-9f89-ae04cc7ebd57) | 過去予約・ステータス表示 |

---

## 実装時の参考ポイント

### カラーシステム実装例
モック画面では以下のカラーパターンを使用：
- **Primary**: `bg-emerald-500` (#10b981) - メインアクション
- **Status Colors**: 予約ステータス別の色分け実装済み
- **Gray Scale**: `bg-gray-50` から `text-gray-900` まで適切な階層

---

## BookingCard実装例

```typescript
// BookingCard実装例（予約管理画面より）
<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
  <div className="flex items-center justify-between mb-2">
    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-sm">
      確定
    </span>
    <span className="text-gray-500 text-sm">TG20250629001</span>
  </div>
  {/* 予約詳細 */}
</div>
```

---

## TimeSlotPicker実装例

```typescript
// TimeSlotPicker実装例（日時選択画面より）
<div className="grid grid-cols-3 gap-2">
  {timeSlots.map(slot => (
    <button 
      key={slot.time}
      className={`p-3 rounded-lg border text-center transition-colors ${
        slot.available 
          ? 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50' 
          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
      }`}
    >
      {slot.time}
    </button>
  ))}
</div>
```

---

## レスポンシブレイアウト実装例

```css
/* 管理者画面レイアウト（ダッシュボードより） */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* LIFF画面レイアウト（メニュー選択より） */
.liff-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f0fdfa, #ffffff);
  padding: 1rem;
}
```

---

## アニメーション実装例

### モック画面で使用されているアニメーションパターン：
- フェードイン：`opacity-0` → `opacity-100`
- スライドアップ：`transform translate-y-4` → `translate-y-0`
- ホバーエフェクト：`hover:shadow-lg transition-shadow`

---

## フォーム実装例

```typescript
// 個人情報入力フォーム（予約完了画面より）
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      お名前
    </label>
    <input 
      type="text"
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      placeholder="山田太郎"
    />
  </div>
</div>
```

---

## 今後の実装ステップ

### Phase 1: 基本コンポーネント
1. **UI基盤** - Button, Input, Card等の基本コンポーネント
2. **レイアウト** - Header, Sidebar, MainContent
3. **テーマ設定** - Tailwind設定、カラーパレット

### Phase 2: 予約管理機能
1. **BookingCard** - 予約表示・操作
2. **CalendarView** - カレンダー表示・ドラッグ&ドロップ
3. **Filter/Search** - フィルタリング・検索機能

### Phase 3: LIFF機能
1. **BookingFlow** - ステップバイステップ予約
2. **TimeSlotPicker** - 時間選択・仮押さえ
3. **CustomerForm** - 顧客情報入力

### Phase 4: 高度機能
1. **Animation** - Framer Motion統合
2. **PWA** - オフライン対応
3. **Performance** - 最適化・Lazy Loading

---

## まとめ

### 重要ポイント
1. **一貫性** - デザインシステムに基づいた統一感のあるUI
2. **使いやすさ** - タッチフレンドリーな操作性
3. **パフォーマンス** - 高速な表示・スムーズなアニメーション
4. **メンテナンス性** - コンポーネント化・テスト対応

### 成功指標
- **操作時間**: 予約完了まで3分以内
- **エラー率**: 5%以下
- **ユーザビリティスコア**: 90点以上
- **パフォーマンススコア**: Lighthouse 90点以上

**次のステップ**: 基本コンポーネントの実装開始

---

## 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-06-28 | 初版作成 | tugilo inc. |
| 1.1 | 2025-06-29 | モック画面・参考資料追加、完全版対応 | tugilo inc. |

---