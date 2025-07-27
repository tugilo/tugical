import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { addDays, addMinutes } from 'date-fns'

import {
  CalendarView,
  TimeSlotPicker,
  ResourceSelector,
  HoldTokenManager,
  type TimeSlot,
  type Resource,
  type HoldToken
} from '@/components/booking'

/**
 * 日時選択画面（ステップ2）
 * 
 * カレンダー・時間枠・担当者選択
 * 仮押さえシステム統合
 */
const DateTimeSelectionPage: React.FC = () => {
  const navigate = useNavigate()

  // 状態管理
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [holdToken, setHoldToken] = useState<HoldToken | null>(null)
  
  // データ状態
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false)
  const [isLoadingResources] = useState(false)

  // モックデータ（後でAPIに置き換え）
  useEffect(() => {
    // 利用可能日付の生成（今日から30日後まで）
    const dates: Date[] = []
    for (let i = 0; i < 30; i++) {
      const date = addDays(new Date(), i)
      // 土日以外を利用可能とする
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(date)
      }
    }
    setAvailableDates(dates)

    // モックリソースデータ
    setResources([
      {
        id: 1,
        name: '田中 美咲',
        display_name: '田中 美咲',
        is_available: true,
        specialties: ['カット', 'カラー', 'パーマ'],
        rating: 4.8,
        total_bookings: 156
      },
      {
        id: 2,
        name: '佐藤 花子',
        display_name: '佐藤 花子',
        is_available: true,
        specialties: ['カット', 'トリートメント'],
        rating: 4.6,
        total_bookings: 89
      },
      {
        id: 3,
        name: '山田 太郎',
        display_name: '山田 太郎',
        is_available: false,
        specialties: ['カット', 'カラー'],
        rating: 4.7,
        total_bookings: 203
      }
    ])
  }, [])

  // 日付選択時の処理
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTimeSlot(null)
    setSelectedResource(null)
    setHoldToken(null)
    
    // 時間枠の読み込み（モック）
    setIsLoadingTimeSlots(true)
    setTimeout(() => {
      const slots: TimeSlot[] = []
      const startHour = 9
      const endHour = 18
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const isAvailable = Math.random() > 0.3 // 70%の確率で利用可能
          
          slots.push({
            time,
            available: isAvailable,
            isHeld: false,
            resourceId: isAvailable ? Math.floor(Math.random() * 2) + 1 : undefined,
            resourceName: isAvailable ? ['田中 美咲', '佐藤 花子'][Math.floor(Math.random() * 2)] : undefined
          })
        }
      }
      
      setTimeSlots(slots)
      setIsLoadingTimeSlots(false)
    }, 1000)
  }

  // 時間枠選択時の処理
  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot)
    
    // 仮押さえの作成
    const newHoldToken: HoldToken = {
      id: `hold_${Date.now()}`,
      timeSlot: timeSlot.time,
      resourceId: timeSlot.resourceId || 1,
      resourceName: timeSlot.resourceName || '指定なし',
      expiresAt: addMinutes(new Date(), 10),
      createdAt: new Date()
    }
    
    setHoldToken(newHoldToken)
    
    // 時間枠を仮押さえ状態に更新
    setTimeSlots(prev => prev.map(slot => 
      slot.time === timeSlot.time 
        ? { ...slot, isHeld: true, holdExpiresAt: newHoldToken.expiresAt }
        : slot
    ))
  }

  // 仮押さえ延長
  const handleHoldExtend = () => {
    if (holdToken) {
      const extendedToken: HoldToken = {
        ...holdToken,
        expiresAt: addMinutes(new Date(), 10)
      }
      setHoldToken(extendedToken)
      
      // 時間枠の期限も更新
      setTimeSlots(prev => prev.map(slot => 
        slot.time === holdToken.timeSlot 
          ? { ...slot, holdExpiresAt: extendedToken.expiresAt }
          : slot
      ))
    }
  }

  // 仮押さえ解除
  const handleHoldRelease = () => {
    if (holdToken) {
      setHoldToken(null)
      setSelectedTimeSlot(null)
      
      // 時間枠を通常状態に戻す
      setTimeSlots(prev => prev.map(slot => 
        slot.time === holdToken.timeSlot 
          ? { ...slot, isHeld: false, holdExpiresAt: undefined }
          : slot
      ))
    }
  }

  // 仮押さえ期限切れ
  const handleHoldExpire = () => {
    if (holdToken) {
      setHoldToken(null)
      setSelectedTimeSlot(null)
      
      // 時間枠を通常状態に戻す
      setTimeSlots(prev => prev.map(slot => 
        slot.time === holdToken.timeSlot 
          ? { ...slot, isHeld: false, holdExpiresAt: undefined }
          : slot
      ))
    }
  }

  // 次へ進む
  const handleNext = () => {
    if (selectedDate && selectedTimeSlot && holdToken) {
      // 予約情報をセッションに保存
      sessionStorage.setItem('booking_date', selectedDate.toISOString())
      sessionStorage.setItem('booking_time', selectedTimeSlot.time)
      sessionStorage.setItem('booking_resource_id', selectedResource?.id.toString() || '')
      sessionStorage.setItem('booking_hold_token', holdToken.id)
      
      navigate('/customer-info')
    }
  }

  const canProceed = selectedDate && selectedTimeSlot && holdToken

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h1 className="text-xl font-bold text-gray-900">日時選択</h1>
          
          <div className="text-sm text-gray-500">ステップ 2/5</div>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 2 
                  ? 'bg-primary-500 text-white' 
                  : step < 2 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 5 && (
                <div className={`w-8 h-1 mx-2 ${
                  step < 2 ? 'bg-primary-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 space-y-6">
        {/* 仮押さえ管理 */}
        <HoldTokenManager
          holdToken={holdToken}
          onHoldExpire={handleHoldExpire}
          onHoldExtend={handleHoldExtend}
          onHoldRelease={handleHoldRelease}
        />

        {/* カレンダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            availableDates={availableDates}
            className="mb-6"
          />
        </motion.div>

        {/* 時間枠選択 */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TimeSlotPicker
              selectedDate={selectedDate}
              timeSlots={timeSlots}
              selectedTimeSlot={selectedTimeSlot}
              onTimeSlotSelect={handleTimeSlotSelect}
              onTimeSlotHold={handleTimeSlotSelect}
              isLoading={isLoadingTimeSlots}
              className="mb-6"
            />
          </motion.div>
        )}

        {/* 担当者選択 */}
        {selectedTimeSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ResourceSelector
              resources={resources}
              selectedResource={selectedResource}
              onResourceSelect={setSelectedResource}
              isLoading={isLoadingResources}
              className="mb-6"
            />
          </motion.div>
        )}

        {/* ナビゲーションボタン */}
        <div className="space-y-3 pt-4">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full py-4 rounded-lg font-semibold transition-all touch-target ${
              canProceed
                ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canProceed ? '次へ進む' : '日時を選択してください'}
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors touch-target"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateTimeSelectionPage 