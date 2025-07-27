import React from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 予約完了画面（ステップ5）
 * 
 * プレースホルダー - 後で完全実装
 */
const BookingCompletePage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">予約完了</h1>
          <div className="text-sm text-gray-500">ステップ 5/5</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            予約完了画面
          </h2>
          <p className="text-gray-600 mb-6">
            この画面は後で実装予定です
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full btn-primary touch-target"
            >
              新しい予約
            </button>
            
            <button
              onClick={() => navigate('/history')}
              className="w-full btn-outline touch-target"
            >
              予約履歴を見る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingCompletePage 