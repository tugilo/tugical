/**
 * tugical 管理画面用 確認ダイアログ（MUI Dialog 実装）
 * Phase 2: 自作 Modal 依存をやめ、MUI Dialog に置換。方針A: 背景クリックで閉じる → onClose（キャンセル相当）へ集約。
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DangerousIcon from '@mui/icons-material/Dangerous';

export interface ConfirmDialogProps {
  /** ダイアログの開閉状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数（キャンセル・背景クリック・Esc 時） */
  onClose: () => void;
  /** 確認時のコールバック */
  onConfirm: () => void;
  /** タイトル */
  title?: string;
  /** メッセージ */
  message: string;
  /** 確認ボタンのテキスト */
  confirmText?: string;
  /** キャンセルボタンのテキスト */
  cancelText?: string;
  /** 危険な操作かどうか */
  isDanger?: boolean;
  /** ローディング状態（二重送信防止） */
  isLoading?: boolean;
}

/**
 * 確認ダイアログ（MUI Dialog）
 * - 背景クリック・Esc で閉じた場合は onClose（キャンセル相当）を呼ぶ
 * - OK → onConfirm、Cancel → onClose
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '確認',
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  isDanger = false,
  isLoading = false,
}) => {
  const handleClose = (_event: object, reason: string) => {
    if (reason === 'backdropClick' && isLoading) return;
    onClose();
  };

  const handleConfirm = () => {
    if (!isLoading) onConfirm();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle id="confirm-dialog-title" component="div" sx={{ pt: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          {isDanger ? (
            <DangerousIcon sx={{ color: 'error.main', fontSize: 28 }} />
          ) : (
            <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 28 }} />
          )}
          <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</span>
        </div>
      </DialogTitle>
      <DialogContent>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
          {message}
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={isDanger ? 'error' : 'primary'}
          size="small"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? '処理中...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
