/**
 * tugical Admin Dashboard Toast通知コンテナ
 *
 * 機能:
 * - UIストアと統合した通知表示
 * - 4種類の通知タイプ（success, error, warning, info）
 * - 自動消去機能
 * - Framer Motion アニメーション
 * - 複数通知のスタック表示
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../stores/uiStore';
import type { ToastNotification } from '../../types';

/**
 * 個別Toast通知コンポーネント
 */
const Toast: React.FC<{
  notification: ToastNotification;
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const { id, type, title, message, actions, persistent } = notification;

  // タイプ別設定
  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg pointer-events-auto`}
    >
      <div className='p-4'>
        <div className='flex items-start'>
          <div className='flex-shrink-0'>
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className='ml-3 w-0 flex-1 pt-0.5'>
            <p className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </p>
            {message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>{message}</p>
            )}
          </div>
          <div className='ml-4 flex-shrink-0 flex'>
            <button
              className={`rounded-md inline-flex ${config.messageColor} hover:${config.titleColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              onClick={() => onClose(id)}
            >
              <span className='sr-only'>閉じる</span>
              <XMarkIcon className='h-5 w-5' />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Toast通知コンテナ
 */
const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div
      aria-live='assertive'
      className='fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-[10001]'
    >
      <div className='w-full flex flex-col items-center space-y-4 sm:items-end'>
        <AnimatePresence>
          {notifications.map(notification => (
            <Toast
              key={notification.id}
              notification={notification}
              onClose={removeNotification}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToastContainer;
