/**
 * 管理画面グローバルヘッダー（通知・ユーザー・ログアウト）
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  NotificationsNone as NotificationsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../../stores/authStore';
import { toast, useUIStore } from '../../../stores/uiStore';
import { notificationApi } from '../../../services/api';
import { getUserRoleLabel } from '../../../index';
import { adminColors } from '../../../theme/adminTokens';
import type { Notification } from '../../../types';

const getInitials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatNotificationTime = (value?: string): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const notificationStatusLabel: Record<Notification['status'], string> = {
  pending: '送信待ち',
  sent: '送信済み',
  failed: '失敗',
  cancelled: 'キャンセル',
};

const AdminTopBarActions: React.FC = () => {
  const navigate = useNavigate();
  const { user, store, logout } = useAuthStore();
  const toastNotifications = useUIStore(s => s.notifications);

  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [notifyAnchor, setNotifyAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const badgeCount = useMemo(() => {
    const failed = failedCount > 0 ? failedCount : 0;
    const live = toastNotifications.length;
    return Math.max(failed, live);
  }, [failedCount, toastNotifications.length]);

  const loadNotificationSummary = useCallback(async () => {
    try {
      const result = await notificationApi.getList({ per_page: 1, page: 1 });
      setFailedCount(result.stats?.failed_count ?? 0);
    } catch {
      setFailedCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifyLoading(true);
    setNotifyError(null);
    try {
      const result = await notificationApi.getList({ per_page: 10, page: 1 });
      setNotifications(result.notifications ?? []);
      setFailedCount(result.stats?.failed_count ?? 0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '通知の取得に失敗しました';
      setNotifyError(message);
      setNotifications([]);
    } finally {
      setNotifyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotificationSummary();
  }, [loadNotificationSummary]);

  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotifyAnchor(event.currentTarget);
    void loadNotifications();
  };

  const handleLogout = async () => {
    setUserAnchor(null);
    try {
      await logout();
      toast.success('ログアウトしました', 'またのご利用をお待ちしております');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('ログアウトエラー:', error);
      toast.error('ログアウトエラー', 'セッションはクリアされました');
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <Tooltip title="通知">
          <IconButton
            aria-label="通知"
            onClick={handleOpenNotifications}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <Badge badgeContent={badgeCount} color="error" max={99} invisible={badgeCount === 0}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="アカウント">
          <IconButton
            aria-label="アカウントメニュー"
            onClick={e => setUserAnchor(e.currentTarget)}
            size="small"
            sx={{ ml: 0.5 }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: adminColors.primary,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: 'none', md: 'block' }, ml: 0.5, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {user?.name ?? 'ユーザー'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {store?.name ?? '店舗未設定'}
          </Typography>
        </Box>
      </Stack>

      <Popover
        open={Boolean(notifyAnchor)}
        anchorEl={notifyAnchor}
        onClose={() => setNotifyAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '95vw', mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: adminColors.borderSubtle }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            通知
          </Typography>
          <Typography variant="caption" color="text.secondary">
            直近の配信履歴（最大10件）
          </Typography>
        </Box>

        {notifyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifyError ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="error">
              {notifyError}
            </Typography>
          </Box>
        ) : notifications.length === 0 && toastNotifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              通知はありません
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {toastNotifications.map(item => (
              <ListItem key={item.id} divider>
                <ListItemText
                  primary={item.title}
                  secondary={item.message ?? undefined}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
            {notifications.map(item => {
              const createdAt =
                (item as Notification & { timestamps?: { created_at?: string } }).timestamps?.created_at ??
                item.created_at;
              return (
              <ListItem key={item.id} divider>
                <ListItemText
                  primary={item.title}
                  secondary={`${notificationStatusLabel[item.status] ?? item.status} · ${formatNotificationTime(createdAt)}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            );})}
          </List>
        )}
      </Popover>

      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {user?.name ?? 'ユーザー'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {store?.name} · {getUserRoleLabel(user?.role ?? 'staff')}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          ログアウト
        </MenuItem>
      </Menu>
    </>
  );
};

export default AdminTopBarActions;
