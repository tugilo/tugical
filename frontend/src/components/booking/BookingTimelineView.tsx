import React, { useRef, useEffect, useState, useMemo } from 'react';
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

/**
 * リソースタイプ別カラー取得
 */
const getResourceColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    staff: '#10b981', // ミントグリーン
    room: '#3b82f6', // ブルー
    equipment: '#f59e0b', // オレンジ
    vehicle: '#8b5cf6', // パープル
    unassigned: '#6b7280', // グレー
  };
  return colors[type] || colors.unassigned;
};

/**
 * 予約ステータス別カラー取得
 */
const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    pending: '#f59e0b', // 申込み中（オレンジ）
    confirmed: '#10b981', // 確定（グリーン）
    cancelled: '#ef4444', // キャンセル（レッド）
    completed: '#6b7280', // 完了（グレー）
    no_show: '#dc2626', // 無断キャンセル（ダークレッド）
  };
  return colors[status] || colors.pending;
};

/**
 * FullCalendar Timeline標準仕様準拠のリソース変換
 */
const convertToFullCalendarResources = (resources: Resource[]) => {
  // 標準仕様: 必須フィールド id, title
  const standardResources = [
    // 「指定なし」リソース（resource_id = null 用）
    {
      id: 'unassigned',
      title: '指定なし',
      extendedProps: {
        type: 'unassigned',
        color: '#6b7280',
        description: 'リソース未指定の予約',
      },
    },
    // 実際のリソース
    ...resources.map(resource => ({
      id: String(resource.id), // 必須: 文字列に変換
      title: resource.display_name || resource.name, // 必須: 表示名
      extendedProps: {
        type: resource.type,
        color: getResourceColor(resource.type),
        originalData: resource,
      },
    })),
  ];

  return standardResources;
};

/**
 * FullCalendar Timeline標準仕様準拠のイベント変換
 */
const convertToFullCalendarEvents = (bookings: Booking[]): EventInput[] => {
  return bookings.map(booking => {
    // 日付の正規化（ISO8601形式から日付部分を抽出）
    const bookingDate = new Date(booking.booking_date);
    const dateStr = bookingDate.toISOString().split('T')[0]; // "2025-07-05"

    // 時間の正規化（秒を補完）
    const normalizeTime = (time: string): string => {
      if (time.length === 5) return `${time}:00`; // "11:00" → "11:00:00"
      return time; // "10:00:00" そのまま
    };

    // 標準仕様: ISO8601形式の日時
    const startDateTime = new Date(
      `${dateStr}T${normalizeTime(booking.start_time)}`
    );
    const endDateTime = new Date(
      `${dateStr}T${normalizeTime(booking.end_time)}`
    );

    // 標準仕様準拠のイベントオブジェクト
    return {
      // 必須フィールド
      id: String(booking.id), // 必須: 一意識別子（文字列）
      title: `${booking.customer.name} - ${booking.menu.name}`, // 必須: 表示タイトル
      start: startDateTime.toISOString(), // 必須: ISO8601形式
      end: endDateTime.toISOString(), // オプション: ISO8601形式
      resourceId: booking.resource_id
        ? String(booking.resource_id)
        : 'unassigned', // 必須: リソースID（文字列）

      // オプションフィールド
      backgroundColor: getStatusColor(booking.status),
      borderColor: getStatusColor(booking.status),
      textColor: '#ffffff',

      // カスタムプロパティ
      extendedProps: {
        bookingNumber: booking.booking_number,
        status: booking.status,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        menuName: booking.menu.name,
        totalPrice: booking.total_price,
        customerNotes: booking.customer_notes,
        originalBooking: booking,
      },
    };
  });
};

/**
 * tugical FullCalendar Timeline コンポーネント
 *
 * 美容室・クリニック・レンタルスペース等の予約管理に最適化された
 * プロフェッショナルなタイムライン表示を提供
 */
const BookingTimelineView: React.FC<BookingTimelineViewProps> = ({
  date,
  bookings,
  onBookingClick,
  onBookingCreate,
  onBookingMove,
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const { addNotification } = useUIStore();

  // リソース一覧の取得
  useEffect(() => {
    const fetchResources = async () => {
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
          message: 'リソース一覧の取得に失敗しました',
          duration: 5000,
        });
      }
    };

    fetchResources();
  }, [addNotification]);

  // FullCalendar用データの変換（メモ化）
  const calendarResources = useMemo(() => {
    return convertToFullCalendarResources(resources);
  }, [resources]);

  const calendarEvents = useMemo(() => {
    return convertToFullCalendarEvents(bookings);
  }, [bookings]);

  // 最適な初期表示日の計算（メモ化）
  const optimalInitialDate = useMemo(() => {
    if (bookings.length > 0) {
      // 予約データがある日付を優先
      const bookingDates = bookings.map(b => new Date(b.booking_date));
      const sortedDates = bookingDates.sort(
        (a, b) => a.getTime() - b.getTime()
      );
      return sortedDates[0].toISOString().split('T')[0]; // "2025-07-05"
    }
    return date.toISOString().split('T')[0];
  }, [bookings, date]);

  // 開発環境でのみ統計情報を1回だけ出力
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && bookings.length > 0) {
      console.log('📊 FullCalendar Timeline Statistics:', {
        totalBookings: bookings.length,
        totalResources: resources.length,
        initialDate: optimalInitialDate,
        eventsGenerated: calendarEvents.length,
        resourcesGenerated: calendarResources.length,
      });
    }
  }, [
    bookings.length,
    resources.length,
    optimalInitialDate,
    calendarEvents.length,
    calendarResources.length,
  ]);

  return (
    <div className='booking-timeline-view bg-white rounded-lg shadow-sm border border-gray-200'>
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        // 基本設定
        initialView='resourceTimelineWeek'
        initialDate={optimalInitialDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineDay,resourceTimelineWeek',
        }}
        // 時間軸設定（美容室営業時間に最適化）
        slotMinTime='09:00:00'
        slotMaxTime='21:00:00'
        slotDuration='00:30:00'
        slotLabelInterval='01:00:00'
        // リソース設定
        resources={calendarResources}
        resourceAreaHeaderContent='担当者/リソース'
        resourceAreaWidth='200px'
        // イベント設定
        events={calendarEvents}
        eventDisplay='block'
        eventMinHeight={40}
        // インタラクション設定
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        // 日本語ローカライゼーション
        locale='ja'
        timeZone='Asia/Tokyo'
        // イベントハンドラー
        eventClick={info => {
          const booking = info.event.extendedProps.originalBooking;
          if (booking && onBookingClick) {
            onBookingClick(booking);
          }
        }}
        select={info => {
          if (onBookingCreate) {
            onBookingCreate({
              start: info.start,
              end: info.end,
              resourceId: info.resource?.id || 'unassigned',
            });
          }
        }}
        eventDrop={async info => {
          if (onBookingMove) {
            const booking = info.event.extendedProps.originalBooking;
            try {
              await onBookingMove(
                booking,
                info.event.start!,
                info.event.end!,
                info.event.getResources()[0]?.id
              );
            } catch (error) {
              info.revert();
              addNotification({
                type: 'error',
                title: '予約移動エラー',
                message: '予約の移動に失敗しました',
                duration: 5000,
              });
            }
          }
        }}
        eventResize={async info => {
          if (onBookingMove) {
            const booking = info.event.extendedProps.originalBooking;
            try {
              await onBookingMove(
                booking,
                info.event.start!,
                info.event.end!,
                info.event.getResources()[0]?.id
              );
            } catch (error) {
              info.revert();
              addNotification({
                type: 'error',
                title: '予約時間変更エラー',
                message: '予約時間の変更に失敗しました',
                duration: 5000,
              });
            }
          }
        }}
        // スタイリング
        height='auto'
        contentHeight={600}
        aspectRatio={1.8}
      />
    </div>
  );
};

export default BookingTimelineView;
