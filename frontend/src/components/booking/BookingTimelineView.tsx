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
  AvailabilitySlot,
} from '../../types';
import { resourceApi, storeApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import {
  convertToFullCalendarEvents,
  convertToFullCalendarResources,
  getFullCalendarConfig,
  getStatusDisplayName,
  generateAvailableTimeSlots,
  convertAvailableSlotsToEvents,
  mergeBookingAndAvailableEvents,
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
 * - ✨ NEW: 空き時間リアルタイム表示（Phase 21.2）
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

  // ✨ Phase 21.2: 空き時間表示機能（Phase 25.16: 無効化）
  const [showAvailableSlots, setShowAvailableSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [businessHours] = useState({ start: '09:00', end: '21:00' });

  // ✨ Phase 21.3: 店舗設定ベース動的時間スロット設定
  const [timeSlotSettings, setTimeSlotSettings] = useState<{
    slot_duration_minutes: number;
    slot_label_interval_minutes: number;
    business_hours: { start: string; end: string };
    available_durations: number[];
    display_format: string;
    timezone: string;
  } | null>(null);
  const [loadingTimeSlotSettings, setLoadingTimeSlotSettings] = useState(true);

  const { addNotification } = useUIStore();

  // ✨ Phase 21.3: 店舗時間スロット設定取得
  useEffect(() => {
    const fetchTimeSlotSettings = async () => {
      try {
        setLoadingTimeSlotSettings(true);
        const response = await storeApi.getTimeSlotSettings();
        setTimeSlotSettings(response.time_slot_settings);

        console.log('⚙️ 店舗時間スロット設定取得完了:', {
          slotDuration: response.time_slot_settings.slot_duration_minutes,
          businessHours: response.time_slot_settings.business_hours,
          availableDurations: response.time_slot_settings.available_durations,
          storeInfo: response.store_info,
        });
      } catch (error) {
        console.error('店舗設定取得エラー:', error);
        addNotification({
          type: 'warning',
          title: '設定取得エラー',
          message: 'デフォルト設定を使用します',
          duration: 3000,
        });

        // エラー時はデフォルト設定を使用
        setTimeSlotSettings({
          slot_duration_minutes: 30,
          slot_label_interval_minutes: 60,
          business_hours: { start: '09:00', end: '21:00' },
          available_durations: [5, 10, 15, 20, 30, 45, 60, 90, 120],
          display_format: 'H:i',
          timezone: 'Asia/Tokyo',
        });
      } finally {
        setLoadingTimeSlotSettings(false);
      }
    };

    fetchTimeSlotSettings();
  }, [addNotification]);

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

  // ✨ 空き時間スロット生成（Phase 21.2 → Phase 21.3: 動的間隔対応）
  // 🚨 Phase 25.14: 再読み込み問題根本解決 - datesSetハンドラ無効化により最適化
  useEffect(() => {
    if (
      !loadingResources &&
      !loadingTimeSlotSettings &&
      showAvailableSlots &&
      timeSlotSettings
    ) {
      console.log('🕐 動的空き時間スロット生成開始 (Phase 21.3)');

      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD形式
      const dynamicBusinessHours = timeSlotSettings.business_hours;
      const slotDuration = timeSlotSettings.slot_duration_minutes;

      const slots = generateAvailableTimeSlots(
        dateString,
        resources,
        bookings,
        dynamicBusinessHours, // ✨ 店舗設定の営業時間使用
        slotDuration // ✨ 店舗設定のスロット間隔使用
      );

      setAvailableSlots(slots);

      console.log('🕐 動的空き時間スロット生成完了 (Phase 21.3):', {
        date: dateString,
        slotsCount: slots.length,
        businessHours: dynamicBusinessHours, // ✨ 店舗設定反映
        slotDurationMinutes: slotDuration, // ✨ 店舗設定反映
        settingsSource: 'store_api',
      });
    } else {
      setAvailableSlots([]);
    }
  }, [
    date,
    resources,
    bookings,
    loadingResources,
    loadingTimeSlotSettings, // ✨ 店舗設定ローディング状態追加
    showAvailableSlots,
    timeSlotSettings, // ✨ 店舗設定追加
  ]);

  // ✨ FullCalendar用データ変換（空き時間統合対応）
  useEffect(() => {
    if (!loadingResources) {
      console.log('📊 FullCalendar データ変換開始（空き時間統合対応）');
      console.log('予約データ:', bookings.length, '件');
      console.log('リソースデータ:', resources.length, '件');
      console.log('空き時間スロット:', availableSlots.length, '件');
      console.log(
        '📊 表示日付:',
        date.toISOString().split('T')[0],
        '(',
        date.toLocaleDateString('ja-JP'),
        ')'
      );

      // 予約データ変換
      const bookingEvents = convertToFullCalendarEvents(bookings);

      // 空き時間データ変換
      let mergedEvents = bookingEvents;
      if (showAvailableSlots) {
        const dateString = date.toISOString().split('T')[0];
        const availableEvents = convertAvailableSlotsToEvents(
          availableSlots,
          dateString
        );
        mergedEvents = mergeBookingAndAvailableEvents(
          bookingEvents,
          availableEvents,
          showAvailableSlots
        );
      }

      setCalendarEvents(mergedEvents);

      // リソースデータ変換
      const calendarRes = convertToFullCalendarResources(resources);
      setCalendarResources(calendarRes);

      console.log('📊 FullCalendar データ変換完了（空き時間統合）');
      console.log('変換後イベント:', mergedEvents.length, '件');
      console.log('  - 予約イベント:', bookingEvents.length, '件');
      console.log(
        '  - 空き時間イベント:',
        mergedEvents.length - bookingEvents.length,
        '件'
      );
      console.log('変換後リソース:', calendarRes.length, '件');
    }
  }, [
    bookings,
    resources,
    loadingResources,
    availableSlots,
    showAvailableSlots,
    date,
  ]);

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
    // Phase 25.10: 根本的な時間取得問題の解決
    // 複雑な再構築ロジックを削除し、rawClickedDateをそのまま使用
    const rawClickedDate = info.date;
    const resourceId = info.resource?.id || 'unassigned';
    const resourceData = resources.find(r => r.id.toString() === resourceId);

    console.log('🎯 Timeline空きスロットクリック（Phase 25.10 - 根本解決）:', {
      rawDate: rawClickedDate,
      rawDateISO: rawClickedDate.toISOString(),
      rawDirectTime: `${rawClickedDate.getHours()}:${rawClickedDate
        .getMinutes()
        .toString()
        .padStart(2, '0')}`,
      resourceId,
      resourceData: resourceData?.name,
    });

    // 🔥 重要: rawClickedDateが実際には正しい時間を持っているので、そのまま使用
    const clickedDate = rawClickedDate;

    // 美容師向け予約作成フローを開始
    if (onBookingCreate) {
      // 基本的な予約作成情報を親コンポーネントに渡す
      onBookingCreate({
        start: clickedDate,
        end: new Date(clickedDate.getTime() + 30 * 60 * 1000),
        resourceId: resourceId,
      });
    }

    // 美容師向け通知（軽量化）
    addNotification({
      type: 'info',
      title: '予約作成',
      message: `${
        resourceData?.display_name || resourceData?.name || '指定なし'
      } の ${clickedDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })} に予約を作成します`,
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

  // ✨ Phase 21.3: 動的FullCalendar設定生成
  const dynamicConfig = timeSlotSettings
    ? getFullCalendarConfig(timeSlotSettings)
    : getFullCalendarConfig(); // デフォルト設定

  // ローディング状態管理（時間スロット設定も含む）
  const isLoading = loadingResources || loadingTimeSlotSettings;

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
        <div className='ml-3 text-gray-600'>
          {loadingTimeSlotSettings
            ? '時間スロット設定を読み込み中...'
            : 'リソースを読み込み中...'}
        </div>
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

          <div className='flex items-center space-x-6'>
            {/* Phase 25.16: 空き時間表示機能を無効化（不完全な実装のため）
            <div className='flex items-center space-x-2'>
              <label className='text-sm font-medium text-gray-700'>
                空き時間表示
              </label>
              <button
                onClick={() => setShowAvailableSlots(!showAvailableSlots)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${showAvailableSlots ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${showAvailableSlots ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
            */}

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
              {/* Phase 25.16: 空き時間凡例を無効化
              {showAvailableSlots && (
                <div className='flex items-center space-x-1'>
                  <div className='w-3 h-3 bg-green-100 border border-green-500 rounded'></div>
                  <span>空き時間</span>
                </div>
              )}
              */}
            </div>
          </div>
        </div>

        {/* 操作ガイド */}
        <div className='mt-2 text-xs text-gray-500'>
          💡
          予約をドラッグして移動、端をドラッグして時間変更、クリックで詳細表示 •
          空きエリアをクリックして新規予約作成
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
          // ✨ Phase 21.3: 動的時間軸設定
          slotMinTime={dynamicConfig.slotMinTime}
          slotMaxTime={dynamicConfig.slotMaxTime}
          slotDuration={dynamicConfig.slotDuration}
          slotLabelInterval={dynamicConfig.slotLabelInterval}
          // Phase 25.9: timeZone設定を削除してローカル時間処理
          // timeZone='Asia/Tokyo' ← 削除
          resourceAreaWidth='200px'
          locale={jaLocale}
          // データ
          events={calendarEvents}
          resources={calendarResources}
          // 🚨 Phase 25.14: 再読み込み問題根本解決 - datesSetハンドラを完全に無効化
          // datesSetイベントがTimeline空きスロットクリック時に不要な再読み込みを引き起こすため、
          // 親コンポーネントへの日付変更通知は他の手段で実装する
          datesSet={dateInfo => {
            // 🔇 無操作 - 再読み込みループを防ぐため、onDateChangeは呼び出さない
            console.log('📅 FullCalendar datesSet event (ignored):', {
              start: dateInfo.start.toISOString().split('T')[0],
              end: dateInfo.end.toISOString().split('T')[0],
              view: dateInfo.view.type,
              reason: 'Preventing infinite reload loop',
            });
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
