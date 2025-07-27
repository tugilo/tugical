/**
 * tugical 統一コンポーネントエクスポート
 *
 * 重複防止・共通化徹底のための統一管理ファイル
 * 新しいコンポーネント作成前に必ずここを確認すること
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-04
 */

// ========================================
// UI基盤コンポーネント（共通利用必須）
// ========================================
export { default as Modal } from './modal/Modal';
export { default as ConfirmDialog } from './ui/ConfirmDialog';
export { default as Button } from './ui/Button';
export { default as Card } from './ui/Card';
export { default as FormField } from './ui/FormField';
export { default as LoadingScreen } from './ui/LoadingScreen';
export { default as ToastContainer } from './ui/ToastContainer';

// ========================================
// レイアウトコンポーネント
// ========================================
export { default as DashboardLayout } from './layout/DashboardLayout';

// ========================================
// 予約関連コンポーネント
// ========================================
export { default as BookingCard } from './booking/BookingCard';
export { default as BookingCreateModal } from './booking/BookingCreateModal';
export { MultiMenuSelector } from './booking/MultiMenuSelector';

// ========================================
// 顧客管理コンポーネント
// ========================================
export { default as CustomerCard } from './customers/CustomerCard';
export { CustomerCreateModal } from './customers/CustomerCreateModal';
export { CustomerDetailModal } from './customers/CustomerDetailModal';

// ========================================
// メニュー管理コンポーネント
// ========================================
export { default as MenuCreateModal } from './menus/MenuCreateModal';
export { default as MenuDetailModal } from './menus/MenuDetailModal';
export { default as MenuEditModal } from './menus/MenuEditModal';

// ========================================
// リソース管理コンポーネント
// ========================================
export { default as ResourceCreateModal } from './resources/ResourceCreateModal';
export { default as ResourceEditModal } from './resources/ResourceEditModal';

// ========================================
// 開発ルール（重要）
// ========================================
/*
1. 新規コンポーネント作成前の必須チェック
   - このファイルで類似コンポーネントが存在しないか確認
   - 既存コンポーネントの拡張で対応できないか検討
   - 共通化可能な部分は必ず共通コンポーネントとして分離

2. 重複排除の徹底
   - 同じ機能のコンポーネントは絶対に作らない
   - 類似UIは共通コンポーネントに統一
   - プロパティで差分を吸収する設計

3. 共通化の原則
   - Modal: 全モーダルは ./modal/Modal を使用
   - FormField: 全フォーム要素は ./ui/FormField を使用
   - Button: 全ボタンは ./ui/Button を使用
   - ConfirmDialog: 全確認ダイアログは ./ui/ConfirmDialog を使用

4. 命名規則
   - {機能名}{操作名}Modal: CustomerCreateModal, MenuEditModal
   - {機能名}Card: CustomerCard, BookingCard
   - 統一性を保ち、検索しやすい名前にする

5. インポート管理
   - このファイルからの一括インポートを推奨
   - import { Modal, Button } from '../components';
   - 直接パスでのインポートは最小限に抑制
*/
