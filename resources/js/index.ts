/**
 * tugical Admin Dashboard ユーティリティ関数
 * 
 * 機能:
 * - クラス名結合 (clsx wrapper)
 * - 日付・時間フォーマット
 * - 価格フォーマット
 * - ステータス表示
 * - バリデーション
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { BookingStatus, UserRole, ResourceType } from '../types';

// ========================================
// クラス名結合
// ========================================

/**
 * Tailwind CSS クラス名を結合
 * clsx のラッパー関数
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ========================================
// 日付・時間フォーマット
// ========================================

/**
 * 日付をフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @param formatStr フォーマット文字列
 * @returns フォーマット済み日付文字列
 */
export function formatDate(date: string | Date, formatStr: string = 'yyyy年M月d日'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '無効な日付';
    
    return format(dateObj, formatStr, { locale: ja });
  } catch (error) {
    console.warn('日付フォーマットエラー:', error);
    return '無効な日付';
  }
}

/**
 * 時間をフォーマット
 * @param time 時間文字列
 * @returns フォーマット済み時間文字列
 */
export function formatTime(time: string): string {
  try {
    // HH:mm 形式の時間文字列を想定
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.warn('時間フォーマットエラー:', error);
    return time;
  }
}

/**
 * 相対時間を表示
 * @param date 日付文字列またはDateオブジェクト
 * @returns 相対時間文字列
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '無効な日付';
    
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: ja 
    });
  } catch (error) {
    console.warn('相対時間フォーマットエラー:', error);
    return '不明';
  }
}

/**
 * 日付時刻を表示用にフォーマット
 * @param datetime 日付時刻文字列
 * @returns フォーマット済み文字列
 */
export function formatDateTime(datetime: string): string {
  try {
    const date = parseISO(datetime);
    if (!isValid(date)) return '無効な日付時刻';
    
    return format(date, 'M月d日(E) HH:mm', { locale: ja });
  } catch (error) {
    console.warn('日付時刻フォーマットエラー:', error);
    return '無効な日付時刻';
  }
}

// ========================================
// 価格・数値フォーマット
// ========================================

/**
 * 価格をフォーマット
 * @param price 価格（数値）
 * @param includeTax 税込み表示するか
 * @returns フォーマット済み価格文字列
 */
export function formatPrice(price: number, includeTax: boolean = true): string {
  try {
    const formatted = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
    
    return includeTax ? `${formatted}（税込）` : formatted;
  } catch (error) {
    console.warn('価格フォーマットエラー:', error);
    return `¥${price}`;
  }
}

/**
 * 数値をカンマ区切りでフォーマット
 * @param num 数値
 * @returns フォーマット済み数値文字列
 */
export function formatNumber(num: number): string {
  try {
    return new Intl.NumberFormat('ja-JP').format(num);
  } catch (error) {
    console.warn('数値フォーマットエラー:', error);
    return String(num);
  }
}

/**
 * パーセンテージをフォーマット
 * @param value 数値（0-1 または 0-100）
 * @param isDecimal 小数点形式か（0-1）
 * @returns フォーマット済みパーセンテージ文字列
 */
export function formatPercentage(value: number, isDecimal: boolean = true): string {
  try {
    const percentage = isDecimal ? value * 100 : value;
    return `${percentage.toFixed(1)}%`;
  } catch (error) {
    console.warn('パーセンテージフォーマットエラー:', error);
    return `${value}%`;
  }
}

// ========================================
// ステータス表示
// ========================================

/**
 * 予約ステータスの表示名を取得
 * @param status 予約ステータス
 * @returns 日本語表示名
 */
export function getBookingStatusLabel(status: BookingStatus): string {
  const statusLabels: Record<BookingStatus, string> = {
    pending: '申込み中',
    confirmed: '確定',
    cancelled: 'キャンセル',
    completed: '完了',
    no_show: '無断キャンセル',
  };
  
  return statusLabels[status] || status;
}

/**
 * 予約ステータスのCSSクラスを取得
 * @param status 予約ステータス
 * @returns Tailwind CSSクラス
 */
export function getBookingStatusClass(status: BookingStatus): string {
  const statusClasses: Record<BookingStatus, string> = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    cancelled: 'badge-cancelled',
    completed: 'badge-completed',
    no_show: 'badge-cancelled',
  };
  
  return statusClasses[status] || 'badge';
}

/**
 * ユーザー役割の表示名を取得
 * @param role ユーザー役割
 * @returns 日本語表示名
 */
export function getUserRoleLabel(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    owner: 'オーナー',
    manager: 'マネージャー',
    staff: 'スタッフ',
    reception: '受付',
  };
  
  return roleLabels[role] || role;
}

/**
 * リソースタイプの表示名を取得
 * @param type リソースタイプ
 * @returns 日本語表示名
 */
export function getResourceTypeLabel(type: ResourceType): string {
  const typeLabels: Record<ResourceType, string> = {
    staff: 'スタッフ',
    room: '部屋',
    equipment: '設備',
    vehicle: '車両',
  };
  
  return typeLabels[type] || type;
}

// ========================================
// バリデーション
// ========================================

/**
 * メールアドレスの形式チェック
 * @param email メールアドレス
 * @returns 有効かどうか
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 電話番号の形式チェック（日本の形式）
 * @param phone 電話番号
 * @returns 有効かどうか
 */
export function isValidPhone(phone: string): boolean {
  // ハイフンあり・なし両方対応
  const phoneRegex = /^(0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * 時間形式のチェック（HH:mm）
 * @param time 時間文字列
 * @returns 有効かどうか
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// ========================================
// データ変換
// ========================================

/**
 * オブジェクトから空の値を除去
 * @param obj オブジェクト
 * @returns 空の値を除去したオブジェクト
 */
export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      result[key as keyof T] = value;
    }
  });
  
  return result;
}

/**
 * 配列をページ分割
 * @param array 配列
 * @param page ページ番号（1から開始）
 * @param perPage 1ページあたりの件数
 * @returns ページ分割結果
 */
export function paginateArray<T>(
  array: T[], 
  page: number, 
  perPage: number
): { data: T[]; total: number; totalPages: number } {
  const offset = (page - 1) * perPage;
  const data = array.slice(offset, offset + perPage);
  const total = array.length;
  const totalPages = Math.ceil(total / perPage);
  
  return { data, total, totalPages };
}

/**
 * URLクエリパラメータをオブジェクトに変換
 * @param search URLSearchParams文字列
 * @returns クエリパラメータオブジェクト
 */
export function parseQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

// ========================================
// デバッグ・開発用
// ========================================

/**
 * 開発環境でのみコンソール出力
 * @param message メッセージ
 * @param data データ
 */
export function devLog(message: string, data?: any): void {
  if (import.meta.env.DEV) {
    console.log(`[tugical] ${message}`, data);
  }
}

/**
 * パフォーマンス測定
 * @param label ラベル
 * @param fn 実行する関数
 * @returns 関数の実行結果
 */
export async function measurePerformance<T>(
  label: string, 
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    
    devLog(`${label} 実行時間: ${(end - start).toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const end = performance.now();
    devLog(`${label} エラー (実行時間: ${(end - start).toFixed(2)}ms)`, error);
    throw error;
  }
} 