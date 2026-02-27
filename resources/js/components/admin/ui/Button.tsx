/**
 * tugical Admin Dashboard Button Component
 * 
 * 機能:
 * - 5つのバリエーション (primary, secondary, outline, ghost, danger)
 * - 5つのサイズ (xs, sm, md, lg, xl)
 * - ローディング状態
 * - アイコン対応
 * - Framer Motion アニメーション
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * tugicalの基本ボタンコンポーネント
 * 全ての画面で統一されたボタンスタイルを提供
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  children,
  type = 'button',
  className,
}) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    {
      // Variant styles
      'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500': variant === 'primary',
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': variant === 'secondary',
      'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500': variant === 'outline',
      'text-gray-700 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
      'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500': variant === 'danger',
      
      // Size styles
      'px-2 py-1 text-xs rounded': size === 'xs',
      'px-3 py-1.5 text-sm rounded-md': size === 'sm',
      'px-4 py-2 text-base rounded-md': size === 'md',
      'px-6 py-3 text-lg rounded-lg': size === 'lg',
      'px-8 py-4 text-xl rounded-lg': size === 'xl',
      
      // Full width
      'w-full': fullWidth,
    },
    className
  );

  return (
    <motion.button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {loading && (
        <svg
          className="w-4 h-4 mr-2 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </motion.button>
  );
};

export default Button; 