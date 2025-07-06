import { Booking, Resource } from '../types';

// FullCalendar型定義（tugical用）
interface EventInput {
  id: string;
  title: string;
  start: Date;
  end: Date;
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
    // 日時データの組み立て
    const startDateTime = new Date(
      `${booking.booking_date}T${booking.start_time}`
    );
    const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);

    // リソースID決定（null の場合は 'unassigned'）
    const resourceId = booking.resource_id?.toString() || 'unassigned';

    // ステータス色取得
    const colors = statusColors[booking.status] || statusColors.confirmed;

    // イベントタイトル生成
    const title = `${booking.customer.name} - ${booking.menu.name}`;

    // FullCalendar EventInput オブジェクト生成
    const event: EventInput = {
      id: booking.id.toString(),
      title,
      start: startDateTime,
      end: endDateTime,
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

  // 生成されたイベントの詳細確認
  console.log(
    '📊 生成イベント詳細（最初の3件）:',
    events.slice(0, 3).map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
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
 */
export const getFullCalendarConfig = () => ({
  // 時間軸設定
  slotMinTime: '09:00:00',
  slotMaxTime: '21:00:00',
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00:00',

  // 日本語対応
  locale: 'ja',
  timeZone: 'Asia/Tokyo',

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
});
