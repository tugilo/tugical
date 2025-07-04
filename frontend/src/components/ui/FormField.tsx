import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select';
  value: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/**
 * 統一フォームフィールドコンポーネント
 * 
 * ラベル、エラー表示、バリデーション状態を統合管理
 * text, number, textarea, select対応
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  min,
  max,
  step,
  className = '',
}) => {
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 text-gray-900 placeholder-gray-400'
    }
  `;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (type === 'number') {
      const stringValue = e.target.value;
      // 空文字列の場合は0を渡す（バリデーションエラーを避けるため）
      if (stringValue === '') {
        onChange(0);
      } else {
        const numValue = Number(stringValue);
        // NaNチェック - 有効な数値でない場合は現在の値を保持
        if (!isNaN(numValue)) {
          onChange(numValue);
        }
      }
    } else {
      onChange(e.target.value);
    }
  };

  // nullの場合は空文字列に変換、数値の場合は文字列に変換
  const displayValue = value === null ? '' : String(value);

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={displayValue}
            onChange={handleChange}
            required={required}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">選択してください</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={type}
            id={name}
            name={name}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {/* ラベル */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* 入力フィールド */}
      {renderInput()}

      {/* エラーメッセージ */}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField; 