/**
 * tugical Admin Dashboard Type Definitions
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md 完全準拠
 * - Laravel Sanctum認証対応
 * - マルチテナント対応型定義
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

// ========================================
// 基本型定義
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  message?: string;
  meta: {
    timestamp: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

// ========================================
// 認証関連型定義
// ========================================

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'staff' | 'reception';
  is_active: boolean;
  email_verified_at: string | null;
  store_id: number;
  last_login_at: string | null;
  last_login_ip: string | null;
  last_activity_at: string | null;
  profile: UserProfile;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
  role_display_name: string;
  permissions_summary: PermissionsSummary;
  security_info?: SecurityInfo;
}

export interface UserProfile {
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  language: string;
}

export interface UserPreferences {
  notifications: boolean;
  email_notifications: boolean;
  dashboard_layout: 'simple' | 'advanced';
  date_format: string;
  time_format: string;
  theme?: string;
  language?: string;
}

export interface PermissionsSummary {
  level: 'full' | 'limited' | 'view_only';
  description: string;
  can_manage_users: boolean;
  can_manage_settings: boolean;
  can_view_analytics: boolean;
}

export interface SecurityInfo {
  login_attempts_today: number;
  password_updated_at: string | null;
  two_factor_enabled: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  store_id: number;
}

export interface LoginResponse {
  token: string;
  user: User;
  store: Store;
  permissions: string[];
}

// ========================================
// 店舗関連型定義
// ========================================

export interface Store {
  id: number;
  name: string;
  plan_type: 'free' | 'standard' | 'pro' | 'enterprise';
  is_active: boolean;
  features?: StoreFeaturesAvailable;
}

export interface StoreFeaturesAvailable {
  monthly_booking_limit: number | null;
  staff_count_limit: number | null;
  notification_templates: 'basic' | 'full';
  analytics: boolean;
  api_access: boolean;
  custom_domain: boolean;
  multi_store?: boolean;
  max_stores?: number | null;
  dedicated_support?: boolean;
}

// ========================================
// 予約関連型定義
// ========================================

export interface Booking {
  id: number;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  customer: BookingCustomer;
  menu: BookingMenu;
  resource?: BookingResource;
  options?: BookingOption[];
  total_price: number;
  customer_notes?: string;
  staff_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingCustomer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

export interface BookingMenu {
  id: number;
  name: string;
  duration: number;
  price: number;
}

export interface BookingResource {
  id: number;
  name: string;
  type: 'staff' | 'room' | 'equipment';
}

export interface BookingOption {
  id: number;
  name: string;
  price: number;
}

export interface CreateBookingRequest {
  customer_id: number;
  menu_id: number;
  resource_id?: number;
  booking_date: string;
  start_time: string;
  customer_notes?: string;
  options?: number[];
  hold_token?: string;
}

// ========================================
// 顧客関連型定義
// ========================================

export interface Customer {
  id: number;
  line_user_id: string | null;
  name: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  address?: string;
  notes?: string;
  loyalty_rank: 'new' | 'regular' | 'vip' | 'premium';
  total_bookings: number;
  total_spent: number;
  last_booking_at?: string;
  last_booking_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
  is_active?: boolean;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
  is_active?: boolean;
  loyalty_rank?: 'new' | 'regular' | 'vip' | 'premium';
}

// ========================================
// リソース関連型定義
// ========================================

export interface Resource {
  id: number;
  type: 'staff' | 'room' | 'equipment' | 'vehicle';
  name: string;
  display_name: string;
  description?: string;
  attributes: Record<string, any>;
  working_hours: Record<string, any>;
  efficiency_rate: number;
  hourly_rate_diff: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================
// メニュー関連型定義
// ========================================

export interface Menu {
  id: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  is_active: boolean;
  options?: MenuOption[];
  created_at: string;
  updated_at: string;
}

export interface MenuOption {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_modifier: number;
  is_required: boolean;
  is_active: boolean;
}

// ========================================
// 通知関連型定義
// ========================================

export interface Notification {
  id: number;
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'booking_update' | 'promotional' | 'system' | 'emergency';
  channel: 'line' | 'email' | 'sms';
  recipient_type: 'customer' | 'staff';
  recipient_id: number;
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  delivery_status?: 'delivered' | 'failed' | 'bounced';
  created_at: string;
  updated_at: string;
}

// ========================================
// UI状態管理型定義
// ========================================

export interface AppState {
  auth: AuthState;
  ui: UIState;
}

export interface AuthState {
  user: User | null;
  store: Store | null;
  permissions: string[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  notifications: ToastNotification[];
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ========================================
// フォーム関連型定義
// ========================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  validation?: Record<string, any>;
}

export interface FilterOptions {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  resource_id?: number;
  customer_id?: number;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ========================================
// ダッシュボード関連型定義
// ========================================

export interface DashboardStats {
  today_bookings: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
  };
  revenue: {
    today: number;
    this_week: number;
    this_month: number;
    growth_rate: number;
  };
  customers: {
    total: number;
    new_this_month: number;
    returning_rate: number;
  };
  resources: {
    total: number;
    active: number;
    utilization_rate: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'booking_created' | 'booking_updated' | 'customer_registered' | 'payment_received';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  metadata?: Record<string, any>;
}

// ========================================
// エクスポート
// ========================================

export type BookingStatus = Booking['status'];
export type UserRole = User['role'];
export type ResourceType = Resource['type'];
export type NotificationType = Notification['type'];
export type NotificationChannel = Notification['channel']; 