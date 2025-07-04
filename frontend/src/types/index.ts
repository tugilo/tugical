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

export interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
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
  resource_id?: number;
  options?: BookingOption[];
  total_price: number;
  payment_status?: 'pending' | 'paid' | 'refunded';
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
  loyalty_rank?: 'new' | 'regular' | 'vip' | 'premium';
}

export interface BookingMenu {
  id: number;
  name: string;
  duration: number;
  base_duration: number;
  price: number;
}

export interface BookingResource {
  id: number;
  name: string;
  display_name: string;
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
  option_ids?: number[];
  hold_token?: string;
}

export interface BookingListResponse {
  bookings: Booking[];
  pagination: PaginationData;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking_id?: number;
  customer_name?: string;
}

export interface AvailabilityResponse {
  available_slots: AvailabilitySlot[];
  business_hours: {
    start: string;
    end: string;
  };
}

// ========================================
// 顧客関連型定義
// ========================================

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string;
  address?: string;
  line_user_id?: string;
  line_display_name?: string;
  line_picture_url?: string;
  loyalty_rank: 'new' | 'regular' | 'vip' | 'premium';
  notes?: string;
  is_active?: boolean;
  last_booking_at?: string;
  total_bookings?: number;
  total_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string;
  address?: string;
  line_user_id?: string;
  line_display_name?: string;
  line_picture_url?: string;
  loyalty_rank: 'new' | 'regular' | 'vip' | 'premium';
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string;
  address?: string;
  line_display_name?: string;
  line_picture_url?: string;
  loyalty_rank?: 'new' | 'regular' | 'vip' | 'premium';
  notes?: string;
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
  capacity?: number;
  attributes: Record<string, any>;
  working_hours: Record<string, any>;
  constraints: Record<string, any>;
  efficiency_rate: number;
  hourly_rate_diff: number;
  equipment_specs: Record<string, any>;
  booking_rules: Record<string, any>;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceRequest {
  type: 'staff' | 'room' | 'equipment' | 'vehicle';
  name: string;
  display_name?: string;
  description?: string;
  attributes?: Record<string, any>;
  working_hours?: Record<string, any>;
  constraints?: Record<string, any>;
  efficiency_rate?: number;
  hourly_rate_diff?: number;
  capacity?: number;
  equipment_specs?: Record<string, any>;
  booking_rules?: Record<string, any>;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateResourceRequest {
  type?: 'staff' | 'room' | 'equipment' | 'vehicle';
  name?: string;
  display_name?: string;
  description?: string;
  attributes?: Record<string, any>;
  working_hours?: Record<string, any>;
  constraints?: Record<string, any>;
  efficiency_rate?: number;
  hourly_rate_diff?: number;
  capacity?: number;
  equipment_specs?: Record<string, any>;
  booking_rules?: Record<string, any>;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ResourceFormData {
  type: 'staff' | 'room' | 'equipment' | 'vehicle';
  name: string;
  display_name: string;
  description: string;
  capacity: number;
  photo_url: string;
  attributes: Record<string, any>;
  working_hours: Record<string, any>;
  efficiency_rate: number;
  hourly_rate_diff: number;
  is_active: boolean;
}

// ========================================
// メニュー関連型定義
// ========================================

export interface Menu {
  id: number;
  store_id: number;
  name: string;
  display_name: string;
  category?: string;
  description?: string;
  base_price: number;
  base_duration: number;
  prep_duration: number;
  cleanup_duration: number;
  total_duration: number;
  booking_constraints?: MenuBookingConstraints;
  resource_requirements?: MenuResourceRequirements;
  industry_settings?: Record<string, any>;
  is_active: boolean;
  requires_approval: boolean;
  sort_order: number;
  image_url?: string;
  options?: MenuOption[];
  options_count?: number;
  bookings_count?: number;
  industry_display_name: string;
  category_info?: MenuCategoryInfo;
  formatted_price: string;
  formatted_duration: string;
  formatted_total_duration: string;
  created_at: string;
  updated_at: string;
}

export interface MenuOption {
  id: number;
  menu_id: number;
  name: string;
  display_name: string;
  description?: string;
  price: number;
  duration: number;
  price_type: 'fixed' | 'percentage' | 'duration_based' | 'free';
  price_value: number;
  duration_minutes: number;
  constraints?: Record<string, any>;
  stock_quantity?: number;
  stock_used: number;
  available_stock?: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  price_type_info: MenuOptionPriceTypeInfo;
  formatted_price: string;
  formatted_duration: string;
  has_stock_management: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuBookingConstraints {
  advance_booking_days?: number;
  same_day_booking?: boolean;
  minimum_advance_hours?: number;
  cancellation_hours?: number;
}

export interface MenuResourceRequirements {
  staff_type?: string;
  room_required?: boolean;
  equipment?: number[];
}

export interface MenuCategoryInfo {
  current?: string;
  available: string[];
  industry_type: string;
}

export interface MenuOptionPriceTypeInfo {
  name: string;
  description: string;
  value_unit: string;
  example: string;
}

export interface CreateMenuRequest {
  name: string;
  display_name?: string;
  category?: string;
  description?: string;
  base_price: number;
  base_duration: number;
  prep_duration?: number;
  cleanup_duration?: number;
  advance_booking_hours?: number;
  gender_restriction?: 'none' | 'male_only' | 'female_only';
  booking_constraints?: MenuBookingConstraints;
  resource_requirements?: MenuResourceRequirements;
  industry_settings?: Record<string, any>;
  image_url?: string;
  is_active?: boolean;
  requires_approval?: boolean;
  sort_order?: number;
  options?: CreateMenuOptionRequest[];
}

export interface UpdateMenuRequest {
  name?: string;
  display_name?: string;
  category?: string | null;
  description?: string | null;
  base_price?: number;
  base_duration?: number;
  prep_duration?: number;
  cleanup_duration?: number;
  booking_constraints?: MenuBookingConstraints;
  resource_requirements?: MenuResourceRequirements;
  industry_settings?: Record<string, any>;
  image_url?: string | null;
  is_active?: boolean;
  requires_approval?: boolean;
  sort_order?: number;
  options?: CreateMenuOptionRequest[];
}

export interface CreateMenuOptionRequest {
  name: string;
  display_name?: string;
  description?: string;
  price_type: 'fixed' | 'percentage' | 'duration_based' | 'free';
  price_value?: number;
  duration_minutes?: number;
  constraints?: Record<string, any>;
  stock_quantity?: number;
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface MenuCategoriesResponse {
  categories: string[];
  industry_type: string;
  used_categories: string[];
  default_categories: string[];
}

// ========================================
// 通知関連型定義
// ========================================

export interface Notification {
  id: number;
  type:
    | 'booking_confirmation'
    | 'booking_reminder'
    | 'booking_cancellation'
    | 'booking_update'
    | 'promotional'
    | 'system'
    | 'emergency';
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
  message?: string | null;
  duration?: number | null;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  }>;
  persistent?: boolean;
}

// ========================================
// フォーム関連型定義
// ========================================

export interface FormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'time';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  validation?: Record<string, any>;
}

export interface FilterOptions {
  search?: string | null;
  status?: string | null;
  type?: string | null;
  category?: string | null;
  date?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  resource_id?: number | null;
  customer_id?: number | null;
  menu_id?: number | null;
  is_active?: boolean | null;
  page?: number;
  per_page?: number;
  sort?: string;
  sort_by?: string | null;
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
  type:
    | 'booking_created'
    | 'booking_updated'
    | 'customer_registered'
    | 'payment_received';
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
