import React from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 顧客情報入力画面（ステップ3）
 * 
 * プレースホルダー - 後で完全実装
 */
const CustomerInfoPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">お客様情報</h1>
          <div className="text-sm text-gray-500">ステップ 3/5</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            顧客情報入力画面
          </h2>
          <p className="text-gray-600 mb-6">
            この画面は後で実装予定です
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/confirm')}
              className="w-full btn-primary touch-target"
            >
              次へ進む（テスト用）
            </button>
            
            <button
              onClick={() => navigate('/datetime')}
              className="w-full btn-outline touch-target"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerInfoPage 