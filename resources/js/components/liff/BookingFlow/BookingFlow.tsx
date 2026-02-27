/**
 * LIFF 予約フロー（5ステップ・単一メニュー）
 * 1. メニュー選択 2. 日付選択 3. 空き時間取得・仮押さえ 4. 確認 5. 完了
 */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = "/api/v1/liff";

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
}

interface BookingFlowProps {
  storeId: number;
  customerId: number;
  customerName: string;
  onComplete: (booking: any) => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({
  storeId,
  customerId,
  customerName,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState<MenuItem | null>(null);
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 日付オプション（今日〜14日後）
  const dateOptions: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const v = d.toISOString().slice(0, 10);
    const label = i === 0 ? "今日" : i === 1 ? "明日" : `${d.getMonth() + 1}/${d.getDate()}`;
    dateOptions.push({ value: v, label });
  }

  // Step 3: 日付・メニューが決まったら空き時間取得
  useEffect(() => {
    if (step !== 3 || !menu || !date) return;
    setLoading(true);
    setError(null);
    setSlots([]);
    setSelectedSlot(null);
    setHoldToken(null);
    fetch(
      `${API_BASE}/availability?store_id=${storeId}&menu_id=${menu.id}&date=${date}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.available_slots) setSlots(json.data.available_slots);
        else setSlots([]);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [step, storeId, menu, date]);

  const handleMenuSelect = (m: MenuItem) => {
    setMenu(m);
    setStep(2);
    setError(null);
  };

  const handleDateSelect = (d: string) => {
    setDate(d);
    setStep(3);
    setError(null);
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    if (!menu) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/hold-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          menu_id: menu.id,
          resource_id: slot.resource_id,
          booking_date: date,
          start_time: slot.start_time,
          customer_id: customerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "仮押さえに失敗しました");
        return;
      }
      setHoldToken(json.data.hold_token);
      setSelectedSlot(slot);
      setStep(4);
    } catch {
      setError("仮押さえに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!holdToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          hold_token: holdToken,
          customer_id: customerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "予約の確定に失敗しました");
        return;
      }
      setStep(5);
      onComplete(json.data?.booking ?? {});
    } catch {
      setError("予約の確定に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (t: string) => t.slice(0, 5);
  const formatPrice = (p: number) => `¥${p.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              disabled={step <= 1}
            >
              ← 戻る
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {step === 1 && "メニュー選択"}
              {step === 2 && "日付選択"}
              {step === 3 && "時間選択"}
              {step === 4 && "確認"}
              {step === 5 && "予約完了"}
            </h1>
            <div className="w-8" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>ステップ {step} / 5</span>
            <span>{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <motion.div
              className="bg-emerald-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: メニュー選択 */}
        {step === 1 && (
          <StepMenuSelect
            storeId={storeId}
            onSelect={handleMenuSelect}
            selectedMenu={menu}
          />
        )}

        {/* Step 2: 日付選択 */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600">予約したい日を選んでください</p>
            <div className="grid grid-cols-2 gap-2">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDateSelect(opt.value)}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-left"
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-sm text-gray-500">{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 空き時間・仮押さえ */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {date} · {menu?.display_name || menu?.name}
            </p>
            {loading && !slots.length ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-gray-500 py-4">この日は空きがありません。別の日を選んでください。</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <button
                    key={`${slot.start_time}-${slot.resource_id}`}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSlotSelect(slot)}
                    className="p-3 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-left disabled:opacity-50"
                  >
                    <span className="font-semibold">{formatTime(slot.start_time)}</span>
                    <span className="block text-xs text-gray-500">{slot.resource_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: 確認 */}
        {step === 4 && menu && selectedSlot && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><span className="text-gray-500">メニュー</span> {menu.display_name || menu.name}</p>
              <p><span className="text-gray-500">日時</span> {date} {formatTime(selectedSlot.start_time)}</p>
              <p><span className="text-gray-500">担当</span> {selectedSlot.resource_name}</p>
              <p><span className="text-gray-500">料金</span> {formatPrice(menu.base_price)}</p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? "確定中..." : "予約確定"}
            </button>
          </div>
        )}

        {/* Step 5: 完了 */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">予約が完了しました</h2>
            <p className="text-gray-600">
              LINEに通知が届きます。管理画面でもご確認いただけます。
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

/** Step 1: メニュー一覧（API取得） */
const StepMenuSelect: React.FC<{
  storeId: number;
  onSelect: (m: MenuItem) => void;
  selectedMenu: MenuItem | null;
}> = ({ storeId, onSelect, selectedMenu }) => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stores/${storeId}/menus`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.menus) setMenus(json.data.menus);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!menus.length) {
    return <p className="text-gray-500 py-4">メニューがありません</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-600">メニューを1つ選んでください</p>
      {menus.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m)}
          className={`w-full p-4 rounded-lg border-2 text-left transition ${
            selectedMenu?.id === m.id
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="font-medium">{m.display_name || m.name}</div>
          <div className="text-sm text-gray-500">
            ¥{m.base_price.toLocaleString()} · {m.base_duration}分
          </div>
        </button>
      ))}
    </div>
  );
};

export default BookingFlow;
