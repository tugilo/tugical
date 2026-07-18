/**
 * tugical 管理画面用 統一フォームフィールド（MUI TextField 実装）
 * tip: ⓘ で効果・意味を表示
 * number: ソフトウェアテンキー入力（SoftNumberField）
 */
import React from 'react';
import { Box, TextField, MenuItem } from '@mui/material';
import FieldTip from './FieldTip';
import SoftDigitField from './SoftDigitField';
import SoftNumberField from './SoftNumberField';

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
  /** ⓘ TIPS（効果・意味の説明） */
  tip?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  /** 数値の単位表示（円・分など） */
  unit?: string;
  className?: string;
}

/**
 * 統一フォームフィールド（MUI TextField ラッパー）
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  tip,
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  min,
  max,
  step,
  unit,
  className = '',
}) => {
  const displayValue = value === null ? '' : String(value);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);
  };

  const hasError = Boolean(error);
  const helperText = error || ' ';

  const labelNode = tip ? (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {label}
      {required ? ' *' : ''}
      <FieldTip tip={tip} label={`${label}の説明`} />
    </Box>
  ) : (
    label
  );

  const muiRequired = tip ? false : required;

  // 数値はソフトテンキー（OSキーボード非表示）
  if (type === 'number') {
    const numValue =
      typeof value === 'number'
        ? value
        : value === null || value === ''
          ? 0
          : Number(value) || 0;

    return (
      <SoftNumberField
        name={name}
        label={label}
        tip={tip}
        value={numValue}
        onChange={v => onChange(v)}
        placeholder={placeholder || 'タップして入力'}
        error={error || undefined}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        unit={unit}
        className={className}
      />
    );
  }

  // 電話番号もソフトテンキーに統一
  if (type === 'tel') {
    return (
      <SoftDigitField
        name={name}
        variant='phone'
        label={label}
        tip={tip}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={v => onChange(v)}
        placeholder={placeholder || 'タップして入力'}
        error={error || undefined}
        required={required}
        disabled={disabled}
        className={className}
      />
    );
  }

  if (type === 'select') {
    return (
      <TextField
        id={name}
        name={name}
        label={labelNode}
        value={displayValue}
        onChange={e => onChange(e.target.value)}
        required={muiRequired}
        disabled={disabled}
        error={hasError}
        helperText={helperText}
        fullWidth
        size='small'
        select
        variant='outlined'
        className={className}
        sx={{ mb: 0 }}
        InputLabelProps={
          tip ? { shrink: true, required: false } : { required: muiRequired }
        }
        FormHelperTextProps={{ sx: { marginTop: 0.25 } }}
      >
        <MenuItem value=''>選択してください</MenuItem>
        {options.map(opt => (
          <MenuItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const isMultiline = type === 'textarea';
  const inputType = isMultiline
    ? undefined
    : (type as 'text' | 'email' | 'password' | 'url' | 'date');

  return (
    <TextField
      id={name}
      name={name}
      label={labelNode}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      required={muiRequired}
      disabled={disabled}
      error={hasError}
      helperText={helperText}
      fullWidth
      size='small'
      variant='outlined'
      type={inputType}
      multiline={isMultiline}
      rows={isMultiline ? rows : undefined}
      className={className}
      sx={{ mb: 0 }}
      InputLabelProps={
        tip
          ? { shrink: true, required: false }
          : type === 'date'
            ? { shrink: true, required: muiRequired }
            : { required: muiRequired }
      }
      FormHelperTextProps={{ sx: { marginTop: 0.25 } }}
    />
  );
};

export default FormField;
