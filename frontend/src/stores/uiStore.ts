/**
 * tugical Admin Dashboard UIストア
 * 
 * 機能:
 * - サイドバー開閉状態
 * - ローディング状態
 * - Toast通知管理
 * - テーマ設定
 * - モーダル状態
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, ToastNotification } from '../types';

interface UIStore extends UIState {
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Toast通知
  addNotification: (notification: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // モーダル管理
  modals: Record<string, boolean>;
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  closeAllModals: () => void;
  
  // ページ状態
  pageTitle: string;
  setPageTitle: (title: string) => void;
  
  // フィルター状態（各ページ共通）
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
}

/**
 * UIストア
 * ユーザー設定は永続化、一時的な状態は非永続化
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      sidebarOpen: true,
      theme: 'light',
      loading: false,
      notifications: [],
      modals: {},
      pageTitle: 'tugical管理画面',
      filters: {},

      /**
       * サイドバー開閉設定
       */
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      /**
       * サイドバー開閉切り替え
       */
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      /**
       * ローディング状態設定
       */
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      /**
       * テーマ設定
       */
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        
        // HTMLのdata-theme属性も更新
        document.documentElement.setAttribute('data-theme', theme);
      },

      /**
       * Toast通知追加
       */
      addNotification: (notification: Omit<ToastNotification, 'id'>) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newNotification: ToastNotification = {
          ...notification,
          id,
          duration: notification.duration || 5000,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // 自動削除
        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },

      /**
       * Toast通知削除
       */
      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      /**
       * 全通知クリア
       */
      clearNotifications: () => {
        set({ notifications: [] });
      },

      /**
       * モーダル開く
       */
      openModal: (modalName: string) => {
        set((state) => ({
          modals: { ...state.modals, [modalName]: true },
        }));
      },

      /**
       * モーダル閉じる
       */
      closeModal: (modalName: string) => {
        set((state) => ({
          modals: { ...state.modals, [modalName]: false },
        }));
      },

      /**
       * 全モーダル閉じる
       */
      closeAllModals: () => {
        set({ modals: {} });
      },

      /**
       * ページタイトル設定
       */
      setPageTitle: (title: string) => {
        set({ pageTitle: title });
        
        // ブラウザタイトルも更新
        document.title = `${title} - tugical`;
      },

      /**
       * フィルター設定
       */
      setFilter: (key: string, value: any) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },

      /**
       * フィルタークリア
       */
      clearFilters: () => {
        set({ filters: {} });
      },
    }),
    {
      name: 'tugical-ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        // 通知やモーダル状態は永続化しない
      }),
    }
  )
);

/**
 * Toast通知用ヘルパー関数
 */
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useUIStore.getState().addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  },
  
  error: (title: string, message?: string, duration?: number) => {
    useUIStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 7000, // エラーは少し長めに表示
    });
  },
  
  warning: (title: string, message?: string, duration?: number) => {
    useUIStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  },
  
  info: (title: string, message?: string, duration?: number) => {
    useUIStore.getState().addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  },
}; 