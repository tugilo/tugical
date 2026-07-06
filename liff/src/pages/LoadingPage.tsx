import React from 'react'
import { motion } from 'framer-motion'

/**
 * LIFF初期化中のローディング画面
 * 
 * tugicalの理念を表現する美しいローディング画面
 */
const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center safe-area-top safe-area-bottom">
      <div className="text-center">
        {/* ローディングアニメーション */}
        <motion.div
          className="w-16 h-16 mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-full h-full border-4 border-primary-200 border-t-primary-500 rounded-full"></div>
        </motion.div>

        {/* ローディングメッセージ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            tugical
          </h1>
          <p className="text-gray-600 mb-4">
            次の時間が、もっと自由になる。
          </p>
          <p className="text-sm text-gray-500">
            初期化中...
          </p>
        </motion.div>

        {/* プログレスバー */}
        <motion.div
          className="w-48 h-1 bg-gray-200 rounded-full mx-auto mt-6 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-primary-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default LoadingPage 