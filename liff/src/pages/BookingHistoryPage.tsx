import React from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 予約履歴画面
 * 
 * プレースホルダー - 後で完全実装
 */
const BookingHistoryPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">予約履歴</h1>
          <button
            onClick={() => navigate('/')}
            className="text-primary-500 text-sm"
          >
            新しい予約
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            予約履歴画面
          </h2>
          <p className="text-gray-600 mb-6">
            この画面は後で実装予定です
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="w-full btn-primary touch-target"
          >
            メニュー選択に戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingHistoryPage 