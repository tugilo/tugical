import { Booking, Resource, AvailabilitySlot } from '../types';

// FullCalendar型定義（tugical用）
interface EventInput {
  id: string;
  title: string;
  start: Date | string; // ISO文字列も受け付け
  end: Date | string; // ISO文字列も受け付け
  resourceId?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: Record<string, any>;
}

interface ResourceInput {
  id: string;
  title: string;
  extendedProps?: Record<string, any>;
}

/**
 * tugical FullCalendar Timeline データ変換ユーティリティ
 *
 * tugical_system_specification_v2.0.md 準拠のデータ変換関数
 *
 * 主要機能:
 * - 予約データ → FullCalendar EventInput 変換
 * - リソースデータ → FullCalendar ResourceInput 変換
 * - ステータス別色分け
 * - リソースタイプ別色分け
 * - 時間計算（start_time + 計算されたend_time）
 */

/**
 * 予約ステータス別色分け設定
 * tugical UI Design System v1.0 準拠
 */
export const statusColors = {
  pending: {
    backgroundColor: '#fbbf24', // イエロー
    borderColor: '#f59e0b',
    textColor: '#ffffff',
  },
  confirmed: {
    backgroundColor: '#10b981', // グリーン
    borderColor: '#059669',
    textColor: '#ffffff',
  },
  cancelled: {
    backgroundColor: '#ef4444', // レッド
    borderColor: '#dc2626',
    textColor: '#ffffff',
  },
  completed: {
    backgroundColor: '#6b7280', // グレー
    borderColor: '#4b5563',
    textColor: '#ffffff',
  },
  no_show: {
    backgroundColor: '#dc2626', // ダークレッド
    borderColor: '#b91c1c',
    textColor: '#ffffff',
  },
} as const;

/**
 * リソースタイプ別色分け設定
 */
export const resourceColors = {
  staff: '#10b981', // エメラルドグリーン
  room: '#3b82f6', // ブルー
  equipment: '#8b5cf6', // パープル
  vehicle: '#f59e0b', // アンバー
  unassigned: '#9ca3af', // グレー
} as const;

/**
 * 空き時間スロット用色分け設定
 * 美容師が一目で空き時間を識別できるよう設計
 */
export const availabilityColors = {
  available: {
    backgroundColor: '#dcfce7', // 薄いグリーン
    borderColor: '#16a34a',
    textColor: '#166534',
  },
  partially_available: {
    backgroundColor: '#fef3c7', // 薄いイエロー
    borderColor: '#d97706',
    textColor: '#92400e',
  },
  break_time: {
    backgroundColor: '#f1f5f9', // 薄いグレー
    borderColor: '#64748b',
    textColor: '#475569',
  },
} as const;

/**
 * 予約データをFullCalendar EventInput形式に変換
 *
 * @param bookings 予約データ配列
 * @returns FullCalendar EventInput配列
 */
export const convertToFullCalendarEvents = (
  bookings: Booking[]
): EventInput[] => {
  console.log('📊 FullCalendar Events 変換開始:', {
    totalBookings: bookings.length,
    sampleBooking: bookings[0] || null,
  });

  // 詳細デバッグ情報
  console.log('📊 予約データ詳細:', {
    dates: bookings.map(b => b.booking_date).slice(0, 5),
    resourceIds: bookings
      .map(b => ({
        original: b.resource_id,
        type: typeof b.resource_id,
        converted: b.resource_id?.toString() || 'unassigned',
      }))
      .slice(0, 5),
    times: bookings
      .map(b => ({ start: b.start_time, end: b.end_time }))
      .slice(0, 5),
  });

  const events = bookings.map(booking => {
    // 日付文字列を正規化（UTC日付の場合は日付部分のみ取得）
    let bookingDate = booking.booking_date;
    if (typeof bookingDate === 'string' && bookingDate.includes('T')) {
      bookingDate = bookingDate.split('T')[0]; // "2025-07-04T15:00:00.000000Z" → "2025-07-04"
    }

    // JST日時として組み立て（FullCalendar標準形式）
    const startDateTime = `${bookingDate}T${booking.start_time}`;
    const endDateTime = `${bookingDate}T${booking.end_time}`;

    // リソースID決定（null の場合は 'unassigned'）
    const resourceId = booking.resource_id?.toString() || 'unassigned';

    // ステータス色取得
    const colors = statusColors[booking.status] || statusColors.confirmed;

    // イベントタイトル生成
    const title = `${booking.customer.name} - ${booking.menu.name}`;

    // FullCalendar EventInput オブジェクト生成（標準形式）
    const event: EventInput = {
      id: booking.id.toString(),
      title,
      start: startDateTime, // ISO文字列形式
      end: endDateTime, // ISO文字列形式
      resourceId,
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      textColor: colors.textColor,

      // 拡張プロパティ（カスタムデータ）
      extendedProps: {
        booking,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone || '',
        menuName: booking.menu.name,
        price: booking.total_price,
        status: booking.status,
        notes: booking.customer_notes || '',
        resourceName: booking.resource?.name || '指定なし',
        bookingNumber: booking.booking_number,

        // ツールチップ用データ
        tooltip: {
          customer: booking.customer.name,
          phone: booking.customer.phone || '',
          menu: booking.menu.name,
          time: `${booking.start_time} - ${booking.end_time}`,
          price: `¥${booking.total_price.toLocaleString()}`,
          status: booking.status,
          notes: booking.customer_notes || '',
        },
      },
    };

    return event;
  });

  console.log('📊 FullCalendar Events 変換完了:', {
    eventsCount: events.length,
    resourceDistribution: events.reduce((acc, event) => {
      const resourceId = event.resourceId as string;
      acc[resourceId] = (acc[resourceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    statusDistribution: events.reduce((acc, event) => {
      const status = event.extendedProps?.status as string;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  // 生成されたイベントの詳細確認（FullCalendar標準形式）
  console.log(
    '📊 生成イベント詳細（最初の3件）:',
    events.slice(0, 3).map(event => ({
      id: event.id,
      title: event.title,
      start: event.start, // ISO文字列
      end: event.end, // ISO文字列
      resourceId: event.resourceId,
      resourceIdType: typeof event.resourceId,
      backgroundColor: event.backgroundColor,
    }))
  );

  return events;
};

/**
 * リソースデータをFullCalendar ResourceInput形式に変換
 *
 * @param resources リソースデータ配列
 * @returns FullCalendar ResourceInput配列
 */
export const convertToFullCalendarResources = (
  resources: Resource[]
): ResourceInput[] => {
  console.log('📊 FullCalendar Resources 変換開始:', {
    totalResources: resources.length,
    sampleResource: resources[0] || null,
  });

  // 指定なしリソースを先頭に追加
  const calendarResources: ResourceInput[] = [
    {
      id: 'unassigned',
      title: '指定なし',
      extendedProps: {
        type: 'unassigned',
        color: resourceColors.unassigned,
        originalResource: null,
      },
    },
  ];

  // 実際のリソースを変換して追加
  resources.forEach(resource => {
    const resourceColor =
      resourceColors[resource.type as keyof typeof resourceColors] ||
      resourceColors.staff;

    const calendarResource: ResourceInput = {
      id: resource.id.toString(),
      title: resource.display_name || resource.name,
      extendedProps: {
        type: resource.type,
        color: resourceColor,
        photo: resource.image_url || null,
        description: resource.description || '',
        efficiency_rate: resource.efficiency_rate || 1.0,
        hourly_rate_diff: resource.hourly_rate_diff || 0,
        capacity: resource.capacity || 1,
        originalResource: resource,

        // 業種別表示名対応
        displayName: getResourceDisplayName(resource),
      },
    };

    calendarResources.push(calendarResource);
  });

  console.log('📊 FullCalendar Resources 変換完了:', {
    resourcesCount: calendarResources.length,
    typeDistribution: calendarResources.reduce((acc, resource) => {
      const type = resource.extendedProps?.type as string;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  return calendarResources;
};

/**
 * 業種別リソース表示名取得
 *
 * @param resource リソースデータ
 * @returns 業種別表示名
 */
const getResourceDisplayName = (resource: Resource): string => {
  // 業種別表示名マッピング
  const industryDisplayNames = {
    beauty: {
      staff: 'スタッフ',
      room: '個室',
      equipment: '設備',
    },
    clinic: {
      staff: '先生',
      room: '診察室',
      equipment: '医療機器',
    },
    rental: {
      staff: 'スタッフ',
      room: '部屋',
      equipment: '設備',
    },
    school: {
      staff: '講師',
      room: '教室',
      equipment: '設備',
    },
    activity: {
      staff: 'ガイド',
      room: '会場',
      equipment: '設備',
    },
  };

  // デフォルトは resource.display_name または resource.name
  return resource.display_name || resource.name;
};

/**
 * ステータス表示名取得（日本語）
 *
 * @param status 予約ステータス
 * @returns 日本語表示名
 */
export const getStatusDisplayName = (status: string): string => {
  const statusNames = {
    pending: '申込み中',
    confirmed: '確定',
    cancelled: 'キャンセル',
    completed: '完了',
    no_show: '無断キャンセル',
  };

  return statusNames[status as keyof typeof statusNames] || status;
};

/**
 * リソースタイプ表示名取得（日本語）
 *
 * @param type リソースタイプ
 * @returns 日本語表示名
 */
export const getResourceTypeDisplayName = (type: string): string => {
  const typeNames = {
    staff: 'スタッフ',
    room: '部屋',
    equipment: '設備',
    vehicle: '車両',
    unassigned: '指定なし',
  };

  return typeNames[type as keyof typeof typeNames] || type;
};

/**
 * FullCalendar Timeline用基本設定
 * tugical_system_specification_v2.0.md 準拠
 *
 * ✨ Phase 21.3: 店舗設定ベースの動的設定対応
 */
export const getFullCalendarConfig = (timeSlotSettings?: {
  slot_duration_minutes?: number;
  slot_label_interval_minutes?: number;
  business_hours?: {
    start: string;
    end: string;
  };
  display_format?: string;
  timezone?: string;
}) => {
  // デフォルト値（設定がない場合）
  const slotDuration = timeSlotSettings?.slot_duration_minutes || 30;
  const labelInterval = timeSlotSettings?.slot_label_interval_minutes || 60;
  const businessHours = timeSlotSettings?.business_hours || {
    start: '09:00',
    end: '21:00',
  };
  const timezone = timeSlotSettings?.timezone || 'Asia/Tokyo';

  // 時間形式をFullCalendar形式に変換
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:00`;
  };

  return {
    // ✨ 動的時間軸設定
    slotMinTime: `${businessHours.start}:00`,
    slotMaxTime: `${businessHours.end}:00`,
    slotDuration: formatTime(slotDuration),
    slotLabelInterval: formatTime(labelInterval),

    // 日本語対応
    locale: 'ja',
    timeZone: timezone,

    // スタイル設定
    height: 'auto',
    contentHeight: 400,
    resourceAreaWidth: '200px',

    // ヘッダー設定
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'resourceTimelineDay,resourceTimelineWeek',
    },

    // インタラクション設定
    editable: true,
    droppable: true,
    eventResizableFromStart: true,
    eventDurationEditable: true,

    // 表示設定
    nowIndicator: true,
    weekNumbers: false,
    dayMaxEvents: false,

    // デバッグ情報
    _debugInfo: {
      slotDurationMinutes: slotDuration,
      labelIntervalMinutes: labelInterval,
      businessHours,
      timezone,
      appliedSettings: timeSlotSettings || 'デフォルト値使用',
    },
  };
};

/**
 * 営業時間内の空き時間スロットを生成
 *
 * @param date 対象日（YYYY-MM-DD形式）
 * @param resources 利用可能リソース一覧
 * @param existingBookings 既存予約一覧
 * @param businessHours 営業時間設定
 * @param slotDurationMinutes スロット間隔（分）✨ Phase 21.3: 動的対応
 * @returns 空き時間スロット配列
 */
export const generateAvailableTimeSlots = (
  date: string,
  resources: Resource[],
  existingBookings: Booking[],
  businessHours: { start: string; end: string } = {
    start: '09:00',
    end: '21:00',
  },
  slotDurationMinutes: number = 30 // ✨ Phase 21.3: 動的スロット間隔
): AvailabilitySlot[] => {
  console.log('🕐 空き時間スロット生成開始（動的間隔対応）:', {
    date,
    resourceCount: resources.length,
    existingBookingCount: existingBookings.length,
    businessHours,
    slotDurationMinutes, // ✨ 新ログ項目
  });

  const availableSlots: AvailabilitySlot[] = [];

  // 該当日の予約のみ抽出
  const dayBookings = existingBookings.filter(booking => {
    let bookingDate = booking.booking_date;
    if (typeof bookingDate === 'string' && bookingDate.includes('T')) {
      bookingDate = bookingDate.split('T')[0];
    }
    return bookingDate === date;
  });

  // 各リソースに対して空き時間を計算
  resources.forEach(resource => {
    const resourceBookings = dayBookings.filter(
      booking => booking.resource_id === resource.id
    );

    // 営業時間内のタイムスロットを生成（✨ 動的間隔）
    const startTime = parseTime(businessHours.start);
    const endTime = parseTime(businessHours.end);

    for (
      let currentTime = startTime;
      currentTime < endTime;
      currentTime += slotDurationMinutes // ✨ 動的間隔使用
    ) {
      const slotStart = formatTime(currentTime);
      const slotEnd = formatTime(currentTime + slotDurationMinutes); // ✨ 動的間隔使用

      // このタイムスロットに予約があるかチェック
      const hasBooking = resourceBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);

        return (
          (currentTime >= bookingStart && currentTime < bookingEnd) ||
          (currentTime + slotDurationMinutes > bookingStart &&
            currentTime + slotDurationMinutes <= bookingEnd) ||
          (currentTime <= bookingStart &&
            currentTime + slotDurationMinutes >= bookingEnd)
        );
      });

      if (!hasBooking) {
        // 空きスロットを追加
        availableSlots.push({
          start_time: slotStart,
          end_time: slotEnd,
          is_available: true,
          resource_id: resource.id,
          resource_name: resource.display_name || resource.name,
          slot_type: 'available',
          duration_minutes: slotDurationMinutes, // ✨ 動的間隔反映
        });
      }
    }
  });

  // 指定なしリソースの空き時間も生成（✨ 動的間隔対応）
  const unassignedBookings = dayBookings.filter(
    booking => !booking.resource_id
  );

  const startTime = parseTime(businessHours.start);
  const endTime = parseTime(businessHours.end);

  for (
    let currentTime = startTime;
    currentTime < endTime;
    currentTime += slotDurationMinutes // ✨ 動的間隔使用
  ) {
    const slotStart = formatTime(currentTime);
    const slotEnd = formatTime(currentTime + slotDurationMinutes); // ✨ 動的間隔使用

    const hasBooking = unassignedBookings.some(booking => {
      const bookingStart = parseTime(booking.start_time);
      const bookingEnd = parseTime(booking.end_time);

      return (
        (currentTime >= bookingStart && currentTime < bookingEnd) ||
        (currentTime + slotDurationMinutes > bookingStart &&
          currentTime + slotDurationMinutes <= bookingEnd) ||
        (currentTime <= bookingStart &&
          currentTime + slotDurationMinutes >= bookingEnd)
      );
    });

    if (!hasBooking) {
      availableSlots.push({
        start_time: slotStart,
        end_time: slotEnd,
        is_available: true,
        resource_id: null,
        resource_name: '指定なし',
        slot_type: 'available',
        duration_minutes: slotDurationMinutes, // ✨ 動的間隔反映
      });
    }
  }

  console.log('🕐 空き時間スロット生成完了（動的間隔）:', {
    totalSlots: availableSlots.length,
    slotDurationMinutes, // ✨ ログ出力
    resourceDistribution: availableSlots.reduce((acc, slot) => {
      const key = slot.resource_id?.toString() || 'unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  return availableSlots;
};

/**
 * 空き時間スロットをFullCalendarイベントに変換
 *
 * @param availableSlots 空き時間スロット配列
 * @param date 対象日（YYYY-MM-DD形式）
 * @returns FullCalendar EventInput配列
 */
export const convertAvailableSlotsToEvents = (
  availableSlots: AvailabilitySlot[],
  date: string
): EventInput[] => {
  console.log('🕐 空き時間イベント変換開始:', {
    slotsCount: availableSlots.length,
    date,
  });

  const events = availableSlots.map((slot, index) => {
    const startDateTime = `${date}T${slot.start_time}`;
    const endDateTime = `${date}T${slot.end_time}`;

    const resourceId = slot.resource_id?.toString() || 'unassigned';
    const colors = availabilityColors.available;

    const event: EventInput = {
      id: `available_${date}_${resourceId}_${slot.start_time}_${index}`,
      title: '空き時間',
      start: startDateTime,
      end: endDateTime,
      resourceId: resourceId,
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      textColor: colors.textColor,

      extendedProps: {
        isAvailableSlot: true,
        availableSlot: slot,
        slotType: 'available',
        resourceName: slot.resource_name,
        durationMinutes: slot.duration_minutes,

        // インタラクション用情報
        clickable: true,
        bookingCreatable: true,

        // ツールチップ用データ
        tooltip: {
          title: '空き時間',
          time: `${slot.start_time} - ${slot.end_time}`,
          duration: `${slot.duration_minutes}分`,
          resource: slot.resource_name,
          action: 'クリックして予約作成',
        },
      },
    };

    return event;
  });

  console.log('🕐 空き時間イベント変換完了:', {
    eventsCount: events.length,
    sampleEvent: events[0] || null,
  });

  return events;
};

/**
 * 予約イベントと空き時間イベントを統合
 *
 * @param bookingEvents 予約イベント配列
 * @param availableEvents 空き時間イベント配列
 * @param showAvailableSlots 空き時間を表示するかどうか
 * @returns 統合されたイベント配列
 */
export const mergeBookingAndAvailableEvents = (
  bookingEvents: EventInput[],
  availableEvents: EventInput[],
  showAvailableSlots: boolean = true
): EventInput[] => {
  console.log('🔄 イベント統合開始:', {
    bookingEventsCount: bookingEvents.length,
    availableEventsCount: availableEvents.length,
    showAvailableSlots,
  });

  const mergedEvents = [...bookingEvents];

  if (showAvailableSlots) {
    mergedEvents.push(...availableEvents);
  }

  // イベントを時間順にソート
  mergedEvents.sort((a, b) => {
    const startA =
      typeof a.start === 'string' ? a.start : a.start.toISOString();
    const startB =
      typeof b.start === 'string' ? b.start : b.start.toISOString();
    return startA.localeCompare(startB);
  });

  console.log('🔄 イベント統合完了:', {
    totalEvents: mergedEvents.length,
    eventTypes: mergedEvents.reduce((acc, event) => {
      const type = event.extendedProps?.isAvailableSlot
        ? 'available'
        : 'booking';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });

  return mergedEvents;
};

/**
 * 時間文字列（HH:MM）を分に変換
 * @param timeStr 時間文字列（例: "09:30"）
 * @returns 分（例: 570）
 */
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 分を時間文字列（HH:MM）に変換
 * @param minutes 分（例: 570）
 * @returns 時間文字列（例: "09:30"）
 */
const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}`;
};
