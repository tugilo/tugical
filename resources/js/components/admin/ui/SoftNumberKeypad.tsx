import React, { useEffect, useState } from 'react';
import {
  BackspaceIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface SoftNumberKeypadProps {
  /** 表示中か */
  open: boolean;
  /** 閉じる */
  onClose: () => void;
  /** 確定時（number モードは number、digits モードは string） */
  onConfirm: (value: number | string) => void;
  /** 初期値 */
  value: number | string;
  /** number=金額など / digits=電話・郵便 */
  mode?: 'number' | 'digits';
  /** ラベル */
  label?: string;
  /** 最小（number） */
  min?: number;
  /** 最大（number） */
  max?: number;
  /** 小数を許可（number） */
  allowDecimal?: boolean;
  /** 負数を許可（number） */
  allowNegative?: boolean;
  /** 桁数上限（digits） */
  maxLength?: number;
  /** 単位表示（円・分など） */
  unit?: string;
}

/**
 * ソフトウェアテンキー（下部シート）
 * 数値・電話・郵便を共通UIで入力（フルキーボード不要）
 */
const SoftNumberKeypad: React.FC<SoftNumberKeypadProps> = ({
  open,
  onClose,
  onConfirm,
  value,
  mode = 'number',
  label = '数値入力',
  min,
  max,
  allowDecimal = false,
  allowNegative = false,
  maxLength,
  unit,
}) => {
  const isDigits = mode === 'digits';
  const [buffer, setBuffer] = useState(isDigits ? '' : '0');

  useEffect(() => {
    if (!open) return;
    if (isDigits) {
      const raw = String(value ?? '').replace(/[^0-9]/g, '');
      setBuffer(raw);
    } else {
      const n = typeof value === 'number' ? value : Number(value);
      setBuffer(Number.isFinite(n) ? String(n) : '0');
    }
  }, [open, value, isDigits]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const appendDigit = (digit: string) => {
    setBuffer(prev => {
      if (isDigits) {
        if (digit === '.') return prev;
        const next = `${prev}${digit}`;
        if (maxLength !== undefined && next.length > maxLength) return prev;
        return next;
      }

      if (prev === '0' && digit !== '.') return digit;
      if (prev === '-0' && digit !== '.') return `-${digit}`;
      if (digit === '.' && prev.includes('.')) return prev;
      if (digit === '.' && (prev === '' || prev === '-')) return `${prev}0.`;
      return `${prev}${digit}`;
    });
  };

  const backspace = () => {
    setBuffer(prev => {
      if (isDigits) {
        return prev.slice(0, -1);
      }
      if (prev.length <= 1 || prev === '-0' || prev === '-') return '0';
      const next = prev.slice(0, -1);
      return next === '-' || next === '' ? '0' : next;
    });
  };

  const clear = () => setBuffer(isDigits ? '' : '0');

  const toggleSign = () => {
    if (isDigits || !allowNegative) return;
    setBuffer(prev => {
      if (prev.startsWith('-')) return prev.slice(1) || '0';
      if (prev === '0') return '0';
      return `-${prev}`;
    });
  };

  const clamp = (n: number): number => {
    let v = n;
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  };

  const handleConfirm = () => {
    if (isDigits) {
      onConfirm(buffer);
      onClose();
      return;
    }
    const parsed = allowDecimal ? parseFloat(buffer) : parseInt(buffer, 10);
    const n = Number.isFinite(parsed) ? clamp(parsed) : clamp(0);
    onConfirm(n);
    onClose();
  };

  const leftKey =
    isDigits || (!allowDecimal && !allowNegative)
      ? {
          id: 'empty',
          label: '' as React.ReactNode,
          action: () => undefined,
          className: 'invisible pointer-events-none',
        }
      : allowDecimal
        ? {
            id: 'dot',
            label: '.' as React.ReactNode,
            action: () => appendDigit('.'),
            className: 'bg-gray-100',
          }
        : {
            id: 'sign',
            label: '±' as React.ReactNode,
            action: toggleSign,
            className: 'bg-gray-100',
          };

  const keys: Array<{
    id: string;
    label: React.ReactNode;
    action: () => void;
    className?: string;
  }> = [
    { id: '1', label: '1', action: () => appendDigit('1') },
    { id: '2', label: '2', action: () => appendDigit('2') },
    { id: '3', label: '3', action: () => appendDigit('3') },
    { id: '4', label: '4', action: () => appendDigit('4') },
    { id: '5', label: '5', action: () => appendDigit('5') },
    { id: '6', label: '6', action: () => appendDigit('6') },
    { id: '7', label: '7', action: () => appendDigit('7') },
    { id: '8', label: '8', action: () => appendDigit('8') },
    { id: '9', label: '9', action: () => appendDigit('9') },
    leftKey,
    { id: '0', label: '0', action: () => appendDigit('0') },
    {
      id: 'back',
      label: <BackspaceIcon className='w-6 h-6 mx-auto' />,
      action: backspace,
      className: 'bg-gray-100',
    },
  ];

  const displayBuffer = buffer === '' ? (isDigits ? '—' : '0') : buffer;

  return (
    <div className='fixed inset-0 z-[1400] flex items-end justify-center'>
      <button
        type='button'
        className='absolute inset-0 bg-black/40'
        aria-label='閉じる'
        onClick={onClose}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-label={label}
        className='relative w-full max-w-md rounded-t-2xl bg-white shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
      >
        <div className='flex items-center justify-between mb-3'>
          <div>
            <p className='text-sm font-medium text-gray-700'>{label}</p>
            <p className='text-3xl font-semibold text-gray-900 tabular-nums mt-1 break-all'>
              {displayBuffer}
              {unit ? (
                <span className='ml-2 text-base font-normal text-gray-500'>
                  {unit}
                </span>
              ) : null}
            </p>
            {isDigits && maxLength !== undefined && (
              <p className='text-xs text-gray-500 mt-1'>
                {buffer.length} / {maxLength} 桁
              </p>
            )}
            {!isDigits && (min !== undefined || max !== undefined) && (
              <p className='text-xs text-gray-500 mt-1'>
                {min !== undefined ? `最小 ${min}` : ''}
                {min !== undefined && max !== undefined ? ' 〜 ' : ''}
                {max !== undefined ? `最大 ${max}` : ''}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={onClose}
            className='min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100'
            aria-label='キャンセル'
          >
            <XMarkIcon className='w-6 h-6' />
          </button>
        </div>

        <div className='grid grid-cols-3 gap-2'>
          {keys.map(key => (
            <button
              key={key.id}
              type='button'
              onClick={key.action}
              className={`min-h-[56px] rounded-xl border border-gray-200 text-xl font-semibold text-gray-800 active:bg-emerald-50 active:border-emerald-300 ${
                key.className || 'bg-white'
              }`}
            >
              {key.label}
            </button>
          ))}
        </div>

        <div
          className={`grid gap-2 mt-3 ${
            !isDigits && allowNegative && allowDecimal
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {!isDigits && allowNegative && allowDecimal && (
            <button
              type='button'
              onClick={toggleSign}
              className='min-h-[52px] rounded-xl border border-gray-200 bg-gray-50 text-base font-medium text-gray-700'
            >
              ±
            </button>
          )}
          <button
            type='button'
            onClick={clear}
            className='min-h-[52px] rounded-xl border border-gray-200 bg-gray-50 text-base font-medium text-gray-700'
          >
            クリア
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            className='min-h-[52px] rounded-xl bg-emerald-600 text-white text-base font-semibold flex items-center justify-center gap-2 active:bg-emerald-700'
          >
            <CheckIcon className='w-5 h-5' />
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoftNumberKeypad;
