/**
 * 管理画面フィールド TIPS 辞書
 *
 * 「何に効くか」を短く統一。どの画面でも同じ文言を使う。
 */

export const FIELD_TIPS = {
  // ---- リソース ----
  resourceType:
    '予約に割り当てる対象の種類です。スタッフ・部屋・設備・車両から選びます。あとから種類は変えにくいので慎重に選んでください。',
  resourceName:
    '管理用の内部名です（一覧の検索・識別用）。お客様には通常表示しません。',
  resourceDisplayName:
    'お客様や予約画面に表示する名前です。普段使う呼び方を入れてください。',
  resourceDescription: 'メモや特記事項です。任意です。',
  efficiencyRate:
    'メニューの所要時間に掛け算され、カレンダー上の占用時間が決まります。100%=そのまま。どのメニューでも同じ倍率がかかります。普段は100%のままで問題ありません。',
  hourlyRateDiff:
    'この担当を指名したとき、メニュー料金に上乗せする金額です（1時間あたり）。所要時間に比例して計算され、どのメニューでも同じルールです。例: +1,000円/時で60分メニューなら +1,000円。0なら追加なし。',
  capacityStaff:
    '同時に対応できる人数です。通常は1です。複数人を同時に見る場合だけ増やします。',
  capacityRoom: 'その部屋に入れる人数の目安です。予約の定員チェックに使います。',
  capacityEquipment: '同時に使える台数・口数です。',
  capacityVehicle: '乗車できる人数です。',
  resourceActive:
    'オフにすると新規予約の候補から外れます。過去の予約は残ります。',

  // ---- メニュー ----
  menuName: 'お客様に見せるメニュー名です。',
  menuCategory: '一覧の整理用です。空でも予約できます。',
  menuPrice: 'このメニューの基本料金です。指名料金がある場合は別途加算されます。',
  menuDuration:
    'お客様に案内する所要時間（分）です。準備・片付け時間は含みません。',
  menuDescription: 'メニューの説明文です。任意です。',
  menuActive: 'オフにすると予約画面に出なくなります。',
  prepDuration:
    '施術前にカレンダーを塞ぐ時間です。お客様の所要時間には含まれません。どの予約でもこのメニューなら同じ分だけ前にブロックします。',
  cleanupDuration:
    '施術後にカレンダーを塞ぐ時間です。お客様の所要時間には含まれません。どの予約でもこのメニューなら同じ分だけ後にブロックします。',
  advanceBookingHours:
    '予約開始の何時間前まで受け付けるかです。例: 2 なら「2時間前まで」。0 なら直前予約も可。',
  requiresApproval:
    'オンにすると予約がすぐ確定せず、店舗側の承認が必要になります。',
  menuSortOrder: '一覧での表示順です。小さい数字ほど上に出ます。',

  // ---- 顧客 ----
  customerName: 'お客様の表示名です。予約・検索で使います。',
  customerPhone: '電話予約や連絡に使う番号です。ハイフンなしでも構いません。',
  customerEmail: '任意です。通知や控えに使えます。',

  // ---- 予約 ----
  bookingDate: '予約する日です。',
  bookingStartTime: '開始時刻です。所要時間はメニューから自動で決まります。',
  bookingResource: '担当・部屋などの割り当てです。空けると「おまかせ」扱いにできます。',
  bookingMenus: 'この予約に含めるメニューです。合計時間・料金の基準になります。',
} as const;

export type FieldTipKey = keyof typeof FIELD_TIPS;

/**
 * リソースタイプ別の収容人数 TIPS
 */
export function capacityTip(
  type: 'staff' | 'room' | 'equipment' | 'vehicle' | string
): string {
  switch (type) {
    case 'staff':
      return FIELD_TIPS.capacityStaff;
    case 'room':
      return FIELD_TIPS.capacityRoom;
    case 'equipment':
      return FIELD_TIPS.capacityEquipment;
    case 'vehicle':
      return FIELD_TIPS.capacityVehicle;
    default:
      return '同時に扱える人数・台数の目安です。';
  }
}
