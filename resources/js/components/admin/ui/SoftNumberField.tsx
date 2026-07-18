import React, { useState } from 'react';
import SoftNumberKeypad from './SoftNumberKeypad';
import FieldLabel from './FieldLabel';

export interface SoftNumberFieldProps {
  /** 現在値 */
  value: number;
  /** 変更 */
  onChange: (value: number) => void;
  /** ラベル */
  label?: string;
  /** tip */
  tip?: string;
  /** name / id */
  name?: string;
  /** プレースホルダ */
  placeholder?: string;
  /** エラー */
  error?: string;
  /** 無効 */
  disabled?: boolean;
  /** 必須 */
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** 単位（円・分・円/時 など） */
  unit?: string;
  /** 追加クラス */
  className?: string;
  /** ラベル左装飾 */
  startAdornment?: React.ReactNode;
}

/**
 * ソフトテンキー入力の数値フィールド
 * タップでテンキーを開き、OSキーボードは出さない（readOnly）
 */
const SoftNumberField: React.FC<SoftNumberFieldProps> = ({
  value,
  onChange,
  label,
  tip,
  name,
  placeholder = 'タップして入力',
  error,
  disabled = false,
  required = false,
  min,
  max,
  step,
  unit,
  className = '',
  startAdornment,
}) => {
  const [open, setOpen] = useState(false);
  const allowDecimal = typeof step === 'number' && step % 1 !== 0;
  const allowNegative = min === undefined || min < 0;

  const display =
    value === null || value === undefined || Number.isNaN(value)
      ? ''
      : String(value);

  return (
    <div className={className}>
      {label && (
        <FieldLabel
          label={label}
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
        aria-label={label ? `${label}をテンキーで入力` : '数値をテンキーで入力'}
      >
        <span className='flex items-center justify-between gap-2'>
          <span
            className={`tabular-nums text-base ${
              display === '' ? 'text-gray-400' : 'text-gray-900'
            }`}
          >
            {display === '' ? placeholder : display}
          </span>
          {unit && (
            <span className='text-sm text-gray-500 shrink-0'>{unit}</span>
          )}
        </span>
      </button>
      {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}

      <SoftNumberKeypad
        open={open}
        onClose={() => setOpen(false)}
        mode='number'
        onConfirm={v => onChange(typeof v === 'number' ? v : Number(v) || 0)}
        value={typeof value === 'number' && !Number.isNaN(value) ? value : 0}
        label={label || '数値入力'}
        min={min}
        max={max}
        allowDecimal={allowDecimal}
        allowNegative={allowNegative}
        unit={unit}
      />
    </div>
  );
};

export default SoftNumberField;
