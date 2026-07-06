/**
 * 管理画面共通シェル（AppBar + 左 Drawer ナビ）
 * ログイン後の全ページをラップし、主要ページへの導線を提供する。
 * basename="/admin" 前提で navigate('/menus') は /admin/menus になる。
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

const DRAWER_WIDTH = 240;

const NAV_ITEMS: { path: string; label: string; icon: React.ReactElement }[] = [
  { path: '/dashboard', label: 'ダッシュボード', icon: <DashboardIcon /> },
  { path: '/bookings', label: '予約管理', icon: <EventIcon /> },
  { path: '/menus', label: 'メニュー管理', icon: <RestaurantMenuIcon /> },
  { path: '/customers', label: '顧客管理', icon: <PeopleIcon /> },
  { path: '/resources', label: 'リソース管理', icon: <InventoryIcon /> },
  { path: '/settings', label: '設定', icon: <SettingsIcon /> },
];

/**
 * 管理画面シェル：AppBar + 左 Drawer（md以上は固定、sm以下は一時表示）
 */
const AdminShell: React.FC = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box sx={{ pt: 1 }}>
      <List>
        {NAV_ITEMS.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                if (!isMdUp) setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: selected ? 'primary.main' : undefined }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
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
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: isMdUp ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          ml: isMdUp ? `${DRAWER_WIDTH}px` : 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="メニューを開く"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            tugical 管理画面
          </Typography>
        </Toolbar>
      </AppBar>

      {/* モバイル用一時 Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            pt: 8,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* md以上：常時表示 Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            pt: 8,
            borderRight: 1,
            borderColor: 'divider',
          },
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
          p: 2,
          mt: 8,
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminShell;
