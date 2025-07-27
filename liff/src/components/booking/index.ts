// Booking components
export { default as CalendarView } from './CalendarView'
export { default as TimeSlotPicker } from './TimeSlotPicker'
export { default as ResourceSelector } from './ResourceSelector'
export { default as HoldTokenManager } from './HoldTokenManager'

// Types
export interface TimeSlot {
  time: string
  available: boolean
  isHeld: boolean
  holdExpiresAt?: Date
  resourceId?: number
  resourceName?: string
}

export interface Resource {
  id: number
  name: string
  display_name?: string
  avatar_url?: string
  is_available: boolean
  specialties?: string[]
  rating?: number
  total_bookings?: number
}

export interface HoldToken {
  id: string
  timeSlot: string
  resourceId: number
  resourceName: string
  expiresAt: Date
  createdAt: Date
} 