import React, { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import 'react-datepicker/dist/react-datepicker.css';

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

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
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
    },
    ref
  ) => {
    const sizeStyles: Record<string, string> = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
    };

    const CustomInput = forwardRef<HTMLInputElement, any>(
      ({ value, onClick, placeholder }, inputRef) => (
        <div className={cn('relative', fullWidth && 'w-full')}>
          <input
            ref={inputRef}
            value={value || ''}
            onClick={onClick}
            placeholder={placeholder}
            readOnly
            className={cn(
              'border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer',
              sizeStyles[size],
              fullWidth && 'w-full',
              error
                ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400'
                : disabled
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400',
              className
            )}
            disabled={disabled}
          />
          <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
            <CalendarIcon
              className={cn(
                'h-5 w-5',
                error
                  ? 'text-red-400'
                  : disabled
                  ? 'text-gray-300'
                  : 'text-gray-400'
              )}
            />
          </div>
        </div>
      )
    );

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

    const quickDates = getQuickDates();

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label className='block text-sm font-medium text-gray-700'>
            {label}
            {required && <span className='text-red-500 ml-1'>*</span>}
          </label>
        )}

        {showQuickSelect && (
          <div className='grid grid-cols-3 gap-2 mb-3'>
            {quickDates.map(({ label, date, dayOfWeek }) => {
              const isSelected =
                value && date.toDateString() === value.toDateString();
              const isDisabled =
                disabled ||
                (minDate && date < minDate) ||
                (maxDate && date > maxDate);

              return (
                <button
                  key={label}
                  type='button'
                  onClick={() => !isDisabled && onChange(date)}
                  disabled={isDisabled}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-100 text-primary-900'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-primary-300 text-gray-700'
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

        <div>
          {showQuickSelect && (
            <div className='text-xs text-gray-500 mb-2 text-center'>
              または下記カレンダーから選択
            </div>
          )}

          <ReactDatePicker
            selected={value}
            onChange={onChange}
            customInput={<CustomInput />}
            dateFormat='yyyy年MM月dd日'
            minDate={minDate}
            maxDate={maxDate}
            disabled={disabled}
            showPopperArrow={false}
            popperClassName='z-50'
            calendarClassName='shadow-lg border border-gray-200 rounded-lg'
          />
        </div>

        {error && errorMessage && (
          <p className='text-sm text-red-600'>{errorMessage}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
