/**
 * tugical 管理画面用 汎用モーダル（MUI Dialog 実装）
 * Phase 2: 自作を MUI Dialog に置換。方針A: 背景クリック・Esc で閉じる。閉じる導線は onClose に集約。
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface ModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数（背景クリック・Esc・閉じるボタンいずれもここに集約） */
  onClose: () => void;
  /** モーダルのタイトル */
  title?: string;
  /** モーダルのサイズ */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 閉じるボタンを表示するか */
  showCloseButton?: boolean;
  /** オーバーレイクリックで閉じるか（方針A: デフォルト true） */
  closeOnOverlayClick?: boolean;
  /** ESCキーで閉じるか */
  closeOnEsc?: boolean;
  /** 子要素 */
  children: React.ReactNode;
  /** フッター要素 */
  footer?: React.ReactNode;
  /** 追加のクラス名（Paper に渡す） */
  className?: string;
}

const sizeToMaxWidth: Record<string, 'xs' | 'sm' | 'md' | 'lg' | 'xl'> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

/**
 * 汎用モーダル（MUI Dialog ラッパー）
 * - 背景クリック・Esc で閉じる（方針A）
 * - すべての閉じる操作で onClose を呼ぶ
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  children,
  footer,
  className,
}) => {
  const handleClose = (_event: object, reason: string) => {
    if (reason === 'backdropClick' && !closeOnOverlayClick) return;
    if (reason === 'escapeKeyDown' && !closeOnEsc) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={sizeToMaxWidth[size] ?? 'sm'}
      fullWidth
      // SoftNumberKeypad 等の portal オーバーレイ操作を許可
      disableEnforceFocus
      disableAutoFocus
      PaperProps={{
        className,
        sx: { borderRadius: 2 },
      }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)' } },
      }}
    >
      {(title || showCloseButton) && (
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          {title && (
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</span>
          )}
          {showCloseButton && (
            <IconButton
              aria-label="モーダルを閉じる"
              onClick={() => onClose()}
              size="small"
              sx={{ ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent
        dividers={!!footer}
        sx={{
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        {children}
      </DialogContent>
      {footer && <DialogActions sx={{ px: 3, py: 2 }}>{footer}</DialogActions>}
    </Dialog>
  );
};

export default Modal;
