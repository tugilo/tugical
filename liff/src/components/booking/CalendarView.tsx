import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CalendarViewProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  availableDates?: Date[]
  unavailableDates?: Date[]
  minDate?: Date
  maxDate?: Date
  className?: string
}

/**
 * カレンダー表示コンポーネント
 * 
 * 月表示カレンダーで日付選択を行う
 * 営業日・予約可能日の表示に対応
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onDateSelect,
  availableDates = [],
  unavailableDates = [],
  minDate = new Date(),
  maxDate = addMonths(new Date(), 3),
  className = ''
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // 現在の月の日付配列を生成
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // 前月・次月のナビゲーション
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  // 日付の状態判定
  const getDateStatus = (date: Date) => {
    if (date < minDate || date > maxDate) return 'disabled'
    if (unavailableDates.some(d => isSameDay(d, date))) return 'unavailable'
    if (availableDates.some(d => isSameDay(d, date))) return 'available'
    return 'default'
  }

  // 曜日ヘッダー
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          disabled={currentMonth <= minDate}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h3>
        
        <button
          onClick={goToNextMonth}
          disabled={currentMonth >= maxDate}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`p-3 text-center text-sm font-medium ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {daysInMonth.map((date, index) => {
          const status = getDateStatus(date)
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isCurrentDay = isToday(date)

          const getDateClasses = () => {
            const baseClasses = 'p-3 text-center text-sm font-medium cursor-pointer transition-colors touch-target'
            
            if (status === 'disabled') {
              return `${baseClasses} text-gray-300 cursor-not-allowed`
            }
            
            if (isSelected) {
              return `${baseClasses} bg-primary-500 text-white hover:bg-primary-600`
            }
            
            if (isCurrentDay) {
              return `${baseClasses} bg-primary-100 text-primary-700 hover:bg-primary-200`
            }
            
            switch (status) {
              case 'available':
                return `${baseClasses} bg-white text-gray-900 hover:bg-primary-50 hover:text-primary-700`
              case 'unavailable':
                return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`
              default:
                return `${baseClasses} bg-white text-gray-500 hover:bg-gray-50`
            }
          }

          return (
            <motion.button
              key={index}
              onClick={() => status !== 'disabled' && status !== 'unavailable' && onDateSelect(date)}
              className={getDateClasses()}
              whileHover={{ scale: status === 'disabled' || status === 'unavailable' ? 1 : 1.05 }}
              whileTap={{ scale: status === 'disabled' || status === 'unavailable' ? 1 : 0.95 }}
              disabled={status === 'disabled' || status === 'unavailable'}
            >
              <div className="flex flex-col items-center">
                <span className="text-base">{format(date, 'd')}</span>
                {status === 'available' && (
                  <div className="w-1 h-1 bg-primary-500 rounded-full mt-1"></div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView 