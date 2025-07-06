import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import {
  Booking,
  Resource,
  TimelineSlotClickInfo,
  BookingCreationContext,
} from '../../types';
import { resourceApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import {
  convertToFullCalendarEvents,
  convertToFullCalendarResources,
  getFullCalendarConfig,
  getStatusDisplayName,
} from '../../utils/fullcalendarHelpers';

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
  onDateChange?: (newDate: Date) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
}

/**
 * tugical FullCalendar Timeline 予約管理コンポーネント
 *
 * 機能:
 * - 美容師向け直感的タイムライン表示
 * - ドラッグ&ドロップ予約移動
 * - リソース（担当者）別表示
 * - ステータス別色分け
 * - ツールチップ詳細表示
 * - 30分単位時間軸
 * - 9:00-21:00 営業時間対応
 *
 * tugical_system_specification_v2.0.md 完全準拠
 */
const BookingTimelineView: React.FC<BookingTimelineViewProps> = ({
  date,
  bookings,
  onBookingClick,
  onBookingCreate,
  onBookingMove,
  onDateChange,
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarResources, setCalendarResources] = useState<any[]>([]);
  const { addNotification } = useUIStore();

  // リソース取得
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoadingResources(true);
        const response = await resourceApi.getList({
          per_page: 100,
          is_active: true,
        });
        setResources(response.resources || []);

        console.log('📊 FullCalendar: リソース取得完了', {
          resourceCount: response.resources?.length || 0,
        });
      } catch (error) {
        console.error('リソース取得エラー:', error);
        addNotification({
          type: 'error',
          title: 'リソース取得エラー',
          message: 'リソース一覧の取得に失敗しました',
          duration: 5000,
        });
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, [addNotification]);

  // FullCalendar用データ変換
  useEffect(() => {
    if (!loadingResources) {
      console.log('📊 FullCalendar データ変換開始');
      console.log('予約データ:', bookings.length, '件');
      console.log('リソースデータ:', resources.length, '件');
      console.log(
        '📊 表示日付:',
        date.toISOString().split('T')[0],
        '(',
        date.toLocaleDateString('ja-JP'),
        ')'
      );

      // 予約データ変換
      const events = convertToFullCalendarEvents(bookings);
      setCalendarEvents(events);

      // リソースデータ変換
      const calendarRes = convertToFullCalendarResources(resources);
      setCalendarResources(calendarRes);

      console.log('📊 FullCalendar データ変換完了');
      console.log('変換後イベント:', events.length, '件');
      console.log('変換後リソース:', calendarRes.length, '件');
    }
  }, [bookings, resources, loadingResources]);

  // 日付変更時のカレンダー更新
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(date);
    }
  }, [date]);

  // イベント情報ツールチップ
  const handleEventMouseEnter = (info: any) => {
    const tooltip = info.event.extendedProps.tooltip;
    if (tooltip) {
      // ツールチップ表示（簡易実装）
      info.el.title = [
        `顧客: ${tooltip.customer}`,
        `電話: ${tooltip.phone}`,
        `メニュー: ${tooltip.menu}`,
        `時間: ${tooltip.time}`,
        `料金: ${tooltip.price}`,
        `ステータス: ${getStatusDisplayName(tooltip.status)}`,
        tooltip.notes ? `備考: ${tooltip.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
  };

  // イベントドラッグ&ドロップ処理
  const handleEventDrop = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newStart = info.event.start;
    const newEnd = info.event.end;
    const newResourceId = info.event.getResources()?.[0]?.id;

    console.log('📅 予約移動:', {
      bookingId: info.event.id,
      bookingNumber: booking.booking_number,
      oldStart: info.oldEvent.start,
      newStart,
      oldResourceId: info.oldEvent.getResources()?.[0]?.id,
      newResourceId,
    });

    try {
      if (onBookingMove) {
        await onBookingMove(booking, newStart, newEnd, newResourceId);

        addNotification({
          type: 'success',
          title: '予約移動完了',
          message: `${booking.customer.name}様の予約を移動しました`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('予約移動エラー:', error);

      // 変更を元に戻す
      info.revert();

      addNotification({
        type: 'error',
        title: '予約移動エラー',
        message: '予約の移動に失敗しました',
        duration: 5000,
      });
    }
  };

  // イベントリサイズ処理
  const handleEventResize = async (info: any) => {
    const booking = info.event.extendedProps.booking;
    const newEnd = info.event.end;

    console.log('📅 予約時間変更:', {
      bookingId: info.event.id,
      bookingNumber: booking.booking_number,
      oldEnd: info.oldEvent.end,
      newEnd,
    });

    try {
      if (onBookingMove) {
        await onBookingMove(booking, info.event.start, newEnd);

        addNotification({
          type: 'success',
          title: '予約時間変更完了',
          message: `${booking.customer.name}様の予約時間を変更しました`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('予約時間変更エラー:', error);

      // 変更を元に戻す
      info.revert();

      addNotification({
        type: 'error',
        title: '予約時間変更エラー',
        message: '予約時間の変更に失敗しました',
        duration: 5000,
      });
    }
  };

  // イベントクリック処理
  const handleEventClick = (info: any) => {
    const booking = info.event.extendedProps.booking;
    console.log('📅 予約クリック:', booking);

    if (onBookingClick) {
      onBookingClick(booking);
    }
  };

  // 空きスロットクリック処理（美容師向け直感操作）
  const handleTimelineSlotClick = (info: any) => {
    const clickedDate = info.date;
    const resourceId = info.resource?.id || 'unassigned';
    const resourceData = resources.find(r => r.id.toString() === resourceId);

    console.log('🎯 Timeline空きスロットクリック:', {
      date: clickedDate.toISOString(),
      resourceId,
      resourceData: resourceData?.name,
      jsTime: clickedDate.toLocaleString('ja-JP'),
    });

    // 空きスロット情報を計算
    const slotInfo = calculateSlotInfo(clickedDate, resourceId);

    // UI表示用情報を準備
    const displayInfo = {
      dateTimeJa: clickedDate.toLocaleString('ja-JP', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timeRange: `${clickedDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${new Date(
        clickedDate.getTime() + 30 * 60 * 1000
      ).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      resourceDisplayName:
        resourceData?.display_name || resourceData?.name || '指定なし',
    };

    // TimelineSlotClickInfo型のデータを作成
    const timelineSlotInfo: TimelineSlotClickInfo = {
      start: clickedDate,
      end: new Date(clickedDate.getTime() + 30 * 60 * 1000),
      resourceId: resourceId,
      resourceInfo: resourceData
        ? {
            id: resourceData.id,
            name: resourceData.name,
            display_name: resourceData.display_name,
            type: resourceData.type,
            is_available: resourceData.is_active,
          }
        : undefined,
      slotInfo,
      displayInfo,
    };

    // 予約作成コンテキストを生成
    const context: BookingCreationContext = {
      creationMethod: 'timeline_click',
      scenario: 'face_to_face', // デフォルト、後で変更可能
      suggestedMenus: getSuggestedMenus(clickedDate, resourceId),
      suggestedCustomers: getSuggestedCustomers(clickedDate, resourceId),
      timeAdjustments: getTimeAdjustments(clickedDate, resourceId),
    };

    // 美容師向け予約作成フローを開始
    if (onBookingCreate) {
      // 基本的な予約作成情報を親コンポーネントに渡す
      onBookingCreate({
        start: timelineSlotInfo.start,
        end: timelineSlotInfo.end,
        resourceId: timelineSlotInfo.resourceId,
      });
    }

    // 将来的には、ここでTimeline統合予約作成モーダルを開く
    console.log('🎯 予約作成コンテキスト:', context);
    console.log('🎯 TimelineSlotInfo:', timelineSlotInfo);

    // 美容師向け通知
    addNotification({
      type: 'info',
      title: '予約作成',
      message: `${displayInfo.resourceDisplayName} の ${displayInfo.timeRange} に予約を作成します`,
      duration: 3000,
    });
  };

  /**
   * 空きスロット情報を計算
   * 前後の予約との間隔や利用可能時間を算出
   */
  const calculateSlotInfo = (clickedDate: Date, resourceId: string) => {
    const resourceBookings = bookings.filter(
      booking => booking.resource_id?.toString() === resourceId
    );

    const clickedTime = clickedDate.getTime();
    const clickedDateStr = clickedDate.toISOString().split('T')[0];

    // 同日の予約を取得
    const sameDayBookings = resourceBookings.filter(
      booking => booking.booking_date === clickedDateStr
    );

    // 時間順にソート
    const sortedBookings = sameDayBookings.sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    // 前の予約を探す
    const prevBooking = sortedBookings
      .filter(booking => {
        const bookingStart = new Date(
          `${booking.booking_date}T${booking.start_time}`
        );
        return bookingStart.getTime() <= clickedTime;
      })
      .pop();

    // 次の予約を探す
    const nextBooking = sortedBookings.find(booking => {
      const bookingStart = new Date(
        `${booking.booking_date}T${booking.start_time}`
      );
      return bookingStart.getTime() > clickedTime;
    });

    // 利用可能時間を計算
    let availableMinutes = 30; // デフォルト30分
    let nextBookingIn: number | undefined;
    let prevBookingGap: number | undefined;

    if (nextBooking) {
      const nextBookingTime = new Date(
        `${nextBooking.booking_date}T${nextBooking.start_time}`
      );
      nextBookingIn = Math.round(
        (nextBookingTime.getTime() - clickedTime) / (1000 * 60)
      );
      availableMinutes = Math.min(availableMinutes, nextBookingIn);
    }

    if (prevBooking) {
      const prevBookingEnd = new Date(
        `${prevBooking.booking_date}T${prevBooking.end_time}`
      );
      prevBookingGap = Math.round(
        (clickedTime - prevBookingEnd.getTime()) / (1000 * 60)
      );
    }

    return {
      availableMinutes,
      nextBookingIn,
      prevBookingGap,
    };
  };

  /**
   * 推奨メニューを取得
   * 時間枠や履歴から適合するメニューを提案
   */
  const getSuggestedMenus = (clickedDate: Date, resourceId: string) => {
    // 実装は後で追加（APIから取得）
    return undefined;
  };

  /**
   * 推奨顧客を取得
   * 時間帯や担当者から常連客を推測
   */
  const getSuggestedCustomers = (clickedDate: Date, resourceId: string) => {
    // 実装は後で追加（APIから取得）
    return undefined;
  };

  /**
   * 時間調整の提案を取得
   * 前後の予約との重複を避ける最適化提案
   */
  const getTimeAdjustments = (clickedDate: Date, resourceId: string) => {
    // 実装は後で追加（前後の予約を考慮した最適化）
    return undefined;
  };

  const basicConfig = getFullCalendarConfig();

  if (loadingResources) {
    return (
      <div className='flex justify-center items-center h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='booking-timeline-container bg-white rounded-lg shadow-sm border border-gray-200'
    >
      {/* ヘッダー情報 */}
      <div className='p-4 border-b border-gray-200'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <h3 className='text-lg font-semibold text-gray-900'>
              予約タイムライン
            </h3>
            <div className='text-sm text-gray-600'>
              {date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
            <div className='text-sm text-gray-500'>
              {calendarEvents.length} 件の予約
            </div>
          </div>

          {/* 凡例 */}
          <div className='flex items-center space-x-4 text-xs'>
            <div className='flex items-center space-x-1'>
              <div className='w-3 h-3 bg-emerald-500 rounded'></div>
              <span>確定</span>
            </div>
            <div className='flex items-center space-x-1'>
              <div className='w-3 h-3 bg-yellow-500 rounded'></div>
              <span>申込中</span>
            </div>
            <div className='flex items-center space-x-1'>
              <div className='w-3 h-3 bg-red-500 rounded'></div>
              <span>キャンセル</span>
            </div>
            <div className='flex items-center space-x-1'>
              <div className='w-3 h-3 bg-gray-500 rounded'></div>
              <span>完了</span>
            </div>
          </div>
        </div>

        {/* 操作ガイド */}
        <div className='mt-2 text-xs text-gray-500'>
          💡
          予約をドラッグして移動、端をドラッグして時間変更、クリックで詳細表示
        </div>
      </div>

      {/* FullCalendar Timeline */}
      <div className='p-4'>
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView='resourceTimelineWeek'
          initialDate={new Date()}
          firstDay={1}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek',
          }}
          // 基本設定
          slotMinTime='09:00:00'
          slotMaxTime='21:00:00'
          slotDuration='00:30:00'
          slotLabelInterval='01:00:00'
          timeZone='Asia/Tokyo'
          resourceAreaWidth='200px'
          locale={jaLocale}
          // データ
          events={calendarEvents}
          resources={calendarResources}
          // 日付範囲変更時の処理
          datesSet={dateInfo => {
            console.log('📅 Date range changed:', {
              start: dateInfo.start,
              end: dateInfo.end,
              view: dateInfo.view.type,
            });
            console.log('📅 JST日付確認:', {
              todayJST: new Date().toLocaleDateString('ja-JP'),
              currentRangeJST: {
                start: dateInfo.start.toLocaleDateString('ja-JP'),
                end: dateInfo.end.toLocaleDateString('ja-JP'),
              },
            });

            if (onDateChange) {
              onDateChange(dateInfo.start);
            }
          }}
          // イベントハンドラー
          eventMouseEnter={handleEventMouseEnter}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          dateClick={handleTimelineSlotClick}
          // スタイル設定
          schedulerLicenseKey='GPL-My-Project-Is-Open-Source'
          height='auto'
          contentHeight={500}
          // カスタムスタイル
          eventClassNames='tugical-event'
          resourceAreaHeaderContent='担当者'
          // ツールチップ設定
          eventDidMount={info => {
            // カスタムツールチップの設定
            const tooltip = info.event.extendedProps.tooltip;
            if (tooltip) {
              info.el.setAttribute('data-tooltip', JSON.stringify(tooltip));
            }
          }}
          // リソース設定
          resourceOrder='id'
          // インタラクション設定
          selectable={true}
          selectMirror={true}
          dayMaxEvents={false}
          weekends={true}
          // 詳細設定
          eventOverlap={false}
          selectOverlap={false}
          eventConstraint={{
            start: '09:00',
            end: '21:00',
          }}
        />
      </div>
    </motion.div>
  );
};

export default BookingTimelineView;
