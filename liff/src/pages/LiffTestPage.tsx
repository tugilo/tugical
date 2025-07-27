import React from 'react'
import { motion } from 'framer-motion'
import LiffTestPanel from '@/components/LiffTestPanel'

/**
 * LIFF認証統合テストページ
 * 
 * 開発・デバッグ用のテスト環境
 * LINE認証、API通信、仮押さえシステムの動作確認
 */
const LiffTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">LIFF認証統合テスト</h1>
            <p className="text-sm text-gray-600 mt-1">
              開発・デバッグ用テスト環境
            </p>
          </div>
          
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            開発モード
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LiffTestPanel />
        </motion.div>

        {/* 追加情報 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-medium text-blue-800">テストについて</h3>
            </div>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• このページは開発・デバッグ専用です</p>
              <p>• LINE認証とAPI通信の動作を確認できます</p>
              <p>• 本番環境では無効化されます</p>
              <p>• エラーが発生した場合は詳細を確認してください</p>
            </div>
          </div>
        </motion.div>

        {/* 環境情報 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6"
        >
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">環境情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-600">LIFF ID:</p>
                <p className="font-mono text-gray-900">
                  {import.meta.env.VITE_LIFF_ID || '未設定'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">API Base URL:</p>
                <p className="font-mono text-gray-900">
                  {import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Store ID:</p>
                <p className="font-mono text-gray-900">
                  {import.meta.env.VITE_STORE_ID || '1'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">環境:</p>
                <p className="font-mono text-gray-900">
                  {import.meta.env.MODE}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default LiffTestPage 