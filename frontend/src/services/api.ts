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
  MenuCategoriesResponse,
  MenuOption,
  BookingListResponse,
  // Phase 23: 複数メニュー組み合わせ対応
  CalculateCombinationRequest,
  CalculateCombinationResponse,
  PhoneBookingAvailabilityRequest,
  PhoneBookingAvailabilityResponse,
  CreateCombinationBookingRequest,
} from '../types';

// ========================================
// API基本設定
// ========================================

// @ts-ignore
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      // withCredentials: true, // 一時的に無効
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // 'X-Requested-With': 'XMLHttpRequest', // 一時的に無効
      },
    });

    // トークンの初期化（localStorage から取得）
    this.initializeToken();

    // リクエストインターセプター（認証トークン自動付与）
    this.client.interceptors.request.use(
      config => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      error => Promise.reject(error)
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
      } else {
        // 開発環境用のデフォルトトークン（Phase 19で取得した有効なトークン）
        this.token = '40|PaitUC2tDNF0xXJYeFzFVA8s05T8AW2a8U36k1eG83f4b440';
        localStorage.setItem('tugical_admin_token', this.token);
      }
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
      // フォールバック
      this.token = '40|PaitUC2tDNF0xXJYeFzFVA8s05T8AW2a8U36k1eG83f4b440';
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
   * CSRFクッキー取得
   * Sanctum認証前に必要
   */
  async getCsrfCookie(): Promise<void> {
    try {
      await axios.get('http://localhost/sanctum/csrf-cookie', {
        withCredentials: true,
      });
    } catch (error) {
      console.warn('CSRF cookie取得失敗:', error);
      // 開発環境では無視
    }
  }

  /**
   * 管理者ログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // CSRFクッキー取得を一時的に無効
    // await this.getCsrfCookie();

    const response = await this.client.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );

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
    const response = await this.client.get<ApiResponse<{ user: User }>>(
      '/auth/user'
    );

    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }

    throw new Error(
      response.data.error?.message || 'ユーザー情報の取得に失敗しました'
    );
  }

  // ========================================
  // 予約API
  // ========================================

  /**
   * 予約一覧取得
   */
  async getBookings(filters?: FilterOptions): Promise<{
    bookings: Booking[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<
      ApiResponse<{
        bookings: Booking[];
        pagination: {
          current_page: number;
          per_page: number;
          total: number;
          last_page: number;
          from: number | null;
          to: number | null;
        };
      }>
    >(`/bookings?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '予約一覧の取得に失敗しました'
    );
  }

  /**
   * 予約詳細取得
   */
  async getBooking(id: number): Promise<Booking> {
    const response = await this.client.get<ApiResponse<Booking>>(
      `/bookings/${id}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '予約詳細の取得に失敗しました'
    );
  }

  /**
   * 予約作成
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    const response = await this.client.post<ApiResponse<Booking>>(
      '/bookings',
      bookingData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || '予約の作成に失敗しました');
  }

  /**
   * 予約更新
   */
  async updateBooking(
    id: number,
    bookingData: Partial<CreateBookingRequest>
  ): Promise<Booking> {
    const response = await this.client.put<ApiResponse<Booking>>(
      `/bookings/${id}`,
      bookingData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || '予約の更新に失敗しました');
  }

  /**
   * 予約ステータス更新
   */
  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const response = await this.client.patch<ApiResponse<Booking>>(
      `/bookings/${id}/status`,
      { status }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'ステータスの更新に失敗しました'
    );
  }

  /**
   * 予約削除
   */
  async deleteBooking(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/bookings/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || '予約の削除に失敗しました'
      );
    }
  }

  /**
   * 予約移動（タイムライン専用）
   * 日時・時間・担当者を一括更新
   */
  async moveBooking(
    id: number,
    moveData: {
      booking_date: string;
      start_time: string;
      end_time: string;
      resource_id?: number | null;
    }
  ): Promise<Booking> {
    const response = await this.client.patch<ApiResponse<Booking>>(
      `/bookings/${id}/move`,
      moveData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error?.message || '予約の移動に失敗しました');
  }

  /**
   * Phase 23: メニュー組み合わせ計算
   */
  async calculateCombination(
    requestData: CalculateCombinationRequest
  ): Promise<CalculateCombinationResponse> {
    // API仕様書に従ってデータ形式を変換
    const payload = {
      menu_ids: requestData.menus.map(menu => menu.menu_id),
      resource_id: requestData.resource_id,
      booking_date: requestData.booking_date,
      selected_options: requestData.menus.reduce((acc, menu) => {
        if (menu.option_ids && menu.option_ids.length > 0) {
          acc[menu.menu_id] = menu.option_ids;
        }
        return acc;
      }, {} as Record<number, number[]>),
    };

    const response = await this.client.post<
      ApiResponse<{ calculation: CalculateCombinationResponse }>
    >('/bookings/calculate', payload);

    if (response.data.success && response.data.data) {
      return response.data.data.calculation;
    }

    throw new Error(
      response.data.error?.message || 'メニュー組み合わせ計算に失敗しました'
    );
  }

  /**
   * Phase 23: 電話予約最適化空き時間取得
   */
  async getPhoneBookingAvailability(
    requestData: PhoneBookingAvailabilityRequest
  ): Promise<PhoneBookingAvailabilityResponse> {
    const params = new URLSearchParams();
    Object.entries(requestData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await this.client.get<
      ApiResponse<PhoneBookingAvailabilityResponse>
    >(`/bookings/phone-availability?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message ||
        '電話予約最適化空き時間の取得に失敗しました'
    );
  }

  /**
   * Phase 23: 複数メニュー組み合わせ予約作成
   */
  async createCombinationBooking(
    requestData: CreateCombinationBookingRequest
  ): Promise<Booking> {
    const response = await this.client.post<ApiResponse<{ booking: Booking }>>(
      '/bookings/combination',
      requestData
    );

    if (response.data.success && response.data.data) {
      return response.data.data.booking;
    }

    throw new Error(
      response.data.error?.message ||
        '複数メニュー組み合わせ予約の作成に失敗しました'
    );
  }

  // ========================================
  // 顧客API
  // ========================================

  /**
   * 顧客一覧取得
   */
  async getCustomers(
    filters?: FilterOptions
  ): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<
      ApiResponse<PaginatedResponse<Customer>>
    >(`/customers?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '顧客一覧の取得に失敗しました'
    );
  }

  /**
   * 顧客詳細取得
   */
  async getCustomer(id: number): Promise<Customer> {
    const response = await this.client.get<ApiResponse<{ customer: Customer }>>(
      `/customers/${id}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data.customer;
    }

    throw new Error(
      response.data.error?.message || '顧客詳細の取得に失敗しました'
    );
  }

  /**
   * 顧客作成
   */
  async createCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await this.client.post<
      ApiResponse<{ customer: Customer }>
    >('/customers', customerData);

    if (response.data.success && response.data.data) {
      return response.data.data.customer;
    }

    throw new Error(response.data.error?.message || '顧客の作成に失敗しました');
  }

  /**
   * 顧客更新
   */
  async updateCustomer(
    id: number,
    customerData: UpdateCustomerRequest
  ): Promise<Customer> {
    const response = await this.client.put<ApiResponse<{ customer: Customer }>>(
      `/customers/${id}`,
      customerData
    );

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
      throw new Error(
        response.data.error?.message || '顧客の削除に失敗しました'
      );
    }
  }

  // ========================================
  // リソースAPI
  // ========================================

  /**
   * リソース一覧取得
   */
  async getResources(
    filters?: FilterOptions
  ): Promise<{ resources: Resource[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<
      ApiResponse<{ resources: Resource[]; pagination: any }>
    >(`/resources?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'リソース一覧の取得に失敗しました'
    );
  }

  /**
   * リソース詳細取得
   */
  async getResource(id: number): Promise<Resource> {
    const response = await this.client.get<ApiResponse<{ resource: Resource }>>(
      `/resources/${id}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data.resource;
    }

    throw new Error(
      response.data.error?.message || 'リソース詳細の取得に失敗しました'
    );
  }

  /**
   * リソース作成
   */
  async createResource(resourceData: any): Promise<Resource> {
    const response = await this.client.post<
      ApiResponse<{ resource: Resource }>
    >('/resources', resourceData);

    if (response.data.success && response.data.data) {
      return response.data.data.resource;
    }

    throw new Error(
      response.data.error?.message || 'リソースの作成に失敗しました'
    );
  }

  /**
   * リソース更新
   */
  async updateResource(id: number, resourceData: any): Promise<Resource> {
    const response = await this.client.put<ApiResponse<{ resource: Resource }>>(
      `/resources/${id}`,
      resourceData
    );

    if (response.data.success && response.data.data) {
      return response.data.data.resource;
    }

    throw new Error(
      response.data.error?.message || 'リソースの更新に失敗しました'
    );
  }

  /**
   * リソース削除
   */
  async deleteResource(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/resources/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'リソースの削除に失敗しました'
      );
    }
  }

  /**
   * リソースタイプ一覧取得
   */
  async getResourceTypes(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(
      '/resources-types'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'リソースタイプの取得に失敗しました'
    );
  }

  // ========================================
  // メニューAPI
  // ========================================

  /**
   * メニュー一覧取得
   */
  async getMenus(filters?: FilterOptions): Promise<{
    menus: Menu[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<
      ApiResponse<{
        menus: Menu[];
        pagination: {
          current_page: number;
          last_page: number;
          per_page: number;
          total: number;
        };
      }>
    >(`/menus?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'メニュー一覧の取得に失敗しました'
    );
  }

  /**
   * メニュー詳細取得
   */
  async getMenu(id: number): Promise<Menu> {
    const response = await this.client.get<ApiResponse<{ menu: Menu }>>(
      `/menus/${id}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }

    throw new Error(
      response.data.error?.message || 'メニュー詳細の取得に失敗しました'
    );
  }

  /**
   * メニュー作成
   */
  async createMenu(menuData: CreateMenuRequest): Promise<Menu> {
    const response = await this.client.post<ApiResponse<{ menu: Menu }>>(
      '/menus',
      menuData
    );

    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }

    throw new Error(
      response.data.error?.message || 'メニューの作成に失敗しました'
    );
  }

  /**
   * メニュー更新
   */
  async updateMenu(id: number, menuData: UpdateMenuRequest): Promise<Menu> {
    const response = await this.client.put<ApiResponse<{ menu: Menu }>>(
      `/menus/${id}`,
      menuData
    );

    if (response.data.success && response.data.data) {
      return response.data.data.menu;
    }

    throw new Error(
      response.data.error?.message || 'メニューの更新に失敗しました'
    );
  }

  /**
   * メニュー削除
   */
  async deleteMenu(id: number): Promise<void> {
    const response = await this.client.delete<ApiResponse>(`/menus/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'メニューの削除に失敗しました'
      );
    }
  }

  /**
   * メニューカテゴリ一覧取得
   */
  async getMenuCategories(): Promise<MenuCategoriesResponse> {
    const response = await this.client.get<ApiResponse<MenuCategoriesResponse>>(
      '/menus-categories'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'メニューカテゴリの取得に失敗しました'
    );
  }

  /**
   * メニュー表示順序更新
   */
  async updateMenuOrder(
    menuOrders: Array<{ id: number; sort_order: number }>
  ): Promise<void> {
    const response = await this.client.patch<ApiResponse>('/menus-order', {
      menu_orders: menuOrders,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message || 'メニューの表示順序更新に失敗しました'
      );
    }
  }

  /**
   * 郵便番号から住所を検索
   * @param postalCode 郵便番号（ハイフンあり・なし両対応）
   * @returns 住所情報
   */
  async searchByPostalCode(postalCode: string): Promise<{
    prefecture: string;
    city: string;
    town: string;
  } | null> {
    try {
      // ハイフンを除去して7桁の数字のみにする
      const cleanedCode = postalCode.replace(/-/g, '');

      if (!/^\d{7}$/.test(cleanedCode)) {
        throw new Error('郵便番号は7桁の数字で入力してください');
      }

      // バックエンドの郵便番号検索エンドポイントを使用
      const response = await this.client.get<
        ApiResponse<{
          prefecture: string;
          city: string;
          town: string;
        } | null>
      >(`/postal-search?zipcode=${cleanedCode}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null; // 見つからない場合
    } catch (error) {
      console.error('郵便番号検索エラー:', error);
      throw error;
    }
  }

  // ========================================
  // ダッシュボードAPI
  // ========================================

  /**
   * ダッシュボード統計情報取得
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<ApiResponse<DashboardStats>>(
      '/dashboard/stats'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '統計情報の取得に失敗しました'
    );
  }

  /**
   * 最近のアクティビティ取得
   */
  async getRecentActivity(): Promise<RecentActivity[]> {
    const response = await this.client.get<ApiResponse<RecentActivity[]>>(
      '/dashboard/activity'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'アクティビティの取得に失敗しました'
    );
  }

  // ========================================
  // 通知API
  // ========================================

  /**
   * 通知一覧取得
   */
  async getNotifications(
    filters?: FilterOptions
  ): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.client.get<
      ApiResponse<PaginatedResponse<Notification>>
    >(`/notifications?${params.toString()}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '通知一覧の取得に失敗しました'
    );
  }

  // メニュー管理API
  async getMenuOptions(menuId: number): Promise<{ options: MenuOption[] }> {
    const response = await this.client.get<
      ApiResponse<{ options: MenuOption[] }>
    >(`/menus/${menuId}/options`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || 'メニューオプションの取得に失敗しました'
    );
  }

  // ========================================
  // 店舗設定API (Phase 21.3: 5分刻み時間スロット設定)
  // ========================================

  /**
   * 時間スロット設定を取得
   * @returns 店舗の時間スロット設定
   */
  async getTimeSlotSettings(): Promise<{
    time_slot_settings: {
      slot_duration_minutes: number;
      slot_label_interval_minutes: number;
      min_slot_duration: number;
      max_slot_duration: number;
      available_durations: number[];
      business_hours: {
        start: string;
        end: string;
      };
      display_format: string;
      timezone: string;
    };
    store_info: {
      id: number;
      name: string;
      industry_type: string;
    };
  }> {
    const response = await this.client.get<
      ApiResponse<{
        time_slot_settings: any;
        store_info: any;
      }>
    >('/store/time-slot-settings');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '時間スロット設定の取得に失敗しました'
    );
  }

  /**
   * 時間スロット設定を更新
   * @param settings 更新する設定値
   * @returns 更新後の設定
   */
  async updateTimeSlotSettings(settings: {
    slot_duration_minutes?: number;
    slot_label_interval_minutes?: number;
    min_slot_duration?: number;
    max_slot_duration?: number;
    available_durations?: number[];
    business_hours?: {
      start?: string;
      end?: string;
    };
    display_format?: string;
    timezone?: string;
  }): Promise<{
    time_slot_settings: any;
    message: string;
  }> {
    const response = await this.client.put<
      ApiResponse<{
        time_slot_settings: any;
        message: string;
      }>
    >('/store/time-slot-settings', settings);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(
      response.data.error?.message || '時間スロット設定の更新に失敗しました'
    );
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
  getById: (id: number) => apiClient.getBooking(id),
  create: (data: CreateBookingRequest) => apiClient.createBooking(data),
  update: (id: number, data: Partial<CreateBookingRequest>) =>
    apiClient.updateBooking(id, data),
  updateStatus: (id: number, status: string) =>
    apiClient.updateBookingStatus(id, status),
  delete: (id: number) => apiClient.deleteBooking(id),

  // Phase 23: 複数メニュー組み合わせ対応
  calculateCombination: (data: CalculateCombinationRequest) =>
    apiClient.calculateCombination(data),
  createCombinationBooking: (data: CreateCombinationBookingRequest) =>
    apiClient.createCombinationBooking(data),
  getPhoneBookingAvailability: (data: PhoneBookingAvailabilityRequest) =>
    apiClient.getPhoneBookingAvailability(data),

  /**
   * 空き時間取得（仮実装）
   */
  getAvailability: async (params: {
    date: string;
    resource_id?: number;
    menu_id?: number;
  }): Promise<{
    available_slots: Array<{
      start_time: string;
      end_time: string;
      is_available: boolean;
      booking_id?: number;
      customer_name?: string;
    }>;
    business_hours: {
      start: string;
      end: string;
    };
  }> => {
    // 仮実装：営業時間内のスロットを生成
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}`;

        // ランダムで一部を予約済みにする（デモ用）
        const isAvailable = Math.random() > 0.3;

        slots.push({
          start_time: timeStr,
          end_time: timeStr,
          is_available: isAvailable,
          booking_id: isAvailable ? undefined : Math.floor(Math.random() * 100),
          customer_name: isAvailable ? undefined : '山田太郎',
        });
      }
    }

    return {
      available_slots: slots,
      business_hours: {
        start: '09:00',
        end: '20:00',
      },
    };
  },
};

export const customerApi = {
  getList: (filters?: FilterOptions) => apiClient.getCustomers(filters),
  get: (id: number) => apiClient.getCustomer(id),
  create: (data: CreateCustomerRequest) => apiClient.createCustomer(data),
  update: (id: number, data: UpdateCustomerRequest) =>
    apiClient.updateCustomer(id, data),
  delete: (id: number) => apiClient.deleteCustomer(id),
};

export const resourceApi = {
  getList: (filters?: FilterOptions) => apiClient.getResources(filters),
  get: (id: number) => apiClient.getResource(id),
  create: (data: any) => apiClient.createResource(data),
  update: (id: number, data: any) => apiClient.updateResource(id, data),
  delete: (id: number) => apiClient.deleteResource(id),
  getTypes: () => apiClient.getResourceTypes(),
};

export const menuApi = {
  getList: (filters?: FilterOptions) => apiClient.getMenus(filters),
  get: (id: number) => apiClient.getMenu(id),
  create: (data: CreateMenuRequest) => apiClient.createMenu(data),
  update: (id: number, data: UpdateMenuRequest) =>
    apiClient.updateMenu(id, data),
  delete: (id: number) => apiClient.deleteMenu(id),
  getCategories: () => apiClient.getMenuCategories(),
  updateOrder: (menuOrders: Array<{ id: number; sort_order: number }>) =>
    apiClient.updateMenuOrder(menuOrders),
  getOptions: (menuId: number) => apiClient.getMenuOptions(menuId),
};

export const dashboardApi = {
  getStats: () => apiClient.getDashboardStats(),
  getActivity: () => apiClient.getRecentActivity(),
};

export const notificationApi = {
  getList: (filters?: FilterOptions) => apiClient.getNotifications(filters),
};

// ✨ Phase 21.3: 店舗設定API (5分刻み時間スロット設定)
export const storeApi = {
  getTimeSlotSettings: () => apiClient.getTimeSlotSettings(),
  updateTimeSlotSettings: (settings: {
    slot_duration_minutes?: number;
    slot_label_interval_minutes?: number;
    min_slot_duration?: number;
    max_slot_duration?: number;
    available_durations?: number[];
    business_hours?: {
      start?: string;
      end?: string;
    };
    display_format?: string;
    timezone?: string;
  }) => apiClient.updateTimeSlotSettings(settings),
};

export default apiClient;
