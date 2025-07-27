import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// LIFF関連
import { useLiff } from '@/hooks/useLiff'

// ページコンポーネント
import LoadingPage from '@/pages/LoadingPage'
import ErrorPage from '@/pages/ErrorPage'
import MenuSelectionPage from '@/pages/MenuSelectionPage'
import DateTimeSelectionPage from '@/pages/DateTimeSelectionPage'
import CustomerInfoPage from '@/pages/CustomerInfoPage'
import BookingConfirmPage from '@/pages/BookingConfirmPage'
import BookingCompletePage from '@/pages/BookingCompletePage'
import BookingHistoryPage from '@/pages/BookingHistoryPage'
import LiffTestPage from '@/pages/LiffTestPage'

// 型定義

/**
 * LIFFアプリケーションのメインコンポーネント
 * 
 * tugicalの理念「次の時間が、もっと自由になる。」に沿って、
 * 顧客が直感的に予約できる5ステップフローを提供
 */
const App: React.FC = () => {
  const { liffState, error } = useLiff()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // LIFF初期化完了後の処理
    if (liffState !== 'INITIALIZING') {
      setIsInitialized(true)
    }
  }, [liffState])

  // LIFF初期化中
  if (!isInitialized) {
    return <LoadingPage />
  }

  // LIFF初期化エラー
  if (error) {
    return <ErrorPage error={error} />
  }

  // LIFF未対応環境
  if (liffState === 'UNAVAILABLE') {
    return <ErrorPage error="LINEアプリ内でのみご利用いただけます。" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <AnimatePresence mode="wait">
        <Routes>
          {/* メニュー選択画面（ステップ1） */}
          <Route 
            path="/" 
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MenuSelectionPage />
              </motion.div>
            } 
          />
          
          {/* 日時選択画面（ステップ2） */}
          <Route 
            path="/datetime" 
            element={
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DateTimeSelectionPage />
              </motion.div>
            } 
          />
          
          {/* 顧客情報入力画面（ステップ3） */}
          <Route 
            path="/customer-info" 
            element={
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CustomerInfoPage />
              </motion.div>
            } 
          />
          
          {/* 予約確認画面（ステップ4） */}
          <Route 
            path="/confirm" 
            element={
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BookingConfirmPage />
              </motion.div>
            } 
          />
          
          {/* 予約完了画面（ステップ5） */}
          <Route 
            path="/complete" 
            element={
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <BookingCompletePage />
              </motion.div>
            } 
          />
          
          {/* 予約履歴画面 */}
          <Route 
            path="/history" 
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BookingHistoryPage />
              </motion.div>
            } 
          />
          
          {/* LIFF認証統合テスト画面（開発用） */}
          <Route 
            path="/test" 
            element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <LiffTestPage />
              </motion.div>
            } 
          />
          
          {/* デフォルトリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App 