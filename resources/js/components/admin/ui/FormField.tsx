/**
 * tugical 管理画面用 統一フォームフィールド（MUI TextField 実装）
 * tip: ⓘ で効果・意味を表示
 */
import React from 'react';
import { Box, TextField, MenuItem } from '@mui/material';
import FieldTip from './FieldTip';

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

  const labelNode = tip ? (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {label}
      {required ? ' *' : ''}
      <FieldTip tip={tip} label={`${label}の説明`} />
    </Box>
  ) : (
    label
  );

  // tip 付きのとき required はラベル側に出したので TextField の * は抑止
  const muiRequired = tip ? false : required;

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
    : (type as 'text' | 'email' | 'password' | 'number' | 'tel' | 'url');

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
      inputProps={type === 'number' ? { min, max, step } : undefined}
      FormHelperTextProps={{ sx: { marginTop: 0.25 } }}
    />
  );
};

export default FormField;
