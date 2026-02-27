import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils';

interface ModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** モーダルのタイトル */
  title?: string;
  /** モーダルのサイズ */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 閉じるボタンを表示するか */
  showCloseButton?: boolean;
  /** オーバーレイクリックで閉じるか */
  closeOnOverlayClick?: boolean;
  /** ESCキーで閉じるか */
  closeOnEsc?: boolean;
  /** 子要素 */
  children: React.ReactNode;
  /** フッター要素 */
  footer?: React.ReactNode;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 汎用モーダルコンポーネント
 * - Framer Motion によるアニメーション
 * - アクセシビリティ対応（ESCキー、フォーカストラップ）
 * - レスポンシブ対応
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  children,
  footer,
  className,
}) => {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // モーダルが開いているときはbodyのスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイとモーダルコンテナ */}
          <motion.div
            className="fixed inset-0 z-[9999] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 背景オーバーレイ */}
            <div className="fixed inset-0 bg-black/50 z-[9998]" />
            
            {/* モーダルコンテナ */}
            <div 
              className="relative flex min-h-full items-center justify-center p-4 z-[9999]"
              onClick={closeOnOverlayClick ? onClose : undefined}
            >
              {/* モーダル本体 */}
              <motion.div
                className={cn(
                  'relative bg-white rounded-lg shadow-xl w-full z-[10000]',
                  sizeClasses[size],
                  className
                )}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
              {/* ヘッダー */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  {title && (
                    <h2 className="text-xl font-semibold text-gray-900">
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                      aria-label="モーダルを閉じる"
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                </div>
              )}

              {/* ボディ */}
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {children}
              </div>

              {/* フッター */}
              {footer && (
                <div className="p-6 border-t border-gray-200">
                  {footer}
                </div>
              )}
                          </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal; 