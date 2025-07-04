/**
 * tugical Admin Dashboard API Client
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md 完全準拠
 * - Laravel Sanctum Bearer Token認証
 * - 統一エラーレスポンス処理
 * - TypeScript型安全性
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { 
  ApiResponse, 
  PaginatedResponse,
  LoginRequest, 
  LoginResponse,
  User,
  Booking,
  Customer,
  Resource,
  Menu,
  Notification,
  FilterOptions,
  CreateBookingRequest,
  DashboardStats,
  RecentActivity,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateMenuRequest,
  UpdateMenuRequest,
  MenuCategoriesResponse
} from '../types';

// ========================================
// API基本設定
// ========================================

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // トークンの初期化（localStorage から取得）
    this.initializeToken();

    // リクエストインターセプター（認証トークン自動付与）
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // レスポンスインターセプター（エラーハンドリング）
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      (error: AxiosError<ApiResponse>) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * トークンの初期化
   */
  private initializeToken(): void {
    try {
      const savedToken = localStorage.getItem('tugical_admin_token');
      if (savedToken) {
        this.token = savedToken;
      }
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
    }
  }

  /**
   * 認証トークンを設定
   */
  setToken(token: string): void {
    this.token = token;
    try {
      localStorage.setItem('tugical_admin_token', token);
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
    }
  }

  /**
   * 認証トークンを削除
   */
  clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem('tugical_admin_token');
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  }

  /**
   * APIエラーハンドリング
   */
  private handleApiError(error: AxiosError<ApiResponse>): void {
    if (error.response?.status === 401) {
      // 認証エラー時はトークンをクリア
      this.clearToken();
      
      // ログインページにリダイレクト（必要に応じて）
      if (window.location.pathname !== '/login') {
        console.warn('Authentication failed, redirecting to login');
        // window.location.href = '/login';
      }
    }

    // エラーログ出力
    console.error('API Error:', {
      status: error.response?.status,
      code: error.response?.data?.error?.code,
      message: error.response?.data?.error?.message,
      url: error.config?.url,
      method: error.config?.method,
    });
  }

  // ========================================
  // 認証API
  // ========================================

  /**
   * 管理者ログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      this.setToken(response.data.data.token);
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'ログインに失敗しました');
  }

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    try {
      await this.client.post<ApiResponse>('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  /**
   * ユーザー情報取得
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<ApiResponse<{ user: User }>>('/auth/user');
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    
    throw new Error(response.data.error?.message || 'ユーザー情報の取得に失敗しました');
  }

  // ========================================
  // 予約API
  // ========================================

  /**
   * 予約一覧取得
   */
  async getBookings(filters?: FilterOptions): Promise<PaginatedResponse<Booking>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Booking>>>(
      `/bookings?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '予約一覧の取得に失敗しました');
  }

  /**
   * 予約詳細取得
   */
  async getBooking(id: number): Promise<Booking> {
    const response = await this.client.get<ApiResponse<Booking>>(`/bookings/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '予約詳細の取得に失敗しました');
  }

  /**
   * 予約作成
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    const response = await this.client.post<ApiResponse<Booking>>('/bookings', bookingData);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '予約の作成に失敗しました');
  }

  /**
   * 予約更新
   */
  async updateBooking(id: number, bookingData: Partial<CreateBookingRequest>): Promise<Booking> {
    const response = await this.client.put<ApiResponse<Booking>>(`/bookings/${id}`, bookingData);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '予約の更新に失敗しました');
  }

  /**
   * 予約ステータス更新
   */
  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const response = await this.client.patch<ApiResponse<Booking>>(`/bookings/${id}/status`, { status });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'ステータスの更新に失敗しました');
  }

  /**
   * 予約削除
   */
  async deleteBooking(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/bookings/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '予約の削除に失敗しました');
    }
  }

  // ========================================
  // 顧客API
  // ========================================

  /**
   * 顧客一覧取得
   */
  async getCustomers(filters?: FilterOptions): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Customer>>>(
      `/customers?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '顧客一覧の取得に失敗しました');
  }

  /**
   * 顧客詳細取得
   */
  async getCustomer(id: number): Promise<Customer> {
    const response = await this.client.get<ApiResponse<{ customer: Customer }>>(`/customers/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data.customer;
    }
    
    throw new Error(response.data.error?.message || '顧客詳細の取得に失敗しました');
  }

  /**
   * 顧客作成
   */
  async createCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await this.client.post<ApiResponse<{ customer: Customer }>>('/customers', customerData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.customer;
    }
    
    throw new Error(response.data.error?.message || '顧客の作成に失敗しました');
  }

  /**
   * 顧客更新
   */
  async updateCustomer(id: number, customerData: UpdateCustomerRequest): Promise<Customer> {
    const response = await this.client.put<ApiResponse<{ customer: Customer }>>(`/customers/${id}`, customerData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.customer;
    }
    
    throw new Error(response.data.error?.message || '顧客の更新に失敗しました');
  }

  /**
   * 顧客削除
   */
  async deleteCustomer(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/customers/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '顧客の削除に失敗しました');
    }
  }

  // ========================================
  // リソースAPI
  // ========================================

  /**
   * リソース一覧取得
   */
  async getResources(filters?: FilterOptions): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<ApiResponse<Resource[]>>(
      `/resources?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'リソース一覧の取得に失敗しました');
  }

  // ========================================
  // メニューAPI
  // ========================================

  /**
   * メニュー一覧取得
   */
  async getMenus(filters?: FilterOptions): Promise<PaginatedResponse<Menu>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Menu>>>(
      `/menus?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'メニュー一覧の取得に失敗しました');
  }

  /**
   * メニュー詳細取得
   */
  async getMenu(id: number): Promise<Menu> {
    const response = await this.client.get<ApiResponse<{ menu: Menu }>>(`/menus/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }
    
    throw new Error(response.data.error?.message || 'メニュー詳細の取得に失敗しました');
  }

  /**
   * メニュー作成
   */
  async createMenu(menuData: CreateMenuRequest): Promise<Menu> {
    const response = await this.client.post<ApiResponse<{ menu: Menu }>>('/menus', menuData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }
    
    throw new Error(response.data.error?.message || 'メニューの作成に失敗しました');
  }

  /**
   * メニュー更新
   */
  async updateMenu(id: number, menuData: UpdateMenuRequest): Promise<Menu> {
    const response = await this.client.put<ApiResponse<{ menu: Menu }>>(`/menus/${id}`, menuData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }
    
    throw new Error(response.data.error?.message || 'メニューの更新に失敗しました');
  }

  /**
   * メニュー削除
   */
  async deleteMenu(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/menus/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'メニューの削除に失敗しました');
    }
  }

  /**
   * メニューカテゴリ一覧取得
   */
  async getMenuCategories(): Promise<MenuCategoriesResponse> {
    const response = await this.client.get<ApiResponse<MenuCategoriesResponse>>('/menus-categories');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'メニューカテゴリの取得に失敗しました');
  }

  /**
   * メニュー表示順序更新
   */
  async updateMenuOrder(menuOrders: Array<{ id: number; sort_order: number }>): Promise<void> {
    const response = await this.client.patch<ApiResponse>('/menus-order', { menu_orders: menuOrders });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'メニューの表示順序更新に失敗しました');
    }
  }

  // ========================================
  // ダッシュボードAPI
  // ========================================

  /**
   * ダッシュボード統計情報取得
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '統計情報の取得に失敗しました');
  }

  /**
   * 最近のアクティビティ取得
   */
  async getRecentActivity(): Promise<RecentActivity[]> {
    const response = await this.client.get<ApiResponse<RecentActivity[]>>('/dashboard/activity');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'アクティビティの取得に失敗しました');
  }

  // ========================================
  // 通知API
  // ========================================

  /**
   * 通知一覧取得
   */
  async getNotifications(filters?: FilterOptions): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Notification>>>(
      `/notifications?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || '通知一覧の取得に失敗しました');
  }
}

// ========================================
// エクスポート
// ========================================

// シングルトンインスタンス
export const apiClient = new ApiClient();

// 個別API関数のエクスポート（後方互換性）
export const authApi = {
  login: (credentials: LoginRequest) => apiClient.login(credentials),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
};

export const bookingApi = {
  getList: (filters?: FilterOptions) => apiClient.getBookings(filters),
  get: (id: number) => apiClient.getBooking(id),
  create: (data: CreateBookingRequest) => apiClient.createBooking(data),
  update: (id: number, data: Partial<CreateBookingRequest>) => apiClient.updateBooking(id, data),
  updateStatus: (id: number, status: string) => apiClient.updateBookingStatus(id, status),
  delete: (id: number) => apiClient.deleteBooking(id),
};

export const customerApi = {
  getList: (filters?: FilterOptions) => apiClient.getCustomers(filters),
  get: (id: number) => apiClient.getCustomer(id),
  create: (data: CreateCustomerRequest) => apiClient.createCustomer(data),
  update: (id: number, data: UpdateCustomerRequest) => apiClient.updateCustomer(id, data),
  delete: (id: number) => apiClient.deleteCustomer(id),
};

export const resourceApi = {
  getList: (filters?: FilterOptions) => apiClient.getResources(filters),
};

export const menuApi = {
  getList: (filters?: FilterOptions) => apiClient.getMenus(filters),
  get: (id: number) => apiClient.getMenu(id),
  create: (data: CreateMenuRequest) => apiClient.createMenu(data),
  update: (id: number, data: UpdateMenuRequest) => apiClient.updateMenu(id, data),
  delete: (id: number) => apiClient.deleteMenu(id),
  getCategories: () => apiClient.getMenuCategories(),
  updateOrder: (menuOrders: Array<{ id: number; sort_order: number }>) => apiClient.updateMenuOrder(menuOrders),
};

export const dashboardApi = {
  getStats: () => apiClient.getDashboardStats(),
  getActivity: () => apiClient.getRecentActivity(),
};

export const notificationApi = {
  getList: (filters?: FilterOptions) => apiClient.getNotifications(filters),
};

export default apiClient; 