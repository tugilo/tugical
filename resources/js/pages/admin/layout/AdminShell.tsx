/**
 * 管理画面共通シェル（モダンサイドバー + グラス AppBar）
 */
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  RestaurantMenu as RestaurantMenuIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useUIStore } from '../../../stores/uiStore';
import { useAuthStore } from '../../../stores/authStore';
import { adminColors, brandCardSx } from '../../../theme/adminTokens';
import AdminTopBarActions from './AdminTopBarActions';

const DRAWER_WIDTH = 272;

const NAV_ITEMS: {
  path: string;
  label: string;
  description: string;
  icon: React.ReactElement;
  requiresSettings?: boolean;
}[] = [
  { path: '/dashboard', label: 'ダッシュボード', description: '今日の予約と要対応', icon: <DashboardIcon /> },
  { path: '/bookings', label: '予約管理', description: '予約の確認・変更', icon: <EventIcon /> },
  { path: '/menus', label: 'メニュー管理', description: 'サービス・料金設定', icon: <RestaurantMenuIcon /> },
  { path: '/customers', label: '顧客管理', description: 'お客様情報', icon: <PeopleIcon /> },
  { path: '/resources', label: 'スタッフ・設備', description: '担当者と設備の管理', icon: <InventoryIcon /> },
  { path: '/settings', label: '設定', description: 'LINE 連携など', icon: <SettingsIcon />, requiresSettings: true },
];

const drawerPaperSx = {
  boxSizing: 'border-box' as const,
  width: DRAWER_WIDTH,
  borderRight: `1px solid ${adminColors.borderSubtle}`,
  boxShadow: 'none',
  bgcolor: 'background.paper',
};

const AdminShell: React.FC = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = useUIStore(s => s.pageTitle);
  const canManageSettings = useAuthStore(s => s.canManageSettings);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS.filter(
    item => !item.requiresSettings || canManageSettings()
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          mx: 1.5,
          mt: 1.5,
          mb: 2,
          p: 2,
          borderRadius: 2.5,
          ...brandCardSx,
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: adminColors.primary }}
        >
          tugical
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
          次の時間が、もっと自由になる。
        </Typography>
      </Box>

      <List aria-label="メインメニュー" sx={{ px: 1, flex: 1 }}>
        {navItems.map(item => {
          const selected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                if (!isMdUp) setMobileOpen(false);
              }}
              sx={{
                mb: 0.5,
                py: 1.25,
                borderRadius: 2,
                border: '1px solid transparent',
                ...(selected && {
                  bgcolor: adminColors.primaryMuted,
                  borderColor: adminColors.primaryBorder,
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '& .MuiListItemText-primary': { color: 'primary.dark', fontWeight: 700 },
                }),
                '&:hover': {
                  bgcolor: selected ? adminColors.primaryMuted : alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={selected ? undefined : item.description}
                primaryTypographyProps={{ fontSize: '0.9375rem' }}
                secondaryTypographyProps={{ fontSize: '0.6875rem', lineHeight: 1.3 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: isMdUp ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          ml: isMdUp ? `${DRAWER_WIDTH}px` : 0,
          backdropFilter: 'blur(10px)',
          bgcolor: alpha(adminColors.surface, 0.92),
          borderBottom: '1px solid',
          borderColor: adminColors.borderSubtle,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
            <IconButton
              aria-label="メニューを開く"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {pageTitle || 'tugical 管理画面'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                店舗運営ダッシュボード
              </Typography>
            </Box>
          </Box>
          <AdminTopBarActions />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { ...drawerPaperSx, pt: 7 },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { ...drawerPaperSx, pt: 8 },
        }}
        open
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isMdUp ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          p: { xs: 2, md: 3 },
          mt: { xs: 7, sm: 8 },
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          bgcolor: adminColors.canvas,
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminShell;
