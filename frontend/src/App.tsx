/**
 * tugical Admin Dashboard メインアプリケーション
 * 
 * 機能:
 * - React Router によるルーティング
 * - 認証ガード
 * - ストア初期化
 * - Toast通知システム
 * - グローバルローディング
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import ToastContainer from './components/ui/ToastContainer';
import LoadingScreen from './components/ui/LoadingScreen';

// ページコンポーネント（後で実装）
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'));
const BookingsPage = React.lazy(() => import('./pages/bookings/BookingsPage'));
const CustomersPage = React.lazy(() => import('./pages/customers/CustomersPage'));
const ResourcesPage = React.lazy(() => import('./pages/resources/ResourcesPage'));
const MenusPage = React.lazy(() => import('./pages/menus/MenusPage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));

/**
 * 認証が必要なルートのガードコンポーネント
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * 認証済みユーザーのリダイレクト
 */
const AuthenticatedRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * メインアプリケーションコンポーネント
 */
const App: React.FC = () => {
  const { checkAuth, isLoading } = useAuthStore();
  const { setPageTitle } = useUIStore();

  // アプリ初期化
  useEffect(() => {
    // 認証状態確認
    checkAuth();
    
    // 初期ページタイトル設定
    setPageTitle('tugical管理画面');
  }, [checkAuth, setPageTitle]);

  // 初期ローディング中
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="App">
        <AnimatePresence mode="wait">
          <Routes>
            {/* 認証ページ */}
            <Route
              path="/login"
              element={
                <AuthenticatedRedirect>
                  <LoginPage />
                </AuthenticatedRedirect>
              }
            />

            {/* 保護されたルート */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <React.Suspense fallback={<LoadingScreen />}>
                      <Routes>
                        {/* ダッシュボード */}
                        <Route path="/dashboard" element={<DashboardPage />} />
                        
                        {/* 予約管理 */}
                        <Route path="/bookings" element={<BookingsPage />} />
                        
                        {/* 顧客管理 */}
                        <Route path="/customers" element={<CustomersPage />} />
                        
                        {/* リソース管理 */}
                        <Route path="/resources" element={<ResourcesPage />} />
                        
                        {/* メニュー管理 */}
                        <Route path="/menus" element={<MenusPage />} />
                        
                        {/* 設定 */}
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        {/* デフォルトリダイレクト */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        
                        {/* 404 */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </React.Suspense>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>

        {/* Toast通知システム */}
        <ToastContainer />
      </div>
    </Router>
  );
};

export default App;
