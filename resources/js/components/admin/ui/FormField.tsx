/**
 * tugical 管理画面用 統一フォームフィールド（MUI TextField 実装）
 * Phase 3: 内部を MUI TextField / Select に置換。呼び出し側の props は互換維持。
 */
import React from 'react';
import { TextField, MenuItem } from '@mui/material';

export interface FormFieldProps {
  label: string;
  name: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'textarea'
    | 'select';
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
 * 統一フォームフィールド（MUI TextField ラッパー）
 * - text / number / textarea / select 対応
 * - onChange は (value) => void のまま互換
 * - error は MUI の error + helperText にマッピング
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
  const displayValue = value === null ? '' : String(value);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const raw = e.target.value;
    if (type === 'number') {
      if (raw === '') {
        onChange(0);
      } else {
        const num = Number(raw);
        if (!Number.isNaN(num)) onChange(num);
      }
    } else {
      onChange(raw);
    }
  };

  const hasError = Boolean(error);
  const helperText = error || ' ';

  if (type === 'select') {
    return (
      <TextField
        id={name}
        name={name}
        label={label}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        error={hasError}
        helperText={helperText}
        fullWidth
        size="small"
        select
        variant="outlined"
        className={className}
        sx={{ mb: 0 }}
        FormHelperTextProps={{ sx: { marginTop: 0.25 } }}
      >
        <MenuItem value="">選択してください</MenuItem>
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const isMultiline = type === 'textarea';
  const inputType = isMultiline ? undefined : (type as 'text' | 'email' | 'password' | 'number' | 'tel' | 'url');

  return (
    <TextField
      id={name}
      name={name}
      label={label}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      error={hasError}
      helperText={helperText}
      fullWidth
      size="small"
      variant="outlined"
      type={inputType}
      multiline={isMultiline}
      rows={isMultiline ? rows : undefined}
      className={className}
      sx={{ mb: 0 }}
      inputProps={
        type === 'number'
          ? { min, max, step }
          : undefined
      }
      FormHelperTextProps={{ sx: { marginTop: 0.25 } }}
    />
  );
};

export default FormField;
