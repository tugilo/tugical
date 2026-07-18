import React, { useState } from 'react';
import SoftNumberKeypad from './SoftNumberKeypad';
import FieldLabel from './FieldLabel';

export type SoftDigitVariant = 'phone' | 'postal';

export interface SoftDigitFieldProps {
  /** 表示値（ハイフン込み可） */
  value: string;
  /** 変更（variant に応じて整形済み文字列） */
  onChange: (value: string) => void;
  /** phone / postal */
  variant: SoftDigitVariant;
  label?: string;
  tip?: string;
  name?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  startAdornment?: React.ReactNode;
  /** 郵便番号確定後など追加処理 */
  onAfterChange?: (formatted: string) => void;
}

/**
 * 電話番号・郵便番号用ソフトテンキーフィールド（全画面統一）
 */
const SoftDigitField: React.FC<SoftDigitFieldProps> = ({
  value,
  onChange,
  variant,
  label,
  tip,
  name,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  startAdornment,
  onAfterChange,
}) => {
  const [open, setOpen] = useState(false);

  const maxLength = variant === 'postal' ? 7 : 11;
  const defaultPlaceholder =
    variant === 'postal' ? 'タップして入力（例: 1234567）' : 'タップして入力';
  const defaultLabel = variant === 'postal' ? '郵便番号' : '電話番号';

  const formatValue = (digits: string): string => {
    const nums = digits.replace(/[^0-9]/g, '');
    if (variant === 'postal') {
      const t = nums.slice(0, 7);
      return t.length >= 4 ? `${t.slice(0, 3)}-${t.slice(3)}` : t;
    }
    // 電話: 数字のみ保存（表示はそのまま）
    return nums.slice(0, 11);
  };

  const handleConfirm = (raw: number | string) => {
    const digits = String(raw ?? '').replace(/[^0-9]/g, '');
    const formatted = formatValue(digits);
    onChange(formatted);
    onAfterChange?.(formatted);
  };

  const display = value?.trim() ? value : '';

  return (
    <div className={className}>
      {(label || tip) && (
        <FieldLabel
          label={label || defaultLabel}
          tip={tip}
          htmlFor={name}
          required={required}
          startAdornment={startAdornment}
        />
      )}
      <button
        type='button'
        id={name}
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={`w-full min-h-[44px] px-3 py-2 text-left rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        aria-label={`${label || defaultLabel}をテンキーで入力`}
      >
        <span
          className={`tabular-nums text-base ${
            display === '' ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {display === '' ? placeholder || defaultPlaceholder : display}
        </span>
      </button>
      {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}

      <SoftNumberKeypad
        open={open}
        onClose={() => setOpen(false)}
        mode='digits'
        value={String(value ?? '').replace(/[^0-9]/g, '')}
        onConfirm={handleConfirm}
        label={label || defaultLabel}
        maxLength={maxLength}
      />
    </div>
  );
};

export default SoftDigitField;
