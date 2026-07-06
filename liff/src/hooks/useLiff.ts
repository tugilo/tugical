import { useState, useEffect, useCallback } from 'react'
import type { LiffState, LineUser } from '@/types/liff'
import { liffApi } from '@/services/api'

/**
 * LIFF初期化とLINE認証を管理するカスタムフック
 * 
 * tugicalの理念に沿って、顧客が簡単にLINE認証できる環境を提供
 */
export const useLiff = () => {
  const [liffState, setLiffState] = useState<LiffState>('INITIALIZING')
  const [lineUser, setLineUser] = useState<LineUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  /**
   * LIFF初期化処理
   */
  const initializeLiff = useCallback(async () => {
    try {
      // LIFF SDKが利用可能かチェック
      if (typeof window.liff === 'undefined') {
        setLiffState('UNAVAILABLE')
        setError('LINEアプリ内でのみご利用いただけます。')
        return
      }

      // LIFF初期化
      await window.liff.init({
        liffId: import.meta.env.VITE_LIFF_ID || 'your-liff-id-here'
      })

      // ログイン状態チェック
      if (window.liff.isLoggedIn()) {
        setIsLoggedIn(true)
        
        // ユーザー情報取得
        const profile = await window.liff.getProfile()
        const user = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage
        }
        setLineUser(user)
        
        // APIクライアントに認証情報を設定
        const storeId = import.meta.env.VITE_STORE_ID || '1'
        liffApi.setAuth(user.userId, storeId)
      } else {
        // 未ログインの場合はログイン画面にリダイレクト
        window.liff.login()
        return
      }

      setLiffState('INITIALIZED')
      setError(null)

    } catch (err) {
      console.error('LIFF初期化エラー:', err)
      setLiffState('ERROR')
      setError('LIFFの初期化に失敗しました。')
    }
  }, [])

  /**
   * LINEログイン処理
   */
  const login = useCallback(async () => {
    try {
      if (window.liff && !window.liff.isLoggedIn()) {
        window.liff.login()
      }
    } catch (err) {
      console.error('LINEログインエラー:', err)
      setError('LINEログインに失敗しました。')
    }
  }, [])

  /**
   * LINEログアウト処理
   */
  const logout = useCallback(async () => {
    try {
      if (window.liff && window.liff.isLoggedIn()) {
        window.liff.logout()
        setLineUser(null)
        setIsLoggedIn(false)
      }
    } catch (err) {
      console.error('LINEログアウトエラー:', err)
      setError('LINEログアウトに失敗しました。')
    }
  }, [])

  /**
   * ユーザー情報更新
   */
  const refreshUserProfile = useCallback(async () => {
    try {
      if (window.liff && window.liff.isLoggedIn()) {
        const profile = await window.liff.getProfile()
        setLineUser({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage
        })
      }
    } catch (err) {
      console.error('ユーザー情報更新エラー:', err)
      setError('ユーザー情報の取得に失敗しました。')
    }
  }, [])

  /**
   * LIFF初期化
   */
  useEffect(() => {
    initializeLiff()
  }, [initializeLiff])

  /**
   * LIFF状態変更の監視
   */
  useEffect(() => {
    const handleLiffStateChange = () => {
      if (window.liff) {
        if (window.liff.isLoggedIn()) {
          setIsLoggedIn(true)
          refreshUserProfile()
        } else {
          setIsLoggedIn(false)
          setLineUser(null)
        }
      }
    }

    // LIFF状態変更イベントの監視
    if (window.liff) {
      window.liff.on('statechange', handleLiffStateChange)
    }

    return () => {
      if (window.liff) {
        window.liff.off('statechange', handleLiffStateChange)
      }
    }
  }, [refreshUserProfile])

  return {
    liffState,
    lineUser,
    isLoggedIn,
    error,
    login,
    logout,
    refreshUserProfile,
    initializeLiff
  }
}

/**
 * LIFF SDKの型定義拡張
 */
declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      login: () => void
      logout: () => void
      getProfile: () => Promise<{
        userId: string
        displayName: string
        pictureUrl?: string
        statusMessage?: string
      }>
      on: (event: string, callback: () => void) => void
      off: (event: string, callback: () => void) => void
    }
  }
} 