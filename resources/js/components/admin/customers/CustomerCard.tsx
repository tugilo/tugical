import React from 'react';
import { User, Phone, Mail, MessageCircle } from 'lucide-react';
import { Customer } from '../../types';
import { cn } from '../../utils';

interface CustomerCardProps {
  /** 顧客データ */
  customer: Customer;
  /** 表示モード */
  mode?: 'compact' | 'detailed';
  /** カスタムクラス */
  className?: string;
  /** クリック時のコールバック */
  onClick?: (customer: Customer) => void;
}

/**
 * 顧客カードコンポーネント
 * 
 * 顧客一覧で使用するカード形式の表示コンポーネント
 * コンパクトモードと詳細モードに対応
 */
const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  mode = 'compact',
  className,
  onClick,
}) => {
  const getLoyaltyRankLabel = (rank: string) => {
    const labels = {
      new: '新規',
      regular: '一般',
      vip: 'VIP',
      premium: 'プレミアム',
    };
    return labels[rank as keyof typeof labels] || rank;
  };

  const getLoyaltyRankColor = (rank: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      regular: 'bg-green-100 text-green-800',
      vip: 'bg-purple-100 text-purple-800',
      premium: 'bg-yellow-100 text-yellow-800',
    };
    return colors[rank as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(customer);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary-300',
        className
      )}
      onClick={handleClick}
    >
      {/* ヘッダー: 名前とロイヤリティランク */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            getLoyaltyRankColor(customer.loyalty_rank || 'new')
          )}
        >
          {getLoyaltyRankLabel(customer.loyalty_rank || 'new')}
        </span>
      </div>

      {/* 連絡先情報 */}
      <div className="space-y-2 mb-3">
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.line_display_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MessageCircle className="w-4 h-4" />
            <span className="truncate">{customer.line_display_name}</span>
          </div>
        )}
      </div>

      {/* コンパクトモード時の統計情報 */}
      {mode === 'compact' && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>予約 {customer.total_bookings || 0}回</span>
          {customer.last_booking_at && (
            <span>
              最終: {new Date(customer.last_booking_at).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
      )}

      {/* アクティブ状態インジケーター */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              customer.is_active ? 'bg-green-400' : 'bg-gray-300'
            )}
          />
          <span className="text-xs text-gray-600">
            {customer.is_active ? 'アクティブ' : '非アクティブ'}
          </span>
        </div>
        
        {/* 顧客ID */}
        <span className="text-xs text-gray-400 font-mono">
          #{customer.id}
        </span>
      </div>
    </div>
  );
};

export default CustomerCard;
