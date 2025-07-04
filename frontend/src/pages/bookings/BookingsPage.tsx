/**
 * tugical Admin Dashboard 予約管理ページ
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useUIStore, useToast } from '../../stores/uiStore';
import { bookingApi } from '../../services/api';
import { Booking, FilterOptions } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import BookingCard from '../../components/booking/BookingCard';
import BookingCreateModal from '../../components/booking/BookingCreateModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const BookingsPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const { addToast } = useToast();

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

  // モーダル状態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setPageTitle('予約管理');
  }, [setPageTitle]);

  /**
   * 予約一覧を取得
   */
  const fetchBookings = useCallback(async () => {
    try {
      const filters: FilterOptions = {
        page: currentPage,
        per_page: 20,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: dateFilter || undefined,
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
  }, [currentPage, searchTerm, statusFilter, dateFilter, addToast]);

  // 初回読み込み
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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
    // TODO: 詳細モーダルを開く
    console.log('Booking clicked:', booking);
  };

  /**
   * 新規予約作成ボタンクリック
   */
  const handleCreateBooking = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * 予約作成完了
   */
  const handleBookingCreated = (newBooking: Booking) => {
    // 予約一覧を再取得
    fetchBookings();
    addToast({
      type: 'success',
      title: '予約が作成されました',
      message: `予約番号: ${newBooking.booking_number}`,
    });
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
          <Button
            variant='primary'
            leftIcon={<PlusIcon className='w-4 h-4' />}
            onClick={handleCreateBooking}
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
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {bookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onClick={handleBookingClick}
              mode='compact'
            />
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
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
                  size='sm'
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <div className='flex items-center gap-1'>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = currentPage - 2 + i;
                    if (page < 1 || page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size='sm'
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* 予約作成モーダル */}
      <BookingCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleBookingCreated}
      />
    </div>
  );
};

export default BookingsPage;
