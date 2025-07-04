/**
 * 予約カードコンポーネント
 * 予約情報を表示するカードコンポーネント
 */

import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../../utils';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CurrencyYenIcon,
  TagIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Booking } from '../../types';
import Button from '../ui/Button';

interface BookingCardProps {
  /** 予約データ */
  booking: Booking;
  /** カードクリック時のコールバック */
  onClick?: (booking: Booking) => void;
  /** 表示モード */
  mode?: 'compact' | 'detailed';
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 時間をHH:MM形式にフォーマット
 */
const formatTime = (time: string): string => {
  if (!time) return '';
  // HH:MM:SS形式からHH:MM形式に変換
  return time.substring(0, 5);
};

/**
 * 予約ステータスのスタイル設定
 */
const statusStyles = {
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    label: '申込み中',
  },
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    label: '確定',
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    label: 'キャンセル',
  },
  completed: {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
    label: '完了',
  },
  no_show: {
    bg: 'bg-red-100',
    text: 'text-red-900',
    border: 'border-red-300',
    label: '無断キャンセル',
  },
};

/**
 * 予約カードコンポーネント
 */
const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onClick,
  mode = 'compact',
  className,
}) => {
  const status = statusStyles[booking.status];

  return (
    <motion.div
      className={cn(
        'bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer',
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick?.(booking)}
    >
      {/* ステータスバー */}
      <div
        className={cn(
          'px-4 py-2 border-b flex items-center justify-between',
          status.bg,
          status.border
        )}
      >
        <span className={cn('text-sm font-medium', status.text)}>
          {status.label}
        </span>
        <span className='text-xs text-gray-500 font-mono'>
          {booking.booking_number}
        </span>
      </div>

      {/* カード本体 */}
      <div className='p-4'>
        {/* 日時情報 */}
        <div className='flex items-center gap-4 mb-3'>
          <div className='flex items-center gap-1 text-gray-700'>
            <CalendarIcon className='w-4 h-4 text-gray-400' />
            <span className='text-sm font-medium'>
              {format(new Date(booking.booking_date), 'M月d日(E)', {
                locale: ja,
              })}
            </span>
          </div>
          <div className='flex items-center gap-4 text-sm text-gray-600'>
            <div className='flex items-center gap-1'>
              <ClockIcon className='w-4 h-4 text-gray-400' />
              <span>
                {booking.start_time.substring(0, 5)} -{' '}
                {booking.end_time.substring(0, 5)}
              </span>
            </div>

            {booking.resource && (
              <div className='flex items-center gap-1'>
                <UserIcon className='w-4 h-4 text-gray-400' />
                <span>
                  担当: {booking.resource.display_name || booking.resource.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 顧客情報 */}
        <div className='mb-3'>
          <div className='flex items-center gap-2 mb-1'>
            <UserIcon className='w-4 h-4 text-gray-400' />
            <span className='font-medium text-gray-900'>
              {booking.customer.name}
            </span>
            {booking.customer.loyalty_rank && (
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  booking.customer.loyalty_rank === 'vip' &&
                    'bg-purple-100 text-purple-800',
                  booking.customer.loyalty_rank === 'premium' &&
                    'bg-gold-100 text-gold-800',
                  booking.customer.loyalty_rank === 'regular' &&
                    'bg-blue-100 text-blue-800',
                  booking.customer.loyalty_rank === 'new' &&
                    'bg-green-100 text-green-800'
                )}
              >
                {booking.customer.loyalty_rank.toUpperCase()}
              </span>
            )}
          </div>
          {mode === 'detailed' && (
            <div className='flex items-center gap-2 text-sm text-gray-600 ml-6'>
              <PhoneIcon className='w-3 h-3' />
              <span>{booking.customer.phone}</span>
            </div>
          )}
        </div>

        {/* メニュー・リソース情報 */}
        <div className='mb-3 space-y-1'>
          <div className='flex items-center gap-2'>
            <TagIcon className='w-4 h-4 text-gray-400' />
            <span className='text-sm text-gray-700'>
              {booking.menu.name}
              {booking.options && booking.options.length > 0 && (
                <span className='text-xs text-gray-500 ml-1'>
                  (+{booking.options.length}オプション)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 料金情報 */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <CurrencyYenIcon className='w-4 h-4 text-gray-400' />
            <span className='font-medium text-gray-900'>
              ¥{booking.total_price.toLocaleString()}
            </span>
          </div>
          {booking.payment_status && (
            <span
              className={cn(
                'text-xs px-2 py-1 rounded',
                booking.payment_status === 'paid' &&
                  'bg-green-100 text-green-800',
                booking.payment_status === 'pending' &&
                  'bg-yellow-100 text-yellow-800',
                booking.payment_status === 'refunded' &&
                  'bg-gray-100 text-gray-800'
              )}
            >
              {booking.payment_status === 'paid' && '支払済'}
              {booking.payment_status === 'pending' && '未払い'}
              {booking.payment_status === 'refunded' && '返金済'}
            </span>
          )}
        </div>

        {/* 備考 */}
        {mode === 'detailed' && booking.customer_notes && (
          <div className='bg-gray-50 rounded p-2 text-sm text-gray-700'>
            <div className='flex items-start gap-1'>
              <ChatBubbleLeftIcon className='w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5' />
              <p className='line-clamp-2'>{booking.customer_notes}</p>
            </div>
          </div>
        )}

        {/* アクションボタン（詳細モードのみ） */}
        {mode === 'detailed' && (
          <div className='mt-4 flex gap-2'>
            {booking.status === 'pending' && (
              <>
                <Button variant='primary' size='sm' className='flex-1'>
                  確定する
                </Button>
                <Button variant='outline' size='sm' className='flex-1'>
                  キャンセル
                </Button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                <Button variant='primary' size='sm' className='flex-1'>
                  完了にする
                </Button>
                <Button variant='outline' size='sm' className='flex-1'>
                  変更
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookingCard;
