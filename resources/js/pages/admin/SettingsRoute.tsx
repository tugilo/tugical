/**
 * 設定画面へのアクセスガード（can_manage_settings のみ許可）
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface SettingsRouteProps {
  children: React.ReactNode;
}

const SettingsRoute: React.FC<SettingsRouteProps> = ({ children }) => {
  const canManageSettings = useAuthStore(s => s.canManageSettings);

  if (!canManageSettings()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SettingsRoute;
