/**
 * 管理画面用 MUI Button 互換ラッパー（Phase 4）
 * 既存 Button の variant / size / leftIcon / loading を維持しつつ中身を MUI に統一
 */
import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type AppButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AppButtonProps {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantMap: Record<AppButtonVariant, 'contained' | 'outlined' | 'text'> = {
  primary: 'contained',
  secondary: 'contained',
  outline: 'outlined',
  ghost: 'text',
  danger: 'contained',
};

const colorMap: Record<AppButtonVariant, 'primary' | 'secondary' | 'error' | 'inherit'> = {
  primary: 'primary',
  secondary: 'secondary',
  outline: 'primary',
  ghost: 'inherit',
  danger: 'error',
};

const sizeMap: Record<AppButtonSize, 'small' | 'medium' | 'large'> = {
  xs: 'small',
  sm: 'small',
  md: 'medium',
  lg: 'large',
  xl: 'large',
};

/**
 * 既存 Button と互換の MUI Button ラッパー
 */
const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  children,
  type = 'button',
  className,
}) => {
  const muiVariant = variantMap[variant];
  const muiColor = colorMap[variant];
  const muiSize = sizeMap[size];

  const startIcon = loading ? (
    <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
  ) : (
    leftIcon
  );
  const endIcon = rightIcon;

  return (
    <MuiButton
      variant={muiVariant}
      color={muiColor}
      size={muiSize}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      type={type}
      onClick={onClick}
      className={className}
      startIcon={startIcon ?? undefined}
      endIcon={endIcon ?? undefined}
      disableElevation
    >
      {children}
    </MuiButton>
  );
};

export default AppButton;
