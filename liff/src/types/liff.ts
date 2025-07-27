/**
 * LIFF状態の型定義
 */
export type LiffState = 
  | 'INITIALIZING'    // 初期化中
  | 'INITIALIZED'     // 初期化完了
  | 'UNAVAILABLE'     // LIFF未対応環境
  | 'ERROR'           // エラー

/**
 * LINEユーザー情報の型定義
 */
export interface LineUser {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

/**
 * 店舗情報の型定義
 */
export interface Store {
  id: number
  name: string
  description: string
  address: string
  phone: string
  businessHours: {
    [key: string]: {
      start: string
      end: string
    }
  }
  bookingSettings: {
    approvalMode: 'auto' | 'manual'
    advanceBookingDays: number
    cancellationHours: number
  }
}

/**
 * メニュー情報の型定義
 */
export interface Menu {
  id: number
  name: string
  description: string
  baseDuration: number
  basePrice: number
  photoUrl?: string
  taxIncluded: boolean
  category: string
  isActive: boolean
}

/**
 * リソース（スタッフ）情報の型定義
 */
export interface Resource {
  id: number
  type: string
  name: string
  displayName: string
  description: string
  photoUrl?: string
  attributes: {
    specialties: string[]
    skillLevel: string
    languages: string[]
  }
  workingHours: {
    [key: string]: {
      start: string
      end: string
    } | 'off'
  }
  efficiencyRate: number
  hourlyRateDiff: number
  capacity: number
  isActive: boolean
}

/**
 * 時間スロットの型定義
 */
export interface TimeSlot {
  time: string
  available: boolean
  resourceId?: number
  resourceName?: string
  isHeld?: boolean
  holdToken?: string
}

/**
 * 空き時間情報の型定義
 */
export interface Availability {
  date: string
  timeSlots: TimeSlot[]
  businessHours: {
    start: string
    end: string
  }
}

/**
 * 顧客情報の型定義
 */
export interface Customer {
  id?: number
  name: string
  phone: string
  email?: string
  notes?: string
  lineUserId?: string
  loyaltyRank?: 'new' | 'regular' | 'vip' | 'premium'
}

/**
 * 予約情報の型定義
 */
export interface Booking {
  id: number
  bookingNumber: string
  bookingDate: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
  customer: Customer
  menu: Menu
  resource?: Resource
  totalPrice: number
  customerNotes?: string
  createdAt: string
  updatedAt: string
}

/**
 * 予約作成リクエストの型定義
 */
export interface CreateBookingRequest {
  menuId: number
  resourceId?: number
  bookingDate: string
  startTime: string
  customerInfo: {
    name: string
    phone: string
    notes?: string
  }
  holdToken?: string
  preferredTimes?: Array<{
    date: string
    time: string
  }>
}

/**
 * 予約作成レスポンスの型定義
 */
export interface CreateBookingResponse {
  success: boolean
  data: {
    booking: Booking
  }
  message: string
}

/**
 * 仮押さえトークンの型定義
 */
export interface HoldToken {
  token: string
  expiresAt: string
  timeSlots: TimeSlot[]
}

/**
 * 予約ステップの型定義
 */
export interface BookingStep {
  id: number
  label: string
  path: string
  isCompleted: boolean
  isActive: boolean
}

/**
 * 予約フロー状態の型定義
 */
export interface BookingFlowState {
  selectedMenu?: Menu
  selectedResource?: Resource
  selectedDate?: string
  selectedTime?: string
  customerInfo?: Customer
  holdToken?: HoldToken
  currentStep: number
  steps: BookingStep[]
}

/**
 * LIFFエラーの型定義
 */
export interface LiffError {
  code: string
  message: string
  details?: any
} 