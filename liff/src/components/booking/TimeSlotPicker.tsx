import React from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface TimeSlot {
  time: string
  available: boolean
  isHeld: boolean
  holdExpiresAt?: Date
  resourceId?: number
  resourceName?: string
}

interface TimeSlotPickerProps {
  selectedDate: Date | null
  timeSlots: TimeSlot[]
  selectedTimeSlot: TimeSlot | null
  onTimeSlotSelect: (timeSlot: TimeSlot) => void
  onTimeSlotHold: (timeSlot: TimeSlot) => void
  className?: string
  isLoading?: boolean
}

/**
 * 時間スロット選択コンポーネント
 * 
 * 選択された日付の時間枠を表示・選択
 * 仮押さえ状態の管理に対応
 */
const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  timeSlots,
  selectedTimeSlot,
  onTimeSlotSelect,
  onTimeSlotHold,
  className = '',
  isLoading = false
}) => {
  if (!selectedDate) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">日付を選択してください</p>
          <p className="text-sm">時間枠を表示するには日付を選択してください</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">時間枠を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (timeSlots.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
          <p className="text-lg font-medium">予約可能な時間枠がありません</p>
          <p className="text-sm">
            {format(selectedDate, 'M月d日', { locale: ja })}は営業時間外または予約済みです
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {format(selectedDate, 'M月d日 (E)', { locale: ja })}の時間枠
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {timeSlots.filter(slot => slot.available).length}個の予約可能時間枠があります
        </p>
      </div>

      {/* 時間スロットグリッド */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((slot, index) => {
            const isSelected = selectedTimeSlot && selectedTimeSlot.time === slot.time
            const isHeld = slot.isHeld
            const isExpired = slot.holdExpiresAt && slot.holdExpiresAt < new Date()

            const getSlotClasses = () => {
              const baseClasses = 'p-4 rounded-lg border text-center transition-all touch-target relative'
              
              if (!slot.available || isExpired) {
                return `${baseClasses} border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed`
              }
              
              if (isSelected) {
                return `${baseClasses} border-primary-500 bg-primary-50 text-primary-700 shadow-md`
              }
              
              if (isHeld) {
                return `${baseClasses} border-warning-500 bg-warning-50 text-warning-700`
              }
              
              return `${baseClasses} border-gray-200 bg-white text-gray-900 hover:border-primary-300 hover:bg-primary-50 cursor-pointer`
            }

            return (
              <motion.button
                key={index}
                onClick={() => {
                  if (slot.available && !isExpired) {
                    if (isHeld) {
                      onTimeSlotHold(slot)
                    } else {
                      onTimeSlotSelect(slot)
                    }
                  }
                }}
                className={getSlotClasses()}
                whileHover={slot.available && !isExpired ? { scale: 1.02 } : {}}
                whileTap={slot.available && !isExpired ? { scale: 0.98 } : {}}
                disabled={!slot.available || isExpired}
              >
                {/* 仮押さえバッジ */}
                {isHeld && !isExpired && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-warning-500 text-white text-xs px-2 py-1 rounded-full">
                      仮押さえ
                    </div>
                  </div>
                )}

                {/* 期限切れバッジ */}
                {isExpired && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                      期限切れ
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-lg font-semibold">{slot.time}</div>
                  
                  {slot.resourceName && (
                    <div className="text-xs text-gray-600">
                      {slot.resourceName}
                    </div>
                  )}
                  
                  {isHeld && slot.holdExpiresAt && !isExpired && (
                    <div className="text-xs text-warning-600">
                      {format(slot.holdExpiresAt, 'HH:mm')}まで
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-500 rounded"></div>
            <span>選択済み</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-warning-500 rounded"></div>
            <span>仮押さえ中</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>予約済み</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeSlotPicker 