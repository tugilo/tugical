/**
 * tugical Admin Dashboard 予約管理ページ
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { useUIStore, useToast } from '../../../stores/uiStore';
import { bookingApi, menuApi } from '../../../services/api';
import { Booking, FilterOptions, Menu } from '../../../types';
import Card from '../../../components/admin/ui/Card';
import Button from '../../../components/admin/ui/Button';
import LoadingScreen from '../../../components/admin/ui/LoadingScreen';
import BookingTimelineView from '../../../components/admin/booking/BookingTimelineView';
import CombinationBookingModal from '../../../components/admin/booking/CombinationBookingModal';
import BookingDetailModal from '../../../components/admin/booking/BookingDetailModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon,
  Bars3Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

const BookingsPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const { addToast } = useToast();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();

  // 状態管理
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // モバイルはリスト既定、デスクトップはタイムライン既定（ユーザー切替後は維持）
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches
      ? 'timeline'
      : 'list'
  );
  const [viewModeTouched, setViewModeTouched] = useState(false);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [isCreateModalNewOpen, setIsCreateModalNewOpen] = useState(false);
  const [detailBookingId, setDetailBookingId] = useState<number | null>(null);
  const [timelineSlotInfo, setTimelineSlotInfo] = useState<{
    date: string;
    startTime: string;
    resourceId: string;
  } | null>(null);

  useEffect(() => {
    setPageTitle('予約管理');
  }, [setPageTitle]);

  // 画面幅変化時、ユーザーが明示切替していなければ既定を合わせる
  useEffect(() => {
    if (!viewModeTouched) {
      setViewMode(isMdUp ? 'timeline' : 'list');
    }
  }, [isMdUp, viewModeTouched]);

  // ダッシュボード等から「新規予約」で遷移した場合
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setTimelineSlotInfo(null);
      setIsCreateModalNewOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  /**
   * メニュー一覧を取得
   * Phase 25.3: 複数メニュー組み合わせ予約作成用
   */
  const fetchMenus = useCallback(async () => {
    try {
      const response = await menuApi.getList({
        per_page: 100,
        is_active: true,
      });
      setMenus(response.menus || []);
    } catch (error: any) {
      console.error('Failed to fetch menus:', error);
    }
  }, []);

  /**
   * 予約一覧を取得
   */
  const fetchBookings = useCallback(async () => {
    try {
      const filters: FilterOptions = {
        page: currentPage,
        per_page: 100, // 統一: 両方とも100件取得
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: dateFilter || undefined, // 統一: 両方とも日付フィルターを有効
        sort: '-booking_date,start_time',
      };

      const response = await bookingApi.getList(filters);
      setBookings(response.bookings);
      setTotalPages(response.pagination.last_page);
      setTotalCount(response.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch bookings:', error);
      addToast({
        type: 'error',
        title: '予約一覧の取得に失敗しました',
        message:
          error.response?.data?.error?.message ||
          'しばらく時間をおいて再度お試しください',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, searchTerm, statusFilter, dateFilter, addToast]); // viewModeを依存関係から削除

  // 初回読み込み
  useEffect(() => {
    fetchBookings();
    fetchMenus(); // Phase 25.3: メニューデータも取得
  }, [fetchBookings, fetchMenus]);

  /**
   * 検索処理
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  /**
   * フィルター変更
   */
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  /**
   * 日付フィルター変更
   */
  const handleDateFilterChange = (date: string) => {
    setDateFilter(date);
    setCurrentPage(1);
  };

  /**
   * リフレッシュ
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBookings();
  };

  /**
   * 予約詳細を開く
   */
  const handleBookingClick = (booking: Booking) => {
    setDetailBookingId(booking.id);
  };

  /**
   * 新規予約作成（単一 CTA）
   */
  const handleCreateBookingNew = () => {
    setTimelineSlotInfo(null);
    setIsCreateModalNewOpen(true);
  };

  /**
   * Timeline空きスロットクリック時の予約作成処理
   * Phase 25.15: 根本的な再読み込み問題修正（日付状態管理追加）
   */
  const handleTimelineBookingCreate = (slotInfo: {
    start: Date;
    end: Date;
    resourceId: string;
  }) => {
    const rawStart = slotInfo.start;

    // 正しい時間取得（method1_directが正確）
    const finalDate = `${rawStart.getFullYear()}-${(rawStart.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${rawStart.getDate().toString().padStart(2, '0')}`;
    const finalTime = `${rawStart
      .getHours()
      .toString()
      .padStart(2, '0')}:${rawStart.getMinutes().toString().padStart(2, '0')}`;

    console.log(
      '🎯 Timeline空きスロットクリック（Phase 25.15 - 根本的修正）:',
      {
        date: finalDate,
        time: finalTime,
        resourceId: slotInfo.resourceId,
      }
    );

    // Phase 25.15: 日付状態を更新（再読み込み防止）
    setTimelineDate(rawStart);

    // Timeline統合時の初期値を設定
    setTimelineSlotInfo({
      date: finalDate,
      startTime: finalTime,
      resourceId: slotInfo.resourceId,
    });

    // Timeline統合予約作成モーダルを開く（新しいフロー）
    setIsCreateModalNewOpen(true);
  };

  /**
   * 新規予約作成完了
   */
  const handleBookingCreatedNew = (newBooking: Booking) => {
    console.log('✨ 新しい複数メニュー予約作成完了:', newBooking);

    // 予約一覧を再取得
    fetchBookings();

    // 新しいモーダルを閉じる
    setIsCreateModalNewOpen(false);
  };

  /**
   * 予約を日付別にグループ化
   */
  const groupBookingsByDate = (bookings: Booking[]) => {
    const groups: { [key: string]: Booking[] } = {};

    bookings.forEach(booking => {
      const date = booking.booking_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(booking);
    });

    // 日付順でソート
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, bookings]) => ({
        date,
        bookings: bookings.sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        ),
      }));
  };

  /**
   * 日付ヘッダーのフォーマット
   */
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return (
        '今日 ' +
        date.toLocaleDateString('ja-JP', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })
      );
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return (
        '明日 ' +
        date.toLocaleDateString('ja-JP', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })
      );
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
  };

  /**
   * 時間のフォーマット
   */
  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5);
  };

  /**
   * 所要時間の計算
   * Phase 23対応: 複数メニュー組み合わせに対応
   */
  const calculateDuration = (booking: Booking): number => {
    // 単一メニュー予約の場合
    if (booking.booking_type === 'single' && booking.menu) {
      return booking.menu.base_duration || booking.menu.duration || 60;
    }

    // 複数メニュー組み合わせ予約の場合
    if (booking.details && booking.details.length > 0) {
      return booking.details.reduce((total, detail) => {
        const d = detail as typeof detail & { total_duration?: number; base_duration?: number };
        return (
          total +
          (detail.duration_minutes ||
            d.total_duration ||
            d.base_duration ||
            0)
        );
      }, 0);
    }

    // フォールバック（古いデータ対応）
    if (booking.menu) {
      return booking.menu.base_duration || booking.menu.duration || 60;
    }

    // デフォルト値
    return 60;
  };

  /**
   * ステータスのスタイル
   */
  const getStatusStyle = (status: string): string => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
      no_show: 'bg-red-200 text-red-900',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  /**
   * ステータスのラベル
   */
  const getStatusLabel = (status: string): string => {
    const labels = {
      pending: '申込み中',
      confirmed: '確定',
      cancelled: 'キャンセル',
      completed: '完了',
      no_show: '無断キャンセル',
    };
    return labels[status as keyof typeof labels] || status;
  };

  /**
   * 担当（リソース）表示名
   */
  const getResourceName = (booking: Booking): string => {
    if (booking.resource) {
      return booking.resource.display_name || booking.resource.name;
    }
    return '担当未指定';
  };

  /**
   * メニュー名の取得（複数メニュー・service_name 対応）
   */
  const getMenuName = (booking: Booking): string => {
    if (booking.details && booking.details.length > 0) {
      return booking.details
        .map(detail => {
          const d = detail as typeof detail & { service_name?: string };
          return d.service_name || detail.menu?.display_name || detail.menu?.name;
        })
        .filter(Boolean)
        .join(' + ') || 'メニューを確認';
    }
    if (booking.menu) {
      return booking.menu.display_name || booking.menu.name;
    }
    return 'メニューを確認';
  };

  /**
   * 終了時刻表示（同一時刻のときは所要時間から補完）
   */
  const formatEndTime = (booking: Booking): string => {
    const start = formatTime(booking.start_time);
    const end = formatTime(booking.end_time);
    if (end && end !== start) return end;
    const mins = calculateDuration(booking);
    if (!mins) return end || start;
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + mins;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className='space-y-6'>
      {/* ヘッダー */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>予約管理</h1>
          <p className='text-sm text-gray-600 mt-1'>全 {totalCount} 件の予約</p>
        </div>
        <div className='flex gap-3'>
          <Button
            variant='outline'
            leftIcon={<ArrowPathIcon className='w-4 h-4' />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            更新
          </Button>
          <div className='flex border border-gray-300 rounded-lg overflow-hidden'>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              leftIcon={<Bars3Icon className='w-4 h-4' />}
              onClick={() => {
                setViewModeTouched(true);
                setViewMode('list');
              }}
              className='rounded-none border-0'
            >
              リスト
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
              leftIcon={<TableCellsIcon className='w-4 h-4' />}
              onClick={() => {
                setViewModeTouched(true);
                setViewMode('timeline');
              }}
              className='rounded-none border-0'
            >
              タイムライン
            </Button>
          </div>
          <Button
            variant='primary'
            leftIcon={<PlusIcon className='w-4 h-4' />}
            onClick={handleCreateBookingNew}
            className='bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
          >
            新規予約
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <Card.Body>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {/* 検索 */}
            <div className='relative'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='顧客名・予約番号で検索'
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>

            {/* ステータスフィルター */}
            <select
              value={statusFilter}
              onChange={e => handleStatusFilterChange(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
            >
              <option value='all'>すべてのステータス</option>
              <option value='pending'>申込み中</option>
              <option value='confirmed'>確定</option>
              <option value='completed'>完了</option>
              <option value='cancelled'>キャンセル</option>
              <option value='no_show'>無断キャンセル</option>
            </select>

            {/* 日付フィルター */}
            <div className='relative'>
              <CalendarIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='date'
                value={dateFilter}
                onChange={e => handleDateFilterChange(e.target.value)}
                className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>

            {/* フィルタークリア */}
            <Button
              variant='ghost'
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('');
                setCurrentPage(1);
              }}
              disabled={!searchTerm && statusFilter === 'all' && !dateFilter}
            >
              フィルターをクリア
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* 予約一覧 */}
      {bookings.length === 0 ? (
        <Card>
          <Card.Body>
            <div className='text-center py-12'>
              <CalendarIcon className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>予約が見つかりませんでした</p>
              {(searchTerm || statusFilter !== 'all' || dateFilter) && (
                <p className='text-sm text-gray-500 mt-2'>
                  フィルター条件を変更してみてください
                </p>
              )}
              {!searchTerm && statusFilter === 'all' && !dateFilter && (
                <div className='mt-4'>
                  <Button
                    variant='primary'
                    leftIcon={<PlusIcon className='w-4 h-4' />}
                    onClick={handleCreateBookingNew}
                  >
                    新規予約を作成
                  </Button>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : viewMode === 'timeline' ? (
        <BookingTimelineView
          date={timelineDate}
          bookings={bookings}
          onBookingClick={handleBookingClick}
          onBookingCreate={handleTimelineBookingCreate}
        />
      ) : (
        <div className='space-y-6'>
          {/* タイムライン形式の予約一覧 */}
          {groupBookingsByDate(bookings).map(
            ({ date, bookings: dayBookings }) => (
              <Card key={date}>
                <Card.Body className='p-0'>
                  {/* 日付ヘッダー */}
                  <div className='px-6 py-4 border-b border-gray-200 bg-gray-50'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {formatDateHeader(date)}
                      </h3>
                      <span className='text-sm text-gray-500'>
                        {dayBookings.length}件の予約
                      </span>
                    </div>
                  </div>

                  {/* その日の予約一覧 */}
                  <div className='divide-y divide-gray-100'>
                    {dayBookings.map(booking => (
                      <div
                        key={booking.id}
                        onClick={() => handleBookingClick(booking)}
                        className='px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors'
                      >
                        <div className='flex items-center justify-between'>
                          {/* 左側: 時間 + 顧客情報 */}
                          <div className='flex items-center space-x-4'>
                            {/* 時間 */}
                            <div className='flex-shrink-0 w-24 text-right'>
                              <div className='text-lg font-mono font-semibold text-gray-900'>
                                {formatTime(booking.start_time)} -{' '}
                                {formatEndTime(booking)}
                              </div>
                              <div className='text-xs text-gray-500'>
                                {calculateDuration(booking)}分
                              </div>
                            </div>

                            {/* 顧客情報 */}
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center space-x-2'>
                                <h4 className='text-base font-medium text-gray-900 truncate'>
                                  {booking.customer?.name || '顧客情報なし'}
                                </h4>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                                    booking.status
                                  )}`}
                                >
                                  {getStatusLabel(booking.status)}
                                </span>
                              </div>
                              <div className='flex items-center space-x-4 mt-1'>
                                <span className='text-sm text-gray-600'>
                                  {getMenuName(booking)}
                                </span>
                                <span className='text-sm text-gray-500'>
                                  担当: {getResourceName(booking)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 右側: 料金 */}
                          <div className='flex-shrink-0 text-right'>
                            <div className='text-lg font-semibold text-gray-900'>
                              ¥
                              {(
                                booking.total_price ||
                                booking.base_total_price ||
                                0
                              ).toLocaleString()}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {booking.booking_number}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )
          )}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && viewMode === 'list' && (
        <Card>
          <Card.Body>
            <div className='flex items-center justify-between'>
              <p className='text-sm text-gray-600'>
                {totalCount} 件中 {(currentPage - 1) * 20 + 1} -{' '}
                {Math.min(currentPage * 20, totalCount)} 件を表示
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <span className='px-3 py-2 text-sm text-gray-600'>
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant='outline'
                  onClick={() =>
                    setCurrentPage(prev => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* 新規予約作成モーダル */}
      {isCreateModalNewOpen && (
        <CombinationBookingModal
          isOpen={isCreateModalNewOpen}
          onClose={() => {
            setIsCreateModalNewOpen(false);
            setTimelineSlotInfo(null);
          }}
          onSuccess={handleBookingCreatedNew}
          menus={menus}
          initialDate={timelineSlotInfo?.date}
          initialStartTime={timelineSlotInfo?.startTime}
          initialResourceId={timelineSlotInfo?.resourceId}
        />
      )}

      {/* 予約詳細・変更・キャンセル */}
      <BookingDetailModal
        isOpen={detailBookingId !== null}
        bookingId={detailBookingId}
        onClose={() => setDetailBookingId(null)}
        onChanged={() => {
          fetchBookings();
        }}
      />
    </div>
  );
};

export default BookingsPage;
