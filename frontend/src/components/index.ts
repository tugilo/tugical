/**
 * tugical 統一コンポーネント エクスポート
 * 
 * 重複コンポーネントを防ぐため、全ての共通コンポーネントを
 * このファイルから統一的にエクスポートします。
 * 
 * 新しいコンポーネントを作成する前に、必ずこのファイルを確認してください。
 */

// === 基本UIコンポーネント ===
export { default as Button } from './ui/Button';
export { default as Card } from './ui/Card';
export { default as LoadingScreen } from './ui/LoadingScreen';
export { default as ToastContainer } from './ui/ToastContainer';
export { default as ConfirmDialog } from './ui/ConfirmDialog';

// === 統一モーダルコンポーネント（CRITICAL: これ以外は使用禁止） ===
export { default as Modal } from './modal/Modal';

// === レイアウトコンポーネント ===
export { default as DashboardLayout } from './layout/DashboardLayout';

// === 顧客管理コンポーネント ===
export { CustomerCreateModal } from './customers/CustomerCreateModal';
export { CustomerDetailModal } from './customers/CustomerDetailModal';

// === メニュー管理コンポーネント ===
export { default as MenuDetailModal } from './menus/MenuDetailModal';
export { default as MenuCreateModal } from './menus/MenuCreateModal';
export { default as MenuEditModal } from './menus/MenuEditModal';

// === リソース管理コンポーネント ===
export { default as ResourceCreateModal } from './resources/ResourceCreateModal';
export { default as ResourceEditModal } from './resources/ResourceEditModal';

/**
 * 重要な開発ルール:
 * 
 * 1. 新しいモーダルコンポーネントは必ず './modal/Modal' を使用
 * 2. 同じ機能のコンポーネントを重複作成しない
 * 3. 新規作成前に必ずこのファイルで既存確認
 * 4. 共通化可能なコンポーネントは ui/ ディレクトリに配置
 * 5. 機能別コンポーネントは対応するディレクトリに配置
 */
