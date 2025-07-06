import React, { useEffect, useState } from 'react';
import { Booking, Resource } from '../../types';
import { resourceApi } from '../../services/api';

interface SimpleTimelineViewProps {
  date: Date;
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
}

/**
 * 簡易タイムライン表示コンポーネント
 * FullCalendarの代替として、すべての予約を確実に表示
 */
const SimpleTimelineView: React.FC<SimpleTimelineViewProps> = ({
  date,
  bookings,
  onBookingClick,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // リソース（担当者）一覧取得
  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await resourceApi.getList({
          per_page: 100,
          is_active: true,
        });
        setResources(response.resources || []);
      } catch (error) {
        console.error('リソース取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResources();
  }, []);

  // 予約をリソース別にグループ化
  const bookingsByResource = React.useMemo(() => {
    const groups: { [key: string]: Booking[] } = {
      unassigned: [],
    };

    // リソース別グループを初期化
    resources.forEach(resource => {
      groups[resource.id.toString()] = [];
    });

    // 予約をグループ分け
    bookings.forEach(booking => {
      const resourceKey = booking.resource_id?.toString() || 'unassigned';
      if (!groups[resourceKey]) {
        groups[resourceKey] = [];
      }
      groups[resourceKey].push(booking);
    });

    return groups;
  }, [bookings, resources]);

  // 時間軸（9:00-21:00）
  const timeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // 予約の表示位置計算
  const getBookingPosition = (booking: Booking) => {
    const startTime = booking.start_time.substring(0, 5); // "10:00"
    const endTime = booking.end_time.substring(0, 5); // "11:20"

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = (startHour - 9) * 60 + startMin;
    const endMinutes = (endHour - 9) * 60 + endMin;
    const duration = endMinutes - startMinutes;

    return {
      left: `${(startMinutes / (12 * 60)) * 100}%`,
      width: `${(duration / (12 * 60)) * 100}%`,
    };
  };

  // 予約ステータス色
  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#fbbf24',
      confirmed: '#10b981',
      cancelled: '#ef4444',
      completed: '#6b7280',
      no_show: '#dc2626',
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  // メニュー名の取得
  // Phase 23対応: 複数メニュー組み合わせに対応
  const getMenuName = (booking: Booking): string => {
    // 単一メニュー予約の場合
    if (booking.booking_type === 'single' && booking.menu) {
      return booking.menu.name;
    }

    // 複数メニュー組み合わせ予約の場合
    if (
      booking.booking_type === 'combination' &&
      booking.details &&
      booking.details.length > 0
    ) {
      const menuNames = booking.details.map(detail => detail.menu.name);
      return menuNames.join(' + ');
    }

    // フォールバック（古いデータ対応）
    if (booking.menu) {
      return booking.menu.name;
    }

    // デフォルト値
    return 'メニュー未設定';
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500'></div>
        <span className='ml-3 text-gray-600'>
          タイムラインを読み込んでいます...
        </span>
      </div>
    );
  }

  return (
    <div className='simple-timeline bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
      {/* ヘッダー */}
      <div className='mb-4'>
        <h3 className='text-lg font-semibold text-gray-900'>
          予約タイムライン - {bookings.length}件の予約
        </h3>
        <p className='text-sm text-gray-600'>
          すべての予約を表示（FullCalendarの代替表示）
        </p>
      </div>

      {/* 時間軸 */}
      <div className='mb-4'>
        <div className='flex border-b border-gray-200 pb-2'>
          <div className='w-32 text-sm font-medium text-gray-700'>担当者</div>
          <div className='flex-1 relative'>
            <div className='flex justify-between text-xs text-gray-500'>
              {timeSlots.map(time => (
                <span key={time}>{time}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* リソース行 */}
      <div className='space-y-2'>
        {/* 指定なし */}
        {bookingsByResource.unassigned?.length > 0 && (
          <div className='flex items-center border-b border-gray-100 pb-2'>
            <div className='w-32 text-sm font-medium text-gray-600'>
              指定なし ({bookingsByResource.unassigned.length}件)
            </div>
            <div className='flex-1 relative h-12 bg-gray-50 rounded'>
              {bookingsByResource.unassigned.map(booking => {
                const position = getBookingPosition(booking);
                return (
                  <div
                    key={booking.id}
                    className='absolute top-1 h-10 rounded px-2 py-1 text-xs text-white cursor-pointer shadow-sm'
                    style={{
                      left: position.left,
                      width: position.width,
                      backgroundColor: getStatusColor(booking.status),
                      minWidth: '80px',
                    }}
                    onClick={() => onBookingClick?.(booking)}
                  >
                    <div className='font-semibold truncate'>
                      {booking.customer.name}
                    </div>
                    <div className='truncate opacity-75'>
                      {getMenuName(booking)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* スタッフリソース */}
        {resources.map(resource => {
          const resourceBookings =
            bookingsByResource[resource.id.toString()] || [];
          return (
            <div
              key={resource.id}
              className='flex items-center border-b border-gray-100 pb-2'
            >
              <div className='w-32 text-sm font-medium text-gray-900'>
                {resource.display_name || resource.name} (
                {resourceBookings.length}件)
              </div>
              <div className='flex-1 relative h-12 bg-gray-50 rounded'>
                {resourceBookings.map(booking => {
                  const position = getBookingPosition(booking);
                  return (
                    <div
                      key={booking.id}
                      className='absolute top-1 h-10 rounded px-2 py-1 text-xs text-white cursor-pointer shadow-sm'
                      style={{
                        left: position.left,
                        width: position.width,
                        backgroundColor: getStatusColor(booking.status),
                        minWidth: '80px',
                      }}
                      onClick={() => onBookingClick?.(booking)}
                    >
                      <div className='font-semibold truncate'>
                        {booking.customer.name}
                      </div>
                      <div className='truncate opacity-75'>
                        {getMenuName(booking)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 予約サマリー */}
      <div className='mt-4 p-3 bg-gray-50 rounded'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
          <div>
            <span className='font-medium'>総予約数:</span> {bookings.length}件
          </div>
          <div>
            <span className='font-medium'>指定なし:</span>{' '}
            {bookingsByResource.unassigned?.length || 0}件
          </div>
          <div>
            <span className='font-medium'>リソース数:</span> {resources.length}
            個
          </div>
          <div>
            <span className='font-medium'>表示範囲:</span> 9:00-21:00
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTimelineView;
