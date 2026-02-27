/**
 * tugical Admin Dashboard メインレイアウト
 * 
 * 機能:
 * - サイドバーナビゲーション
 * - ヘッダー（ユーザー情報、ログアウト）
 * - メインコンテンツエリア
 * - レスポンシブデザイン
 * - サイドバー開閉制御
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CalendarDaysIcon,
  UsersIcon,
  BuildingOfficeIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { toast } from '../../stores/uiStore';
import { getUserRoleLabel } from '../../../utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description: string;
}

/**
 * ナビゲーション項目定義
 */
const navigation: NavigationItem[] = [
  {
    name: 'ダッシュボード',
    href: '/dashboard',
    icon: HomeIcon,
    description: '今日の予約と売上概要',
  },
  {
    name: '予約管理',
    href: '/bookings',
    icon: CalendarDaysIcon,
    description: '予約の確認・編集・作成',
  },
  {
    name: '顧客管理',
    href: '/customers',
    icon: UsersIcon,
    description: '顧客情報とロイヤリティ管理',
  },
  {
    name: 'スタッフ・リソース',
    href: '/resources',
    icon: BuildingOfficeIcon,
    description: 'スタッフと設備の管理',
  },
  {
    name: 'メニュー管理',
    href: '/menus',
    icon: Squares2X2Icon,
    description: 'サービスメニューと料金設定',
  },
  {
    name: '設定',
    href: '/settings',
    icon: Cog6ToothIcon,
    description: '店舗設定と通知管理',
  },
];

/**
 * サイドバーコンポーネント
 */
const Sidebar: React.FC<{ isMobile?: boolean; onClose?: () => void }> = ({
  isMobile = false,
  onClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, store } = useAuthStore();

  const handleNavigation = (href: string) => {
    navigate(href);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* ロゴエリア */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-primary-600">tugical</h1>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* 店舗情報 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="text-sm">
          <p className="font-medium text-gray-900">{store?.name}</p>
          <p className="text-gray-500">{getUserRoleLabel(user?.role || 'staff')}</p>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const IconComponent = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <IconComponent
                className={`mr-3 h-5 w-5 ${
                  isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              <div className="text-left">
                <div>{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* ユーザー情報とログアウト */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center px-3 py-2 text-sm">
          <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ヘッダーコンポーネント
 */
const Header: React.FC = () => {
  const { logout, user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, pageTitle } = useUIStore();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('ログアウトしました', 'またのご利用をお待ちしております');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      toast.error('ログアウトエラー', 'エラーが発生しましたが、セッションはクリアされました');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* モバイルメニューボタン */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* ページタイトル */}
          <h1 className="ml-4 text-xl font-semibold text-gray-900 lg:ml-0">
            {pageTitle}
          </h1>
        </div>

        {/* ユーザーメニュー */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-700">
            <UserCircleIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="hidden sm:block">{user?.name}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            title="ログアウト"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

/**
 * メインレイアウトコンポーネント
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* デスクトップサイドバー */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${
        sidebarOpen ? 'lg:w-80' : 'lg:w-0'
      }`}>
        <div className="w-80">
          {sidebarOpen && <Sidebar />}
        </div>
      </div>

      {/* モバイルサイドバーオーバーレイ */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-80 lg:hidden"
            >
              <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* メインコンテンツエリア */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 