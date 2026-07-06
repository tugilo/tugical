import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useLiff } from '@/hooks/useLiff'
import { liffApi } from '@/services/api'

interface TestResult {
  testName: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: any
}

/**
 * LIFF認証統合テストパネル
 * 
 * LINE認証状態、API通信、仮押さえシステムのテスト
 * 開発・デバッグ用コンポーネント
 */
const LiffTestPanel: React.FC = () => {
  const { liffState, lineUser, isLoggedIn, error } = useLiff()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  /**
   * テスト実行
   */
  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    const results: TestResult[] = []

    // 1. LIFF初期化テスト
    results.push({
      testName: 'LIFF初期化',
      status: 'pending',
      message: 'テスト実行中...'
    })

    if (liffState === 'INITIALIZED') {
      results[0] = {
        testName: 'LIFF初期化',
        status: 'success',
        message: 'LIFF初期化が正常に完了しました'
      }
    } else {
      results[0] = {
        testName: 'LIFF初期化',
        status: 'error',
        message: `LIFF初期化に失敗: ${liffState}`,
        details: error
      }
    }

    // 2. LINE認証テスト
    results.push({
      testName: 'LINE認証',
      status: 'pending',
      message: 'テスト実行中...'
    })

    if (isLoggedIn && lineUser) {
      results[1] = {
        testName: 'LINE認証',
        status: 'success',
        message: `LINE認証成功: ${lineUser.displayName}`,
        details: {
          userId: lineUser.userId,
          displayName: lineUser.displayName
        }
      }
    } else {
      results[1] = {
        testName: 'LINE認証',
        status: 'error',
        message: 'LINE認証に失敗しています'
      }
    }

    // 3. 店舗情報取得テスト
    results.push({
      testName: '店舗情報取得',
      status: 'pending',
      message: 'テスト実行中...'
    })

    try {
      const store = await liffApi.getStore('sample-store')
      results[2] = {
        testName: '店舗情報取得',
        status: 'success',
        message: `店舗情報取得成功: ${store.name}`,
        details: store
      }
    } catch (err) {
      results[2] = {
        testName: '店舗情報取得',
        status: 'error',
        message: '店舗情報取得に失敗しました',
        details: err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // 4. メニュー取得テスト
    results.push({
      testName: 'メニュー取得',
      status: 'pending',
      message: 'テスト実行中...'
    })

    try {
      const menus = await liffApi.getMenus()
      results[3] = {
        testName: 'メニュー取得',
        status: 'success',
        message: `${menus.length}件のメニューを取得しました`,
        details: menus
      }
    } catch (err) {
      results[3] = {
        testName: 'メニュー取得',
        status: 'error',
        message: 'メニュー取得に失敗しました',
        details: err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // 5. 顧客プロフィール取得テスト
    results.push({
      testName: '顧客プロフィール取得',
      status: 'pending',
      message: 'テスト実行中...'
    })

    try {
      const customer = await liffApi.getCustomerProfile()
      results[4] = {
        testName: '顧客プロフィール取得',
        status: 'success',
        message: `顧客情報取得成功: ${customer.name}`,
        details: customer
      }
    } catch (err) {
      results[4] = {
        testName: '顧客プロフィール取得',
        status: 'error',
        message: '顧客プロフィール取得に失敗しました',
        details: err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // 6. 空き時間取得テスト
    results.push({
      testName: '空き時間取得',
      status: 'pending',
      message: 'テスト実行中...'
    })

    try {
      const availability = await liffApi.getAvailability({
        menuId: 1,
        date: new Date().toISOString().split('T')[0]
      })
      results[5] = {
        testName: '空き時間取得',
        status: 'success',
        message: `${availability.timeSlots.length}件の時間枠を取得しました`,
        details: availability
      }
    } catch (err) {
      results[5] = {
        testName: '空き時間取得',
        status: 'error',
        message: '空き時間取得に失敗しました',
        details: err instanceof Error ? err.message : 'Unknown error'
      }
    }

    setTestResults(results)
    setIsRunning(false)
  }

  /**
   * 個別テスト実行
   */
  const runSingleTest = async (testName: string) => {
    setIsRunning(true)
    
    const newResults = [...testResults]
    const testIndex = newResults.findIndex(r => r.testName === testName)
    
    if (testIndex === -1) return

    newResults[testIndex] = {
      ...newResults[testIndex],
      status: 'pending',
      message: 'テスト実行中...'
    }
    
    setTestResults(newResults)

    try {
      let result: TestResult

      switch (testName) {
        case 'LIFF初期化':
          result = {
            testName,
            status: liffState === 'INITIALIZED' ? 'success' : 'error',
            message: liffState === 'INITIALIZED' 
              ? 'LIFF初期化が正常に完了しました' 
              : `LIFF初期化に失敗: ${liffState}`,
            details: liffState !== 'INITIALIZED' ? error : undefined
          }
          break

        case 'LINE認証':
          result = {
            testName,
            status: isLoggedIn && lineUser ? 'success' : 'error',
            message: isLoggedIn && lineUser 
              ? `LINE認証成功: ${lineUser.displayName}` 
              : 'LINE認証に失敗しています',
            details: isLoggedIn && lineUser ? {
              userId: lineUser.userId,
              displayName: lineUser.displayName
            } : undefined
          }
          break

        case '店舗情報取得':
          const store = await liffApi.getStore('sample-store')
          result = {
            testName,
            status: 'success',
            message: `店舗情報取得成功: ${store.name}`,
            details: store
          }
          break

        case 'メニュー取得':
          const menus = await liffApi.getMenus()
          result = {
            testName,
            status: 'success',
            message: `${menus.length}件のメニューを取得しました`,
            details: menus
          }
          break

        case '顧客プロフィール取得':
          const customer = await liffApi.getCustomerProfile()
          result = {
            testName,
            status: 'success',
            message: `顧客情報取得成功: ${customer.name}`,
            details: customer
          }
          break

        case '空き時間取得':
          const availability = await liffApi.getAvailability({
            menuId: 1,
            date: new Date().toISOString().split('T')[0]
          })
          result = {
            testName,
            status: 'success',
            message: `${availability.timeSlots.length}件の時間枠を取得しました`,
            details: availability
          }
          break

        default:
          result = {
            testName,
            status: 'error',
            message: '不明なテストです'
          }
      }

      newResults[testIndex] = result
      setTestResults(newResults)

    } catch (err) {
      newResults[testIndex] = {
        testName,
        status: 'error',
        message: `${testName}に失敗しました`,
        details: err instanceof Error ? err.message : 'Unknown error'
      }
      setTestResults(newResults)
    }

    setIsRunning(false)
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✓'
      case 'error': return '✗'
      case 'pending': return '⟳'
      default: return '○'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">LIFF認証統合テスト</h2>
          <p className="text-sm text-gray-600 mt-1">
            LINE認証とAPI通信の動作確認
          </p>
        </div>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isRunning
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {isRunning ? 'テスト実行中...' : '全テスト実行'}
        </button>
      </div>

      {/* 現在の状態 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700">LIFF状態</h3>
          <p className={`text-lg font-semibold mt-1 ${
            liffState === 'INITIALIZED' ? 'text-green-600' : 'text-red-600'
          }`}>
            {liffState}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700">LINE認証</h3>
          <p className={`text-lg font-semibold mt-1 ${
            isLoggedIn ? 'text-green-600' : 'text-red-600'
          }`}>
            {isLoggedIn ? '認証済み' : '未認証'}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700">ユーザー名</h3>
          <p className="text-lg font-semibold mt-1 text-gray-900">
            {lineUser?.displayName || '未取得'}
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* テスト結果 */}
      <div className="space-y-3">
        {testResults.map((result, index) => (
          <motion.div
            key={result.testName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold">{getStatusIcon(result.status)}</span>
                <div>
                  <h4 className="font-semibold">{result.testName}</h4>
                  <p className="text-sm opacity-80">{result.message}</p>
                </div>
              </div>
              
              <button
                onClick={() => runSingleTest(result.testName)}
                disabled={isRunning}
                className="text-xs px-2 py-1 rounded border hover:bg-white hover:bg-opacity-50 transition-colors"
              >
                再実行
              </button>
            </div>
            
            {result.details && (
              <details className="mt-3">
                <summary className="text-xs cursor-pointer hover:opacity-80">
                  詳細を表示
                </summary>
                <pre className="text-xs mt-2 p-2 bg-white bg-opacity-50 rounded overflow-auto max-h-32">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </motion.div>
        ))}
      </div>

      {/* テスト実行前の案内 */}
      {testResults.length === 0 && !isRunning && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">テストを実行してください</p>
          <p className="text-sm">上記の「全テスト実行」ボタンをクリックしてテストを開始します</p>
        </div>
      )}
    </div>
  )
}

export default LiffTestPanel 