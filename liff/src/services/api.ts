import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  Store,
  Menu,
  Customer,
  Booking,
  CreateBookingRequest,
  CreateBookingResponse,
  Availability,
  TimeSlot
} from '@/types/liff'

/**
 * LIFF API クライアント
 * 
 * バックエンドのLiffControllerと連携
 * LINE認証・マルチテナント対応
 */
class LiffApiClient {
  private api: AxiosInstance
  private lineUserId: string | null = null
  private storeId: string | null = null

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    // リクエストインターセプター
    this.api.interceptors.request.use(
      (config) => {
        // LINE認証ヘッダーを追加
        if (this.lineUserId) {
          config.headers['X-Line-User-Id'] = this.lineUserId
        }
        if (this.storeId) {
          config.headers['X-Store-Id'] = this.storeId
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // レスポンスインターセプター
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  /**
   * LINE認証情報を設定
   */
  setAuth(lineUserId: string, storeId: string) {
    this.lineUserId = lineUserId
    this.storeId = storeId
  }

  /**
   * 店舗情報取得
   */
  async getStore(storeSlug: string): Promise<Store> {
    const response: AxiosResponse<{ success: boolean; data: { store: Store } }> = 
      await this.api.get(`/liff/stores/${storeSlug}`)
    
    if (!response.data.success) {
      throw new Error('店舗情報の取得に失敗しました')
    }
    
    return response.data.data.store
  }

  /**
   * 顧客プロフィール取得・作成
   */
  async getCustomerProfile(): Promise<Customer> {
    const response: AxiosResponse<{ success: boolean; data: { customer: Customer } }> = 
      await this.api.get('/liff/customer/profile')
    
    if (!response.data.success) {
      throw new Error('顧客情報の取得に失敗しました')
    }
    
    return response.data.data.customer
  }

  /**
   * メニュー一覧取得
   */
  async getMenus(): Promise<Menu[]> {
    const response: AxiosResponse<{ success: boolean; data: { menus: Menu[] } }> = 
      await this.api.get('/liff/menus')
    
    if (!response.data.success) {
      throw new Error('メニュー情報の取得に失敗しました')
    }
    
    return response.data.data.menus
  }

  /**
   * 空き時間取得
   */
  async getAvailability(params: {
    menuId: number
    date: string
    resourceId?: number
  }): Promise<Availability> {
    const response: AxiosResponse<{ 
      success: boolean; 
      data: { 
        available_slots: TimeSlot[]
        menu: {
          id: number
          name: string
          display_name: string
          duration: number
        }
      } 
    }> = await this.api.get('/liff/availability', { params })
    
    if (!response.data.success) {
      throw new Error('空き時間の取得に失敗しました')
    }
    
    return {
      date: params.date,
      timeSlots: response.data.data.available_slots,
      businessHours: {
        start: '09:00',
        end: '18:00'
      }
    }
  }

  /**
   * 予約作成
   */
  async createBooking(request: CreateBookingRequest): Promise<CreateBookingResponse> {
    const response: AxiosResponse<CreateBookingResponse> = 
      await this.api.post('/liff/bookings', request)
    
    if (!response.data.success) {
      throw new Error('予約の作成に失敗しました')
    }
    
    return response.data
  }

  /**
   * 予約履歴取得
   */
  async getBookingHistory(): Promise<Booking[]> {
    const response: AxiosResponse<{ success: boolean; data: { bookings: Booking[] } }> = 
      await this.api.get('/liff/bookings/history')
    
    if (!response.data.success) {
      throw new Error('予約履歴の取得に失敗しました')
    }
    
    return response.data.data.bookings
  }

  /**
   * 仮押さえトークン作成
   */
  async createHoldToken(params: {
    timeSlot: string
    resourceId: number
    menuId: number
    date: string
  }): Promise<{ token: string; expiresAt: string }> {
    const response: AxiosResponse<{ 
      success: boolean; 
      data: { 
        hold_token: string
        expires_at: string
      } 
    }> = await this.api.post('/liff/hold-tokens', params)
    
    if (!response.data.success) {
      throw new Error('仮押さえの作成に失敗しました')
    }
    
    return {
      token: response.data.data.hold_token,
      expiresAt: response.data.data.expires_at
    }
  }

  /**
   * 仮押さえトークン延長
   */
  async extendHoldToken(token: string): Promise<{ expiresAt: string }> {
    const response: AxiosResponse<{ 
      success: boolean; 
      data: { 
        expires_at: string
      } 
    }> = await this.api.put(`/liff/hold-tokens/${token}/extend`)
    
    if (!response.data.success) {
      throw new Error('仮押さえの延長に失敗しました')
    }
    
    return {
      expiresAt: response.data.data.expires_at
    }
  }

  /**
   * 仮押さえトークン解除
   */
  async releaseHoldToken(token: string): Promise<void> {
    const response: AxiosResponse<{ success: boolean }> = 
      await this.api.delete(`/liff/hold-tokens/${token}`)
    
    if (!response.data.success) {
      throw new Error('仮押さえの解除に失敗しました')
    }
  }
}

// シングルトンインスタンス
export const liffApi = new LiffApiClient() 