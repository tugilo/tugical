import React from 'react';
import { motion } from 'framer-motion';
import { cn, formatDate, formatRelativeTime, formatNumber } from '../../utils';
import Button from '../ui/Button';
import type { Customer } from '../../types';

interface CustomerCardProps {
  /** 顧客データ */
  customer: Customer;
  /** 表示モード（compact: 一覧カード ／ detailed: 詳細カード） */
  mode?: 'compact' | 'detailed';
  /** 編集ボタンクリック */
  onEdit?: (customer: Customer) => void;
  /** 非アクティブ化 or 再有効化 */
  onToggleActive?: (customer: Customer) => void;
  /** 追加クラス */
  className?: string;
}

/**
 * 顧客カードコンポーネント
 * - 顧客一覧や検索結果で使用
 * - loyalty_rank に応じたバッジ色を表示
 * - mode=detailed の場合は連絡先・統計情報を追加表示
 */
const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  mode = 'compact',
  onEdit,
  onToggleActive,
  className,
}) => {
  /* ---------------------------------- */
  /* ランク表示設定                     */
  /* ---------------------------------- */
  const rankColors: Record<Customer['loyalty_rank'], string> = {
    new: 'bg-green-200 text-green-800',
    regular: 'bg-blue-200 text-blue-800',
    vip: 'bg-purple-200 text-purple-800',
    premium: 'bg-yellow-200 text-yellow-800',
  };

  const rankLabels: Record<Customer['loyalty_rank'], string> = {
    new: '新規',
    regular: 'レギュラー',
    vip: 'VIP',
    premium: 'プレミアム',
  };

  const isActive = customer.is_active;

  return (
    <motion.div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow',
        !isActive && 'opacity-60',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* ヘッダー: 名前 & ランク */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 truncate mr-2">
          {customer.name}
        </h3>
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium shrink-0',
            rankColors[customer.loyalty_rank]
          )}
        >
          {rankLabels[customer.loyalty_rank]}
        </span>
      </div>

      {/* 連絡先・統計（mode=detailed のみ） */}
      {mode === 'detailed' && (
        <div className="mb-3 space-y-1 text-sm text-gray-700">
          <div>
            <span className="font-medium mr-1">電話:</span>
            {customer.phone || '―'}
          </div>
          <div>
            <span className="font-medium mr-1">メール:</span>
            {customer.email || '―'}
          </div>
          <div>
            <span className="font-medium mr-1">最終予約:</span>
            {customer.last_booking_at ? formatRelativeTime(customer.last_booking_at) : '―'}
          </div>
          <div>
            <span className="font-medium mr-1">累計予約数:</span>
            {formatNumber(customer.total_bookings)}
          </div>
          <div>
            <span className="font-medium mr-1">累計売上:</span>
            ¥{formatNumber(customer.total_spent)}
          </div>
          <div>
            <span className="font-medium mr-1">登録日:</span>
            {formatDate(customer.created_at, 'yyyy/MM/dd')}
          </div>
        </div>
      )}

      {/* 基本情報（compact モード） */}
      {mode === 'compact' && (
        <div className="space-y-2 text-sm">
          <div className="text-gray-600">
            <span className="font-medium">電話:</span> {customer.phone || '―'}
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>
              <span className="font-medium">予約:</span> {customer.total_bookings}回
            </span>
            <span>
              <span className="font-medium">売上:</span> ¥{formatNumber(customer.total_spent)}
            </span>
          </div>
          {customer.last_booking_at && (
            <div className="text-xs text-gray-500">
              最終予約: {formatRelativeTime(customer.last_booking_at)}
            </div>
          )}
        </div>
      )}

      {/* アクションボタン（mode=detailed のみ） */}
      {mode === 'detailed' && (onEdit || onToggleActive) && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
              編集
            </Button>
          )}
          {onToggleActive && (
            <Button
              variant={isActive ? 'danger' : 'primary'}
              size="sm"
              onClick={() => onToggleActive(customer)}
            >
              {isActive ? '無効化' : '再有効化'}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CustomerCard; 