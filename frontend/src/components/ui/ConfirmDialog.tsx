import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from './Button';

interface ConfirmDialogProps {
  /** ダイアログの開閉状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** 確認時のコールバック */
  onConfirm: () => void;
  /** タイトル */
  title?: string;
  /** メッセージ */
  message: string;
  /** 確認ボタンのテキスト */
  confirmText?: string;
  /** キャンセルボタンのテキスト */
  cancelText?: string;
  /** 危険な操作かどうか */
  isDanger?: boolean;
  /** ローディング状態 */
  isLoading?: boolean;
}

/**
 * 確認ダイアログコンポーネント
 * - モダンなデザインの確認ダイアログ
 * - アニメーション付き
 * - カスタマイズ可能
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '確認',
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  isDanger = false,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      closeOnOverlayClick={!isLoading}
    >
      <div className="text-center">
        {/* アイコン */}
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          isDanger ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <ExclamationTriangleIcon className={`h-6 w-6 ${
            isDanger ? 'text-red-600' : 'text-yellow-600'
          }`} />
        </div>

        {/* タイトル */}
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          {title}
        </h3>

        {/* メッセージ */}
        <p className="mt-2 text-sm text-gray-600">
          {message}
        </p>

        {/* ボタン */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog; 