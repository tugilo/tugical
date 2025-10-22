/**
 * tugical Admin Dashboard Card Component
 * 
 * 機能:
 * - ヘッダー、ボディ、フッター構造
 * - ホバーアニメーション
 * - クリック可能カード
 * - カスタムパディング
 * - Framer Motion アニメーション
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * カードコンテナ
 */
const CardComponent: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  clickable = false,
  onClick,
  padding = 'none',
}) => {
  const baseClasses = cn(
    'bg-white rounded-lg shadow-soft border border-gray-200',
    {
      'hover:shadow-medium transition-shadow duration-200': hoverable,
      'cursor-pointer': clickable,
      'p-3': padding === 'sm',
      'p-6': padding === 'md',
      'p-8': padding === 'lg',
    },
    className
  );

  const Component = clickable ? motion.div : 'div';
  const motionProps = clickable
    ? {
        whileHover: { scale: 1.01 },
        whileTap: { scale: 0.99 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <Component
      className={baseClasses}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Component>
  );
};

/**
 * カードヘッダー
 */
const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

/**
 * カードボディ
 */
const CardBody: React.FC<CardBodyProps> = ({
  children,
  className,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={cn(paddingClasses[padding], className)}>
      {children}
    </div>
  );
};

/**
 * カードフッター
 */
const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200', className)}>
      {children}
    </div>
  );
};

// 複合コンポーネント型定義
type CardType = React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
};

// 複合エクスポート
const Card = CardComponent as CardType;
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card; 