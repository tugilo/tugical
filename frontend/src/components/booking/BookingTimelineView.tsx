import React from 'react';
import { Booking } from '../../types';

interface BookingTimelineViewProps {
  date: Date;
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
  onBookingCreate?: (info: {
    start: Date;
    end: Date;
    resourceId: string;
  }) => void;
  onBookingMove?: (
    booking: Booking,
    newStart: Date,
    newEnd: Date,
    newResourceId?: string
  ) => Promise<void>;
}

const BookingTimelineView: React.FC<BookingTimelineViewProps> = ({
  date,
  bookings,
  onBookingClick,
  onBookingCreate,
  onBookingMove,
}) => {
  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
      <div className='text-center py-12'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          📅 タイムライン表示
        </h3>
        <p className='text-gray-600 mb-4'>
          FullCalendar Timelineによる予約管理画面
        </p>
        <div className='text-sm text-gray-500'>
          <p>表示日: {date.toLocaleDateString('ja-JP')}</p>
          <p>予約件数: {bookings.length}件</p>
        </div>
        <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
          <p className='text-sm text-blue-700'>
            🚧 FullCalendar Timeline実装中
            <br />
            横軸: 時間（9:00-20:00）
            <br />
            縦軸: 担当者（スタッフ・リソース）
            <br />
            ドラッグ&ドロップ対応予定
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingTimelineView;
