import React from 'react'
import { motion } from 'framer-motion'

interface Resource {
  id: number
  name: string
  display_name?: string
  avatar_url?: string
  is_available: boolean
  specialties?: string[]
  rating?: number
  total_bookings?: number
}

interface ResourceSelectorProps {
  resources: Resource[]
  selectedResource: Resource | null
  onResourceSelect: (resource: Resource) => void
  showAvailability?: boolean
  className?: string
  isLoading?: boolean
}

/**
 * リソース（担当者）選択コンポーネント
 * 
 * 担当者の一覧表示・選択
 * 空き時間との連携に対応
 */
const ResourceSelector: React.FC<ResourceSelectorProps> = ({
  resources,
  selectedResource,
  onResourceSelect,
  showAvailability = true,
  className = '',
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">担当者情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-medium">担当者が登録されていません</p>
          <p className="text-sm">店舗に担当者登録をお願いしてください</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">担当者を選択</h3>
        <p className="text-sm text-gray-600 mt-1">
          {resources.filter(r => r.is_available).length}名の担当者が予約可能です
        </p>
      </div>

      {/* リソースリスト */}
      <div className="p-4">
        <div className="space-y-3">
          {resources.map((resource) => {
            const isSelected = selectedResource && selectedResource.id === resource.id
            const isAvailable = resource.is_available

            const getCardClasses = () => {
              const baseClasses = 'p-4 rounded-lg border transition-all touch-target'
              
              if (!isAvailable) {
                return `${baseClasses} border-gray-200 bg-gray-50 cursor-not-allowed`
              }
              
              if (isSelected) {
                return `${baseClasses} border-primary-500 bg-primary-50 shadow-md`
              }
              
              return `${baseClasses} border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 cursor-pointer`
            }

            return (
              <motion.button
                key={resource.id}
                onClick={() => isAvailable && onResourceSelect(resource)}
                className={getCardClasses()}
                whileHover={isAvailable ? { scale: 1.01 } : {}}
                whileTap={isAvailable ? { scale: 0.99 } : {}}
                disabled={!isAvailable}
              >
                <div className="flex items-center space-x-4">
                  {/* アバター */}
                  <div className="flex-shrink-0">
                    {resource.avatar_url ? (
                      <img
                        src={resource.avatar_url}
                        alt={resource.display_name || resource.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-lg">
                          {(resource.display_name || resource.name).charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 情報 */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-semibold ${
                        isAvailable ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {resource.display_name || resource.name}
                      </h4>
                      
                      {!isAvailable && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          予約不可
                        </span>
                      )}
                      
                      {isSelected && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          選択中
                        </span>
                      )}
                    </div>

                    {/* 専門分野 */}
                    {resource.specialties && resource.specialties.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        専門: {resource.specialties.join('、')}
                      </p>
                    )}

                    {/* 評価・実績 */}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {resource.rating && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>{resource.rating.toFixed(1)}</span>
                        </div>
                      )}
                      
                      {resource.total_bookings && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>{resource.total_bookings}件</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 選択チェックマーク */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 凡例 */}
      {showAvailability && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded"></div>
              <span>選択中</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>予約不可</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResourceSelector 