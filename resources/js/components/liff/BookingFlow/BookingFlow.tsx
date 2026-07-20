/**
 * LIFF 予約フロー（4ステップ・提案型導線）
 * 1. メニューを選ぶ 2. おすすめ日時（時期指定／他の日時） 3. 確認 4. 完了
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

const API_BASE = '/api/v1/liff';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
/** 1回の空き検索窓（日数） */
const WINDOW_DAYS = 14;
/** おすすめとして先に出す枠数 */
const SUGGEST_LIMIT = 5;
/** 候補日として出す最大件数 */
const CANDIDATE_DAYS_LIMIT = 5;

/** 時期プリセット（オフセットはおおよそ） */
const HORIZON_MAIN = [
  { id: 'soon', label: '直近', offsetDays: 0 },
  { id: '1m', label: '1ヶ月後', offsetDays: 30 },
  { id: '3m', label: '3ヶ月後', offsetDays: 90 },
] as const;

/** 「〜ヶ月後」の追加プリセット */
const HORIZON_MORE = [
  { id: '2m', label: '2ヶ月後', offsetDays: 60 },
  { id: '4m', label: '4ヶ月後', offsetDays: 120 },
  { id: '6m', label: '6ヶ月後', offsetDays: 180 },
] as const;

type HorizonId =
  | (typeof HORIZON_MAIN)[number]['id']
  | (typeof HORIZON_MORE)[number]['id'];

interface MenuItem {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  base_price: number;
  base_duration: number;
  tax_included: boolean;
  category: string;
  photo_url?: string | null;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration: number;
  resource_id: number;
  resource_name: string;
  is_available: boolean;
  /** おすすめ枠用の日付 Y-m-d */
  booking_date?: string;
}

interface CompletedBooking {
  booking_number?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  menu_name?: string;
  resource_name?: string;
  total_price?: number;
}

interface DayOption {
  value: string;
  label: string;
  count: number;
}

interface BookingFlowProps {
  storeId: number;
  customerId: number;
  customerName: string;
  onComplete: (booking: CompletedBooking) => void;
}

/** ローカル日付を Y-m-d に */
function toDateKey(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** today から offset 日後を起点に count 日分の日付キー */
function buildDateKeys(offsetDays: number, count: number): string[] {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offsetDays + i);
    keys.push(toDateKey(d));
  }
  return keys;
}

/** 日付表示（今日(月) / 明日(火) / 7/22(火)） */
function formatDateLabel(dateKey: string, todayKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const wd = WEEKDAYS[d.getDay()];
  const tomorrow = new Date();
  tomorrow.setHours(12, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  if (dateKey === todayKey) return `今日(${wd})`;
  if (dateKey === tomorrowKey) return `明日(${wd})`;
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}

function formatTime(t: string): string {
  return String(t).slice(0, 5);
}

function formatPrice(p: number): string {
  return `¥${p.toLocaleString()}`;
}

/** 同一日時の複数リソースを1枠に畳む（先頭の resource を採用） */
function collapseSlotsByStart(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  const out: TimeSlot[] = [];
  for (const slot of slots) {
    const key = `${slot.booking_date || ''}_${formatTime(slot.start_time)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}

async function fetchDaySlots(
  storeId: number,
  menuId: number,
  dateKey: string
): Promise<TimeSlot[]> {
  const res = await fetch(
    `${API_BASE}/availability?store_id=${storeId}&menu_id=${menuId}&date=${dateKey}`
  );
  const json = await res.json();
  const raw: TimeSlot[] = json?.data?.available_slots || [];
  return raw
    .filter(s => s.is_available !== false)
    .map(s => ({ ...s, booking_date: dateKey }));
}

/** 日別件数から候補日リストを作る（excludeDate を除外） */
function buildCandidateDays(
  counts: Record<string, number>,
  todayKey: string,
  excludeDate?: string
): DayOption[] {
  return Object.entries(counts)
    .filter(([dk, c]) => c > 0 && dk !== excludeDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, CANDIDATE_DAYS_LIMIT)
    .map(([value, count]) => ({
      value,
      label: formatDateLabel(value, todayKey),
      count,
    }));
}

function horizonLabel(id: HorizonId): string {
  const all = [...HORIZON_MAIN, ...HORIZON_MORE];
  return all.find(h => h.id === id)?.label || '直近';
}

/**
 * LIFF 予約メインフロー
 */
const BookingFlow: React.FC<BookingFlowProps> = ({
  storeId,
  customerId,
  customerName,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  /** Step2 内サブビュー */
  const [datetimeView, setDatetimeView] = useState<
    'suggest' | 'pickDate' | 'pickSlot'
  >('suggest');
  /** 時期プリセット */
  const [horizonId, setHorizonId] = useState<HorizonId>('soon');
  const [showMoreHorizons, setShowMoreHorizons] = useState(false);

  const [menu, setMenu] = useState<MenuItem | null>(null);
  const [date, setDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  /** 日別空き件数（代替日提案用） dateKey → count */
  const [daySlotCounts, setDaySlotCounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainMinutes, setRemainMinutes] = useState<number | null>(null);
  const [completedBooking, setCompletedBooking] =
    useState<CompletedBooking | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const horizonOffset = useMemo(() => {
    const all = [...HORIZON_MAIN, ...HORIZON_MORE];
    return all.find(h => h.id === horizonId)?.offsetDays ?? 0;
  }, [horizonId]);

  const dateOptions = useMemo(() => {
    return buildDateKeys(horizonOffset, WINDOW_DAYS).map(value => ({
      value,
      label: formatDateLabel(value, todayKey),
    }));
  }, [horizonOffset, todayKey]);

  const candidateDays = useMemo(
    () => buildCandidateDays(daySlotCounts, todayKey, date || undefined),
    [daySlotCounts, todayKey, date]
  );

  /** メニュー＋時期確定後：おすすめ枠を並列取得（空きなしなら次窓も探索） */
  const loadSuggestions = useCallback(
    async (menuId: number, offsetDays: number) => {
      setLoading(true);
      setError(null);
      setSuggestedSlots([]);
      setDaySlotCounts({});
      try {
        const primaryDates = buildDateKeys(offsetDays, WINDOW_DAYS);
        const primaryResults = await Promise.all(
          primaryDates.map(dk => fetchDaySlots(storeId, menuId, dk))
        );
        const counts: Record<string, number> = {};
        const merged: TimeSlot[] = [];
        primaryResults.forEach((daySlots, idx) => {
          const collapsed = collapseSlotsByStart(daySlots);
          counts[primaryDates[idx]] = collapsed.length;
          merged.push(...collapsed);
        });

        // 窓内に空きが無い場合、次の14日も探して候補日を確保
        if (merged.length === 0) {
          const nextDates = buildDateKeys(
            offsetDays + WINDOW_DAYS,
            WINDOW_DAYS
          );
          const nextResults = await Promise.all(
            nextDates.map(dk => fetchDaySlots(storeId, menuId, dk))
          );
          nextResults.forEach((daySlots, idx) => {
            const collapsed = collapseSlotsByStart(daySlots);
            counts[nextDates[idx]] = collapsed.length;
            merged.push(...collapsed);
          });
        }

        merged.sort((a, b) => {
          const da = `${a.booking_date} ${formatTime(a.start_time)}`;
          const db = `${b.booking_date} ${formatTime(b.start_time)}`;
          return da.localeCompare(db);
        });
        setDaySlotCounts(counts);
        setSuggestedSlots(merged.slice(0, SUGGEST_LIMIT));
      } catch {
        setSuggestedSlots([]);
        setError('空き状況の取得に失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  /** 特定日の空き取得 */
  const loadDaySlots = useCallback(
    async (menuId: number, dateKey: string) => {
      setLoading(true);
      setError(null);
      setSlots([]);
      try {
        const daySlots = await fetchDaySlots(storeId, menuId, dateKey);
        setSlots(collapseSlotsByStart(daySlots));
      } catch {
        setSlots([]);
        setError('空き状況の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    if (step === 2 && datetimeView === 'suggest' && menu) {
      loadSuggestions(menu.id, horizonOffset);
    }
  }, [step, datetimeView, menu, horizonOffset, loadSuggestions]);

  useEffect(() => {
    if (step === 2 && datetimeView === 'pickSlot' && menu && date) {
      loadDaySlots(menu.id, date);
    }
  }, [step, datetimeView, menu, date, loadDaySlots]);

  /** 仮押さえ残り時間 */
  useEffect(() => {
    if (step !== 3 || !expiresAt) {
      setRemainMinutes(null);
      return;
    }
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const mins = Math.max(0, Math.ceil(ms / 60000));
      setRemainMinutes(mins);
      if (ms <= 0) {
        setError('仮押さえの有効期限が切れました。日時を選び直してください。');
        setHoldToken(null);
        setExpiresAt(null);
        setSelectedSlot(null);
        setStep(2);
        setDatetimeView('suggest');
      }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [step, expiresAt]);

  const handleMenuSelect = (m: MenuItem) => {
    setMenu(m);
    setDate('');
    setSelectedSlot(null);
    setHoldToken(null);
    setExpiresAt(null);
    setHorizonId('soon');
    setShowMoreHorizons(false);
    setDatetimeView('suggest');
    setStep(2);
    setError(null);
  };

  const handleHorizonSelect = (id: HorizonId) => {
    setHorizonId(id);
    setDate('');
    setSelectedSlot(null);
    setDatetimeView('suggest');
    setError(null);
    if (HORIZON_MORE.some(h => h.id === id)) {
      setShowMoreHorizons(true);
    }
  };

  const handleSuggestedSlotSelect = (slot: TimeSlot) => {
    const slotDate = slot.booking_date || '';
    setDate(slotDate);
    void holdAndGoConfirm(slot, slotDate);
  };

  const handleDateSelect = (d: string) => {
    setDate(d);
    setDatetimeView('pickSlot');
    setError(null);
  };

  const holdAndGoConfirm = async (slot: TimeSlot, bookingDate: string) => {
    if (!menu) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/hold-slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          menu_id: menu.id,
          resource_id: slot.resource_id,
          booking_date: bookingDate,
          start_time: formatTime(slot.start_time),
          customer_id: customerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || '仮押さえに失敗しました');
        return;
      }
      setHoldToken(json.data.hold_token);
      setExpiresAt(json.data.expires_at || null);
      setSelectedSlot({ ...slot, booking_date: bookingDate });
      setStep(3);
    } catch {
      setError('仮押さえに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    void holdAndGoConfirm(slot, date);
  };

  const handleConfirm = async () => {
    if (!holdToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          hold_token: holdToken,
          customer_id: customerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || '予約の確定に失敗しました');
        return;
      }
      const booking: CompletedBooking = json.data?.booking ?? {};
      setCompletedBooking(booking);
      setStep(4);
      onComplete(booking);
    } catch {
      setError('予約の確定に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 4) return;
    setError(null);
    if (step === 3) {
      setHoldToken(null);
      setExpiresAt(null);
      setSelectedSlot(null);
      setStep(2);
      setDatetimeView('suggest');
      return;
    }
    if (step === 2) {
      if (datetimeView === 'pickSlot') {
        setDatetimeView('pickDate');
        setDate('');
        return;
      }
      if (datetimeView === 'pickDate') {
        setDatetimeView('suggest');
        return;
      }
      setStep(1);
      setMenu(null);
      setHorizonId('soon');
      setShowMoreHorizons(false);
    }
  };

  const steps = ['メニュー', '日時', '確認', '完了'];

  /** 候補日ボタン群 */
  const CandidateDayList: React.FC<{ days: DayOption[]; title: string }> = ({
    days,
    title,
  }) => (
    <div className='space-y-2'>
      <p className='text-sm text-gray-600'>{title}</p>
      {days.map(d => (
        <button
          key={d.value}
          type='button'
          onClick={() => handleDateSelect(d.value)}
          className='w-full min-h-[48px] p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-medium text-left'
        >
          {d.label}
          <span className='ml-2 text-sm font-normal'>
            （空き {d.count} 枠）
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <header className='bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10'>
        <div className='flex items-center gap-3'>
          {step > 1 && step < 4 ? (
            <button
              type='button'
              onClick={handleBack}
              className='min-w-[44px] min-h-[44px] text-gray-600'
              aria-label='戻る'
            >
              ←
            </button>
          ) : (
            <span className='w-11' />
          )}
          <div className='flex-1'>
            <p className='text-xs text-gray-500'>
              ステップ {step} / 4 · {steps[step - 1]}
            </p>
            <div className='flex gap-1 mt-1'>
              {steps.map((_, i) => (
                <div
                  key={steps[i]}
                  className={`h-1 flex-1 rounded ${
                    i < step ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className='flex-1 px-4 py-4 max-w-lg mx-auto w-full'>
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
            {error}
          </div>
        )}

        {step === 1 && (
          <StepMenuSelect
            storeId={storeId}
            onSelect={handleMenuSelect}
            selectedMenu={menu}
          />
        )}

        {step === 2 && menu && (
          <div className='space-y-4'>
            <p className='text-sm text-gray-500'>
              {menu.display_name || menu.name}
            </p>

            {/* 時期ショートカット */}
            <div className='space-y-2'>
              <p className='text-xs text-gray-500'>いつ頃がご希望ですか？</p>
              <div className='flex flex-wrap gap-2'>
                {HORIZON_MAIN.map(h => (
                  <button
                    key={h.id}
                    type='button'
                    onClick={() => {
                      setShowMoreHorizons(false);
                      handleHorizonSelect(h.id);
                    }}
                    className={`min-h-[44px] px-3 rounded-lg text-sm font-medium border-2 ${
                      horizonId === h.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={() => setShowMoreHorizons(v => !v)}
                  className={`min-h-[44px] px-3 rounded-lg text-sm font-medium border-2 ${
                    HORIZON_MORE.some(h => h.id === horizonId)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 text-gray-700'
                  }`}
                >
                  〜ヶ月後
                </button>
              </div>
              {showMoreHorizons && (
                <div className='flex flex-wrap gap-2'>
                  {HORIZON_MORE.map(h => (
                    <button
                      key={h.id}
                      type='button'
                      onClick={() => handleHorizonSelect(h.id)}
                      className={`min-h-[44px] px-3 rounded-lg text-sm font-medium border-2 ${
                        horizonId === h.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {datetimeView === 'suggest' && (
              <>
                <p className='text-gray-700'>
                  {horizonLabel(horizonId)}
                  あたりのおすすめ空きです
                </p>
                {loading ? (
                  <LoadingSpinner />
                ) : suggestedSlots.length === 0 ? (
                  <div className='space-y-3'>
                    <p className='text-gray-600'>
                      この時期は空きが見つかりませんでした。
                      {candidateDays.length > 0
                        ? '近い候補日があります。'
                        : '他の時期や日時から探せます。'}
                    </p>
                    {candidateDays.length > 0 && (
                      <CandidateDayList
                        days={candidateDays}
                        title='空きのある候補日'
                      />
                    )}
                    <button
                      type='button'
                      onClick={() => setDatetimeView('pickDate')}
                      className='w-full min-h-[48px] rounded-lg border-2 border-emerald-500 text-emerald-700 font-medium'
                    >
                      他の日時を見る
                    </button>
                  </div>
                ) : (
                  <>
                    <div className='space-y-2'>
                      {suggestedSlots.map(slot => (
                        <button
                          key={`${slot.booking_date}-${slot.start_time}-${slot.resource_id}`}
                          type='button'
                          disabled={loading}
                          onClick={() => handleSuggestedSlotSelect(slot)}
                          className='w-full min-h-[52px] p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-left disabled:opacity-50'
                        >
                          <span className='font-semibold text-gray-900'>
                            {formatDateLabel(
                              slot.booking_date || '',
                              todayKey
                            )}{' '}
                            {formatTime(slot.start_time)}
                          </span>
                          <span className='block text-xs text-gray-500 mt-0.5'>
                            担当おまかせ
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type='button'
                      onClick={() => setDatetimeView('pickDate')}
                      className='w-full min-h-[48px] rounded-lg border border-gray-300 text-gray-700 font-medium'
                    >
                      希望日を指定する
                    </button>
                  </>
                )}
              </>
            )}

            {datetimeView === 'pickDate' && (
              <>
                <p className='text-gray-700'>
                  {horizonLabel(horizonId)}あたりで予約したい日を選んでください
                </p>
                {candidateDays.length > 0 && (
                  <CandidateDayList
                    days={candidateDays}
                    title='空きのある候補日（おすすめ）'
                  />
                )}
                <div className='grid grid-cols-2 gap-2'>
                  {dateOptions.map(opt => {
                    const count = daySlotCounts[opt.value];
                    const hasCount = typeof count === 'number';
                    return (
                      <button
                        key={opt.value}
                        type='button'
                        onClick={() => handleDateSelect(opt.value)}
                        className={`min-h-[52px] p-4 rounded-lg border-2 text-left ${
                          hasCount && count === 0
                            ? 'border-gray-100 bg-gray-50 text-gray-400'
                            : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                        }`}
                      >
                        <span className='font-medium'>{opt.label}</span>
                        {hasCount ? (
                          <span className='block text-xs mt-0.5'>
                            {count > 0 ? `空き ${count} 枠` : '空きなし'}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {datetimeView === 'pickSlot' && (
              <>
                <p className='text-gray-700'>
                  {formatDateLabel(date, todayKey)} の空き時間
                </p>
                {loading ? (
                  <LoadingSpinner />
                ) : slots.length === 0 ? (
                  <div className='space-y-3'>
                    <p className='text-gray-600'>
                      この日は空きがありません。候補日から選んでください。
                    </p>
                    {candidateDays.length > 0 ? (
                      <CandidateDayList
                        days={candidateDays}
                        title='空きのある候補日'
                      />
                    ) : (
                      <button
                        type='button'
                        onClick={() => setDatetimeView('pickDate')}
                        className='w-full min-h-[48px] rounded-lg border-2 border-emerald-500 text-emerald-700 font-medium'
                      >
                        別の日を選ぶ
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => setDatetimeView('suggest')}
                      className='w-full min-h-[44px] text-sm text-gray-600 underline'
                    >
                      おすすめに戻る
                    </button>
                  </div>
                ) : (
                  <div className='grid grid-cols-2 gap-2'>
                    {slots.map(slot => (
                      <button
                        key={`${slot.start_time}-${slot.resource_id}`}
                        type='button'
                        disabled={loading}
                        onClick={() => handleSlotSelect(slot)}
                        className='min-h-[52px] p-3 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-left disabled:opacity-50'
                      >
                        <span className='font-semibold'>
                          {formatTime(slot.start_time)}
                        </span>
                        <span className='block text-xs text-gray-500'>
                          担当おまかせ
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && menu && selectedSlot && (
          <div className='space-y-4'>
            <p className='text-gray-700'>
              この内容で予約します
              {remainMinutes !== null && (
                <span className='block text-sm text-amber-700 mt-1'>
                  あと {remainMinutes} 分で枠が解放されます
                </span>
              )}
            </p>
            <div className='bg-gray-50 rounded-lg p-4 space-y-2 text-sm'>
              {customerName ? (
                <p>
                  <span className='text-gray-500'>お客様</span>{' '}
                  {customerName} 様
                </p>
              ) : null}
              <p>
                <span className='text-gray-500'>メニュー</span>{' '}
                {menu.display_name || menu.name}
              </p>
              <p>
                <span className='text-gray-500'>日時</span>{' '}
                {formatDateLabel(
                  selectedSlot.booking_date || date,
                  todayKey
                )}{' '}
                {formatTime(selectedSlot.start_time)}
              </p>
              <p>
                <span className='text-gray-500'>担当</span> おまかせ
              </p>
              <p>
                <span className='text-gray-500'>料金</span>{' '}
                {formatPrice(menu.base_price)}
              </p>
            </div>
            <button
              type='button'
              disabled={submitting}
              onClick={handleConfirm}
              className='w-full min-h-[52px] bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50'
            >
              {submitting ? '予約中...' : 'この内容で予約する'}
            </button>
          </div>
        )}

        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center py-6 space-y-4'
          >
            <div className='text-5xl' aria-hidden>
              ✅
            </div>
            <h2 className='text-xl font-semibold text-gray-900'>
              ご予約を受け付けました
            </h2>
            {customerName ? (
              <p className='text-gray-600'>{customerName} 様</p>
            ) : null}
            <div className='bg-white border border-gray-200 rounded-lg p-4 text-left text-sm space-y-2 max-w-sm mx-auto'>
              {completedBooking?.booking_number && (
                <p>
                  <span className='text-gray-500'>予約番号</span>{' '}
                  {completedBooking.booking_number}
                </p>
              )}
              <p>
                <span className='text-gray-500'>メニュー</span>{' '}
                {completedBooking?.menu_name ||
                  menu?.display_name ||
                  menu?.name}
              </p>
              <p>
                <span className='text-gray-500'>日時</span>{' '}
                {completedBooking?.booking_date
                  ? formatDateLabel(completedBooking.booking_date, todayKey)
                  : formatDateLabel(date, todayKey)}{' '}
                {formatTime(
                  completedBooking?.start_time ||
                    selectedSlot?.start_time ||
                    ''
                )}
              </p>
            </div>
            <p className='text-gray-600 text-sm'>
              LINEに通知が届きます。当日お待ちしています。
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center py-8'>
    <div className='animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent' />
  </div>
);

/** Step 1: メニュー一覧 */
const StepMenuSelect: React.FC<{
  storeId: number;
  onSelect: (m: MenuItem) => void;
  selectedMenu: MenuItem | null;
}> = ({ storeId, onSelect, selectedMenu }) => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stores/${storeId}/menus`)
      .then(r => r.json())
      .then(json => {
        if (json?.data?.menus) setMenus(json.data.menus);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return <LoadingSpinner />;
  if (!menus.length) {
    return <p className='text-gray-500 py-4'>メニューがありません</p>;
  }

  return (
    <div className='space-y-3'>
      <p className='text-gray-700'>受けたいメニューを1つ選んでください</p>
      {menus.map(m => (
        <button
          key={m.id}
          type='button'
          onClick={() => onSelect(m)}
          className={`w-full min-h-[56px] p-4 rounded-lg border-2 text-left transition ${
            selectedMenu?.id === m.id
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className='flex gap-3'>
            {m.photo_url ? (
              <img
                src={m.photo_url}
                alt=''
                className='w-14 h-14 rounded-md object-cover shrink-0 bg-gray-100'
              />
            ) : null}
            <div className='min-w-0 flex-1'>
              <div className='font-medium text-gray-900'>
                {m.display_name || m.name}
              </div>
              <div className='text-sm text-gray-500 mt-0.5'>
                {formatPrice(m.base_price)} · {m.base_duration}分
              </div>
              {m.description ? (
                <p className='text-xs text-gray-500 mt-1 line-clamp-2'>
                  {m.description}
                </p>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default BookingFlow;
