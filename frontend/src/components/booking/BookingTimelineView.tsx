import React, { useRef, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { Booking, Resource } from '../../types';
import { useUIStore } from '../../stores/uiStore';
import { resourceApi } from '../../services/api';

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

// リソースの型定義
interface CalendarResource {
  id: string;
  title: string;
  extendedProps?: {
    type: string;
    color: string;
    photo?: string;
  };
}

/**
 * 予約タイムライン表示コンポーネント
 *
 * FullCalendar Timelineを使用して美容室の予約を視覚的に表示
 * - 横軸: 時間（9:00-20:00）
 * - 縦軸: 担当者（スタッフ・リソース）
 * - ドラッグ&ドロップ対応
 * - リアルタイム更新
 */
const BookingTimelineView: React.FC<BookingTimelineViewProps> = props => {
  const { date, bookings, onBookingClick, onBookingCreate, onBookingMove } =
    props;

  const calendarRef = useRef<FullCalendar>(null);
  const { addNotification } = useUIStore();

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
        addNotification({
          type: 'error',
          title: 'リソース取得エラー',
          message: '担当者情報の取得に失敗しました',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadResources();
  }, [addNotification]);

  // FullCalendar用のリソースデータ変換
  const calendarResources: CalendarResource[] = [
    // 「指定なし」リソース
    {
      id: 'unassigned',
      title: '指定なし',
      extendedProps: {
        type: 'unassigned',
        color: '#6b7280',
      },
    },
    // スタッフリソース
    ...resources.map(
      (resource): CalendarResource => ({
        id: resource.id.toString(),
        title: resource.display_name || resource.name,
        extendedProps: {
          type: resource.type,
          color: getResourceColor(resource.type),
          photo: resource.image_url,
        },
      })
    ),
  ];

  // FullCalendar用のイベントデータ変換
  const calendarEvents: EventInput[] = bookings.map((booking): EventInput => {
    // booking_dateから日付部分を取得（ISO形式: "2025-07-04T15:00:00.000000Z"）
    const bookingDate = new Date(booking.booking_date);
    const dateStr = bookingDate.toISOString().split('T')[0]; // "2025-07-04"

    // start_timeとend_timeを正規化（秒がない場合は追加）
    const normalizeTime = (time: string): string => {
      if (time.length === 5) return `${time}:00`; // "11:00" → "11:00:00"
      return time; // "10:00:00" はそのまま
    };

    const startTime = normalizeTime(booking.start_time);
    const endTime = normalizeTime(booking.end_time);

    // 日付と時間を結合してDateオブジェクト作成
    const startDateTime = new Date(`${dateStr}T${startTime}`);
    const endDateTime = new Date(`${dateStr}T${endTime}`);

    const event = {
      id: booking.id.toString(),
      title: `${booking.customer.name} - ${booking.menu.name}`,
      start: startDateTime,
      end: endDateTime,
      resourceId: booking.resource_id
        ? booking.resource_id.toString()
        : 'unassigned',
      backgroundColor: getStatusColor(booking.status),
      borderColor: getStatusBorderColor(booking.status),
      textColor: getStatusTextColor(booking.status),
      extendedProps: {
        booking: booking,
        customerName: booking.customer.name,
        menuName: booking.menu.name,
        price: booking.total_price,
        status: booking.status,
        notes: booking.customer_notes,
      },
    };

    // デバッグ用ログ
    console.log('Booking event created:', {
      id: event.id,
      title: event.title,
      originalBookingDate: booking.booking_date,
      originalStartTime: booking.start_time,
      originalEndTime: booking.end_time,
      processedDateStr: dateStr,
      processedStartTime: startTime,
      processedEndTime: endTime,
      finalStart: event.start,
      finalEnd: event.end,
      startValid: !isNaN(event.start.getTime()),
      endValid: !isNaN(event.end.getTime()),
      resourceId: event.resourceId,
    });

    return event;
  });

  // デバッグ用ログ
  console.log('Timeline Debug Info:', {
    displayDate: date,
    displayDateISO: date.toISOString(),
    bookingsCount: bookings.length,
    resourcesCount: resources.length,
    eventsCount: calendarEvents.length,
    calendarDateRange: {
      start: '2025-07-01',
      end: '2025-08-31',
    },
    bookingDates: bookings.map(b => ({
      id: b.id,
      originalDate: b.booking_date,
      extractedDate: new Date(b.booking_date).toISOString().split('T')[0],
      startTime: b.start_time,
      endTime: b.end_time,
    })),
    eventsWithDates: calendarEvents.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      startISO:
        e.start instanceof Date ? e.start.toISOString() : String(e.start),
      endISO: e.end instanceof Date ? e.end.toISOString() : String(e.end),
      resourceId: e.resourceId,
    })),
  });

  /**
   * リソースタイプ別の色分け
   */
  function getResourceColor(type: string): string {
    const colors = {
      staff: '#10b981', // エメラルドグリーン
      room: '#3b82f6', // ブルー
      equipment: '#8b5cf6', // パープル
      vehicle: '#f59e0b', // アンバー
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  /**
   * 予約ステータス別の背景色
   */
  function getStatusColor(status: string): string {
    const colors = {
      pending: '#fbbf24', // イエロー
      confirmed: '#10b981', // グリーン
      cancelled: '#ef4444', // レッド
      completed: '#6b7280', // グレー
      no_show: '#dc2626', // ダークレッド
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  }

  /**
   * 予約ステータス別のボーダー色
   */
  function getStatusBorderColor(status: string): string {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#059669',
      cancelled: '#dc2626',
      completed: '#4b5563',
      no_show: '#991b1b',
    };
    return colors[status as keyof typeof colors] || '#4b5563';
  }

  /**
   * 予約ステータス別のテキスト色
   */
  function getStatusTextColor(status: string): string {
    return status === 'completed' ? '#ffffff' : '#000000';
  }

  /**
   * 予約クリック処理
   */
  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps.booking;
    if (booking && onBookingClick) {
      onBookingClick(booking);
    }
  };

  /**
   * 空き時間クリック処理（新規予約作成）
   */
  const handleDateSelect = (info: any) => {
    if (onBookingCreate) {
      onBookingCreate({
        start: info.start,
        end: info.end,
        resourceId: info.resource?.id,
      });
    }
  };

  /**
   * 予約ドラッグ&ドロップ処理
   */
  const handleEventDrop = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    const newResourceId = info.event.getResources()[0]?.id;

    if (booking && onBookingMove) {
      try {
        await onBookingMove(booking, newStart, newEnd, newResourceId);

        addNotification({
          type: 'success',
          title: '予約移動完了',
          message: `${booking.customer.name}様の予約を移動しました`,
        });
      } catch (error) {
        // エラー時は元の位置に戻す
        info.revert();

        addNotification({
          type: 'error',
          title: '予約移動エラー',
          message: '予約の移動に失敗しました',
        });
      }
    }
  };

  /**
   * 予約リサイズ処理
   */
  const handleEventResize = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newStart = info.event.start;
    const newEnd = info.event.end;

    if (booking && onBookingMove) {
      try {
        await onBookingMove(booking, newStart, newEnd);

        addNotification({
          type: 'success',
          title: '予約時間変更完了',
          message: `${booking.customer.name}様の予約時間を変更しました`,
        });
      } catch (error) {
        // エラー時は元のサイズに戻す
        info.revert();

        addNotification({
          type: 'error',
          title: '予約時間変更エラー',
          message: '予約時間の変更に失敗しました',
        });
      }
    }
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
    <div className='booking-timeline bg-white rounded-lg shadow-sm border border-gray-200'>
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView='resourceTimelineWeek'
        initialDate={
          bookings.length > 0 ? new Date(bookings[0].booking_date) : date
        }
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right:
            'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
        }}
        resources={calendarResources}
        events={calendarEvents}
        // 時間設定
        slotMinTime='09:00:00'
        slotMaxTime='21:00:00'
        slotDuration='00:30:00'
        slotLabelInterval='01:00:00'
        // 週表示設定
        dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
        // インタラクション設定
        selectable={true}
        editable={true}
        eventResizableFromStart={true}
        eventDurationEditable={true}
        eventResourceEditable={true}
        // 日本語設定
        locale='ja'
        timeZone='Asia/Tokyo'
        // スタイル設定
        height='auto'
        contentHeight={500}
        resourceAreaWidth='200px'
        // 全ての予約を表示するため、日付範囲を拡張
        validRange={{
          start: '2025-07-01',
          end: '2025-08-31',
        }}
        // イベントハンドラー
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        // カスタムスタイル
        eventContent={info => (
          <div className='p-1 text-xs'>
            <div className='font-semibold truncate'>
              {info.event.extendedProps.customerName}
            </div>
            <div className='truncate opacity-75'>
              {info.event.extendedProps.menuName}
            </div>
            <div className='font-medium'>
              ¥{info.event.extendedProps.price?.toLocaleString()}
            </div>
          </div>
        )}
        // リソースヘッダー
        resourceLabelContent={info => (
          <div className='flex items-center p-2'>
            {info.resource.extendedProps.photo && (
              <img
                src={info.resource.extendedProps.photo}
                alt={info.resource.title}
                className='w-8 h-8 rounded-full mr-2'
              />
            )}
            <div>
              <div className='font-medium text-sm'>{info.resource.title}</div>
              <div className='text-xs text-gray-500 capitalize'>
                {info.resource.extendedProps.type}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default BookingTimelineView;
