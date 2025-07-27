import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Menu } from '@/types/liff'

/**
 * メニュー選択画面（ステップ1）
 * 
 * tugicalの理念に沿って、顧客が直感的にメニューを選択できる画面
 */
const MenuSelectionPage: React.FC = () => {
  const navigate = useNavigate()
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error] = useState<string | null>(null)

  // モックデータ（後でAPIに置き換え）
  useEffect(() => {
    const mockMenus: Menu[] = [
      {
        id: 1,
        name: 'カット',
        description: 'シャンプー・ブロー込みのカットサービス',
        baseDuration: 60,
        basePrice: 3000,
        photoUrl: '/images/menu-cut.jpg',
        taxIncluded: true,
        category: 'hair',
        isActive: true
      },
      {
        id: 2,
        name: 'カット+カラー',
        description: 'カットとフルカラーのセットメニュー',
        baseDuration: 120,
        basePrice: 8000,
        photoUrl: '/images/menu-cut-color.jpg',
        taxIncluded: true,
        category: 'hair',
        isActive: true
      },
      {
        id: 3,
        name: 'パーマ',
        description: 'デジタルパーマで自然な仕上がり',
        baseDuration: 90,
        basePrice: 6000,
        photoUrl: '/images/menu-perm.jpg',
        taxIncluded: true,
        category: 'hair',
        isActive: true
      }
    ]

    // ローディングシミュレーション
    setTimeout(() => {
      setMenus(mockMenus)
      setLoading(false)
    }, 1000)
  }, [])

  /**
   * メニュー選択処理
   */
  const handleMenuSelect = (menu: Menu) => {
    setSelectedMenu(menu)
  }

  /**
   * 次へ進む処理
   */
  const handleNext = () => {
    if (selectedMenu) {
      // 選択したメニューをセッションストレージに保存
      sessionStorage.setItem('selectedMenu', JSON.stringify(selectedMenu))
      navigate('/datetime')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">メニューを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white safe-area-top safe-area-bottom">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">メニュー選択</h1>
          <div className="text-sm text-gray-500">ステップ 1/5</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        {/* 説明文 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            ご希望のメニューをお選びください
          </h2>
          <p className="text-gray-600">
            お好みのメニューをタップして選択してください
          </p>
        </motion.div>

        {/* メニュー一覧 */}
        <div className="space-y-4">
          {menus.map((menu, index) => (
            <motion.div
              key={menu.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`menu-card ${selectedMenu?.id === menu.id ? 'menu-card-selected' : ''}`}
                onClick={() => handleMenuSelect(menu)}
              >
                <div className="card-body">
                  <div className="flex items-start space-x-4">
                    {/* メニュー画像 */}
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {menu.photoUrl ? (
                        <img
                          src={menu.photoUrl}
                          alt={menu.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* メニュー情報 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {menu.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {menu.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>約{menu.baseDuration}分</span>
                          <span>¥{menu.basePrice.toLocaleString()}</span>
                        </div>
                        {selectedMenu?.id === menu.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 次へボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <button
            onClick={handleNext}
            disabled={!selectedMenu}
            className="w-full btn-primary touch-target disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ進む
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default MenuSelectionPage 