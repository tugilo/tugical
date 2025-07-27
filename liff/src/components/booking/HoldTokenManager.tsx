import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInSeconds } from 'date-fns'

interface HoldToken {
  id: string
  timeSlot: string
  resourceId: number
  resourceName: string
  expiresAt: Date
  createdAt: Date
}

interface HoldTokenManagerProps {
  holdToken: HoldToken | null
  onHoldExpire: () => void
  onHoldExtend: () => void
  onHoldRelease: () => void
  className?: string
}

/**
 * 仮押さえシステム管理コンポーネント
 * 
 * 10分間の仮押さえ機能
 * 期限切れ処理・延長・解除機能
 */
const HoldTokenManager: React.FC<HoldTokenManagerProps> = ({
  holdToken,
  onHoldExpire,
  onHoldExtend,
  onHoldRelease,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // 残り時間の計算と更新
  useEffect(() => {
    if (!holdToken) {
      setTimeLeft(0)
      return
    }

    const updateTimeLeft = () => {
      const now = new Date()
      const secondsLeft = differenceInSeconds(holdToken.expiresAt, now)
      
      if (secondsLeft <= 0) {
        setTimeLeft(0)
        onHoldExpire()
      } else {
        setTimeLeft(secondsLeft)
      }
    }

    // 初期計算
    updateTimeLeft()

    // 1秒ごとに更新
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [holdToken, onHoldExpire])

  if (!holdToken) {
    return null
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isExpiringSoon = timeLeft <= 60 // 1分以下で警告

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-white rounded-lg shadow-lg border-2 ${
          isExpiringSoon ? 'border-warning-500' : 'border-primary-500'
        } ${className}`}
      >
        {/* ヘッダー */}
        <div className={`p-4 rounded-t-lg ${
          isExpiringSoon ? 'bg-warning-50' : 'bg-primary-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className={`w-5 h-5 ${
                isExpiringSoon ? 'text-warning-600' : 'text-primary-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className={`font-semibold ${
                isExpiringSoon ? 'text-warning-800' : 'text-primary-800'
              }`}>
                仮押さえ中
              </h3>
            </div>
            
            <div className={`text-sm font-mono ${
              isExpiringSoon ? 'text-warning-700' : 'text-primary-700'
            }`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4">
          <div className="space-y-3">
            {/* 予約情報 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">時間枠</p>
                  <p className="font-semibold text-gray-900">{holdToken.timeSlot}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">担当者</p>
                  <p className="font-semibold text-gray-900">{holdToken.resourceName}</p>
                </div>
              </div>
            </div>

            {/* 警告メッセージ */}
            {isExpiringSoon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-warning-100 border border-warning-200 rounded-lg p-3"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm font-medium text-warning-800">
                    仮押さえがまもなく期限切れになります
                  </p>
                </div>
              </motion.div>
            )}

            {/* アクションボタン */}
            <div className="flex space-x-3">
              <button
                onClick={onHoldExtend}
                className="flex-1 btn-primary touch-target"
              >
                延長する
              </button>
              
              <button
                onClick={onHoldRelease}
                className="flex-1 btn-outline touch-target"
              >
                解除する
              </button>
            </div>

            {/* 説明 */}
            <div className="text-xs text-gray-500 text-center">
              <p>仮押さえは10分間有効です</p>
              <p>期限切れになると自動的に解除されます</p>
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <motion.div
            className={`h-full ${
              isExpiringSoon ? 'bg-warning-500' : 'bg-primary-500'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 600) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default HoldTokenManager 