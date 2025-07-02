import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn, getBookingStatusClass, getBookingStatusLabel, formatPrice } from '../../utils';
import type { Booking } from '../../types';
import Button from '../ui/Button';

interface BookingCardProps {
  booking: Booking;
  mode?: 'compact' | 'detailed';
  onEdit?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  onComplete?: (booking: Booking) => void;
  className?: string;
}

/**
 * 予約カードコンポーネント
 * 管理画面およびダッシュボードで予約情報を表示
 */
const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  mode = 'compact',
  onEdit,
  onCancel,
  onComplete,
  className,
}) => {
  return (
    <motion.div
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'px-2 py-1 rounded-full text-sm font-medium',
            getBookingStatusClass(booking.status)
          )}
        >
          {getBookingStatusLabel(booking.status)}
        </span>
        <span className="text-gray-500 text-sm font-mono">
          {booking.booking_number}
        </span>
      </div>

      {/* Customer Info */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 mb-1">
          {booking.customer.name}
        </h3>
        <p className="text-gray-600 text-sm">{booking.customer.phone}</p>
      </div>

      {/* Booking Details */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700 font-medium">{booking.menu.name}</span>
          <span className="text-primary-600 font-semibold">
            {formatPrice(booking.total_price, false)}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span>
            {format(new Date(booking.booking_date), 'M月d日(E)', { locale: ja })}
          </span>
          <span className="mx-2">•</span>
          <span>
            {booking.start_time} - {booking.end_time}
          </span>
          {booking.resource && (
            <>
              <span className="mx-2">•</span>
              <span>{booking.resource.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Customer Notes */}
      {mode === 'detailed' && booking.customer_notes && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
          <span className="font-medium">要望:</span> {booking.customer_notes}
        </div>
      )}

      {/* Actions */}
      {mode === 'detailed' && (onEdit || onCancel || onComplete) && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
              編集
            </Button>
          )}
          {onComplete && booking.status === 'confirmed' && (
            <Button variant="primary" size="sm" onClick={() => onComplete(booking)}>
              完了
            </Button>
          )}
          {onCancel && ['pending', 'confirmed'].includes(booking.status) && (
            <Button variant="danger" size="sm" onClick={() => onCancel(booking)}>
              キャンセル
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BookingCard; 