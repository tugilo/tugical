/**
 * LIFF 予約フロー（4ステップ・提案型導線）
 * 1. メニューを選ぶ 2. おすすめ日時（／他の日時） 3. 確認 4. 完了
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

const API_BASE = '/api/v1/liff';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
/** 空き検索・代替日提案の日数（日付一覧と同じ） */
const AVAIL_DAYS = 14;
/** おすすめとして先に出す枠数 */
const SUGGEST_LIMIT = 5;

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

  const dateOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const value = toDateKey(d);
      opts.push({ value, label: formatDateLabel(value, todayKey) });
    }
    return opts;
  }, [todayKey]);

  /** メニュー確定後：おすすめ枠を並列取得 */
  const loadSuggestions = useCallback(
    async (menuId: number) => {
      setLoading(true);
      setError(null);
      setSuggestedSlots([]);
      setDaySlotCounts({});
      try {
        const dates: string[] = [];
        const base = new Date();
        base.setHours(12, 0, 0, 0);
        for (let i = 0; i < AVAIL_DAYS; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          dates.push(toDateKey(d));
        }
        const results = await Promise.all(
          dates.map(dk => fetchDaySlots(storeId, menuId, dk))
        );
        const counts: Record<string, number> = {};
        const merged: TimeSlot[] = [];
        results.forEach((daySlots, idx) => {
          const collapsed = collapseSlotsByStart(daySlots);
          counts[dates[idx]] = collapsed.length;
          merged.push(...collapsed);
        });
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
      loadSuggestions(menu.id);
    }
  }, [step, datetimeView, menu, loadSuggestions]);

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

  const altDays = useMemo(() => {
    return dateOptions
      .filter(o => (daySlotCounts[o.value] || 0) > 0 && o.value !== date)
      .slice(0, 3);
  }, [dateOptions, daySlotCounts, date]);

  const handleMenuSelect = (m: MenuItem) => {
    setMenu(m);
    setDate('');
    setSelectedSlot(null);
    setHoldToken(null);
    setExpiresAt(null);
    setDatetimeView('suggest');
    setStep(2);
    setError(null);
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
        return;
      }
      if (datetimeView === 'pickDate') {
        setDatetimeView('suggest');
        return;
      }
      setStep(1);
    }
  };

  const stepTitle =
    step === 1
      ? 'メニューを選ぶ'
      : step === 2
        ? '日時を選ぶ'
        : step === 3
          ? '内容を確認'
          : '予約完了';

  return (
    <div className='min-h-screen bg-gradient-to-b from-emerald-50 to-white'>
      <header className='bg-white shadow-sm border-b sticky top-0 z-10'>
        <div className='max-w-md mx-auto px-4 py-3'>
          <div className='flex items-center justify-between'>
            <button
              type='button'
              onClick={handleBack}
              className='min-h-[44px] min-w-[44px] px-2 text-gray-600 hover:text-gray-800 disabled:opacity-40'
              disabled={step <= 1 || step === 4}
              aria-label='戻る'
            >
              ← 戻る
            </button>
            <h1 className='text-lg font-semibold text-gray-900'>{stepTitle}</h1>
            <div className='w-11' />
          </div>
          <div className='mt-2 flex justify-between text-xs text-gray-500'>
            <span>ステップ {Math.min(step, 4)} / 4</span>
            <span>{Math.round((Math.min(step, 4) / 4) * 100)}%</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-1.5 mt-1'>
            <motion.div
              className='bg-emerald-500 h-1.5 rounded-full'
              initial={{ width: 0 }}
              animate={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      <main className='max-w-md mx-auto px-4 py-6 pb-24'>
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

            {datetimeView === 'suggest' && (
              <>
                <p className='text-gray-700'>
                  おすすめの空きです。お好みで選んでください
                </p>
                {loading ? (
                  <LoadingSpinner />
                ) : suggestedSlots.length === 0 ? (
                  <div className='space-y-3'>
                    <p className='text-gray-600'>
                      直近で空きが見つかりませんでした。他の日時から探せます。
                    </p>
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
                      他の日時を見る
                    </button>
                  </>
                )}
              </>
            )}

            {datetimeView === 'pickDate' && (
              <>
                <p className='text-gray-700'>予約したい日を選んでください</p>
                <div className='grid grid-cols-2 gap-2'>
                  {dateOptions.map(opt => (
                    <button
                      key={opt.value}
                      type='button'
                      onClick={() => handleDateSelect(opt.value)}
                      className='min-h-[52px] p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-left'
                    >
                      <span className='font-medium'>{opt.label}</span>
                    </button>
                  ))}
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
                      この日は空きがありません。近い空き日を選んでください。
                    </p>
                    {altDays.length > 0 ? (
                      <div className='space-y-2'>
                        {altDays.map(d => (
                          <button
                            key={d.value}
                            type='button'
                            onClick={() => handleDateSelect(d.value)}
                            className='w-full min-h-[48px] p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-medium text-left'
                          >
                            {d.label}
                            <span className='ml-2 text-sm font-normal'>
                              （空き {daySlotCounts[d.value]} 枠）
                            </span>
                          </button>
                        ))}
                      </div>
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
