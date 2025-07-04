import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showQuickSelect?: boolean;
  className?: string;
}

/**
 * tugical完全カスタムDatePickerコンポーネント
 *
 * 特徴:
 * - tugicalデザインシステム100%準拠
 * - 美容師さんの片手操作対応
 * - 大きなタッチターゲット（44px以上）
 * - 今日・明日・明後日クイック選択
 * - 美しいカレンダーUI
 * - 日本語完全対応
 */
const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = '日付を選択',
  error = false,
  errorMessage,
  label,
  required = false,
  size = 'md',
  fullWidth = false,
  disabled = false,
  minDate,
  maxDate,
  showQuickSelect = true,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // サイズ別スタイル
  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  // 外部クリックでカレンダーを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // クイック選択日付を生成
  const getQuickDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    return [
      {
        label: '今日',
        date: today,
        dayOfWeek: today.toLocaleDateString('ja-JP', { weekday: 'short' }),
      },
      {
        label: '明日',
        date: tomorrow,
        dayOfWeek: tomorrow.toLocaleDateString('ja-JP', { weekday: 'short' }),
      },
      {
        label: '明後日',
        date: dayAfterTomorrow,
        dayOfWeek: dayAfterTomorrow.toLocaleDateString('ja-JP', {
          weekday: 'short',
        }),
      },
    ];
  };

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // カレンダーの開始日（前月の日曜日から）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // カレンダーの終了日（翌月の土曜日まで）
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // 日付選択処理
  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  // 月移動
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // 日付が選択可能かチェック
  const isDateSelectable = (date: Date) => {
    if (disabled) return false;
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  // 日付フォーマット
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const quickDates = getQuickDates();
  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div ref={containerRef} className={cn('relative', fullWidth && 'w-full')}>
      {/* ラベル */}
      {label && (
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      {/* クイック選択ボタン */}
      {showQuickSelect && (
        <div className='grid grid-cols-3 gap-2 mb-3'>
          {quickDates.map(({ label, date, dayOfWeek }) => {
            const isSelected =
              value && date.toDateString() === value.toDateString();
            const isDisabled = !isDateSelectable(date);

            return (
              <button
                key={label}
                type='button'
                onClick={() => !isDisabled && handleDateSelect(date)}
                disabled={isDisabled}
                className={cn(
                  'p-3 rounded-lg border-2 text-center transition-all font-medium',
                  isSelected
                    ? 'border-primary-500 bg-primary-100 text-primary-900 shadow-md'
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 text-gray-700 shadow-sm hover:shadow-md'
                )}
              >
                <div className='font-bold text-sm'>{label}</div>
                <div className='text-xs text-gray-600'>
                  {date.getDate()}日({dayOfWeek})
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* メイン入力フィールド */}
      <div className='relative'>
        <button
          type='button'
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-left flex items-center justify-between',
            sizeStyles[size],
            error
              ? 'border-red-300 bg-red-50 text-red-900'
              : disabled
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 bg-white text-gray-900 hover:border-primary-400 hover:shadow-md',
            className
          )}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? formatDate(value) : placeholder}
          </span>
          <CalendarIcon
            className={cn(
              'h-5 w-5 transition-colors',
              error
                ? 'text-red-400'
                : disabled
                ? 'text-gray-300'
                : 'text-gray-400'
            )}
          />
        </button>

        {/* カレンダードロップダウン */}
        {isOpen && !disabled && (
          <div className='absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4'>
            {/* カレンダーヘッダー */}
            <div className='flex items-center justify-between mb-4'>
              <button
                type='button'
                onClick={() => navigateMonth('prev')}
                className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
              >
                <ChevronLeftIcon className='w-5 h-5 text-gray-600' />
              </button>

              <h3 className='text-lg font-semibold text-gray-900'>
                {currentMonth.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                })}
              </h3>

              <button
                type='button'
                onClick={() => navigateMonth('next')}
                className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
              >
                <ChevronRightIcon className='w-5 h-5 text-gray-600' />
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className='grid grid-cols-7 gap-1 mb-2'>
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    'p-2 text-center text-sm font-medium',
                    index === 0
                      ? 'text-red-500'
                      : index === 6
                      ? 'text-blue-500'
                      : 'text-gray-600'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className='grid grid-cols-7 gap-1'>
              {calendarDays.map((date, index) => {
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const isToday = date.toDateString() === today.toDateString();
                const isSelected =
                  value && date.toDateString() === value.toDateString();
                const isSelectable = isDateSelectable(date);
                const dayOfWeek = date.getDay();

                return (
                  <button
                    key={index}
                    type='button'
                    onClick={() =>
                      isSelectable && isCurrentMonth && handleDateSelect(date)
                    }
                    disabled={!isSelectable || !isCurrentMonth}
                    className={cn(
                      'p-2 text-center text-sm rounded-lg transition-all font-medium min-h-[44px] flex items-center justify-center',
                      !isCurrentMonth
                        ? 'text-gray-300 cursor-default'
                        : !isSelectable
                        ? 'text-gray-300 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary-500 text-white shadow-md'
                        : isToday
                        ? 'bg-primary-100 text-primary-900 font-bold border-2 border-primary-300'
                        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700',
                      dayOfWeek === 0 && isCurrentMonth && 'text-red-600',
                      dayOfWeek === 6 && isCurrentMonth && 'text-blue-600'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* フッター */}
            <div className='mt-4 pt-3 border-t border-gray-100 flex justify-between items-center'>
              <button
                type='button'
                onClick={() => handleDateSelect(new Date())}
                className='text-sm text-primary-600 hover:text-primary-700 font-medium'
              >
                今日を選択
              </button>
              <button
                type='button'
                onClick={() => setIsOpen(false)}
                className='px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100'
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && errorMessage && (
        <p className='text-sm text-red-600 mt-2'>{errorMessage}</p>
      )}
    </div>
  );
};

export default DatePicker;
