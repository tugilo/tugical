import React from 'react'
import { motion } from 'framer-motion'

interface ErrorPageProps {
  error: string
}

/**
 * エラー表示ページ
 * 
 * LIFF初期化エラーやその他のエラーを表示
 */
const ErrorPage: React.FC<ErrorPageProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center safe-area-top safe-area-bottom">
      <div className="text-center max-w-md mx-auto px-4">
        {/* エラーアイコン */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-20 h-20 mx-auto mb-6 bg-error/10 rounded-full flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </motion.div>

        {/* エラーメッセージ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          
          {/* 再試行ボタン */}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary touch-target"
          >
            再読み込み
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default ErrorPage 