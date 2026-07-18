/**
 * tugical 管理画面用 DatePicker（MUI 実装）
 * Phase 1: 自作を MUI @mui/x-date-pickers に置換。既存の value/onChange/label/error 等の props を互換維持。
 */
import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { ja } from 'date-fns/locale';

export interface DatePickerProps {
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
 * 管理画面用 DatePicker（MUI ラッパー）
 * - LocalizationProvider + AdapterDateFns（date-fns v3）で日本語対応
 * - 既存呼び出し側の props をそのまま受け付ける
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
  showQuickSelect: _showQuickSelect,
  className,
}) => {
  const muiSize = size === 'lg' ? 'medium' : size === 'sm' ? 'small' : 'medium';

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={ja}
    >
      <MuiDatePicker
        value={value ?? null}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        // デフォルトは day/year のみで月は矢印送りだけになる。
        // month を含めるとヘッダから月グリッドを開ける（v6: day→year→month とトグル）
        views={['year', 'month', 'day']}
        openTo='day'
        slotProps={{
          textField: {
            label: label ?? undefined,
            required,
            error,
            helperText: errorMessage,
            placeholder,
            size: muiSize,
            fullWidth,
            className,
            margin: 'none',
          },
        }}
        sx={{ width: fullWidth ? '100%' : undefined }}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;
