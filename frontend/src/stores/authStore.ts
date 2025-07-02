/**
 * tugical Admin Dashboard 認証ストア
 * 
 * 機能:
 * - ログイン状態管理
 * - ユーザー情報・店舗情報保持
 * - 権限管理
 * - 永続化対応
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Store, LoginRequest, LoginResponse, AuthState } from '../types';
import { authApi } from '../services/api';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  
  // Computed
  hasPermission: (permission: string) => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  canManageUsers: () => boolean;
  canManageSettings: () => boolean;
  canViewAnalytics: () => boolean;
}

/**
 * 認証ストア
 * Zustand + persist middleware で永続化対応
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      store: null,
      permissions: [],
      token: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * ログイン処理
       */
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        
        try {
          const response: LoginResponse = await authApi.login(credentials);
          
          set({
            user: response.user,
            store: response.store,
            permissions: response.permissions,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          console.log('ログイン成功:', {
            user: response.user.name,
            role: response.user.role,
            store: response.store.name,
            permissions: response.permissions.length,
          });
        } catch (error) {
          set({ isLoading: false });
          console.error('ログインエラー:', error);
          throw error;
        }
      },

      /**
       * ログアウト処理
       */
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.warn('ログアウトAPIエラー:', error);
        } finally {
          // ローカル状態をクリア
          get().clearAuth();
        }
      },

      /**
       * 認証状態確認
       * アプリ起動時・ページリロード時に実行
       */
      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          get().clearAuth();
          return;
        }

        set({ isLoading: true });

        try {
          const user = await authApi.getCurrentUser();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          console.log('認証確認成功:', user.name);
        } catch (error) {
          console.warn('認証確認失敗:', error);
          get().clearAuth();
        }
      },

      /**
       * ユーザー情報更新
       */
      updateUser: (updatedUser: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },

      /**
       * 認証状態クリア
       */
      clearAuth: () => {
        set({
          user: null,
          store: null,
          permissions: [],
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      /**
       * 権限チェック
       */
      hasPermission: (permission: string): boolean => {
        const { permissions } = get();
        return permissions.includes(permission);
      },

      /**
       * オーナー権限チェック
       */
      isOwner: (): boolean => {
        const { user } = get();
        return user?.role === 'owner';
      },

      /**
       * マネージャー以上権限チェック
       */
      isManager: (): boolean => {
        const { user } = get();
        return user?.role === 'owner' || user?.role === 'manager';
      },

      /**
       * ユーザー管理権限チェック
       */
      canManageUsers: (): boolean => {
        const { user } = get();
        return user?.permissions_summary?.can_manage_users || false;
      },

      /**
       * 設定管理権限チェック
       */
      canManageSettings: (): boolean => {
        const { user } = get();
        return user?.permissions_summary?.can_manage_settings || false;
      },

      /**
       * 分析表示権限チェック
       */
      canViewAnalytics: (): boolean => {
        const { user } = get();
        return user?.permissions_summary?.can_view_analytics || false;
      },
    }),
    {
      name: 'tugical-auth-storage',
      partialize: (state) => ({
        user: state.user,
        store: state.store,
        permissions: state.permissions,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 