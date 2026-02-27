/**
 * LIFF 予約フロー エントリ
 * - store_id は URL クエリ ?store_id=1 または /liff/1 から取得
 * - LIFF 初期化 → getProfile() → getOrCreateCustomer → BookingFlow
 */
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import BookingFlow from "../../components/liff/BookingFlow/BookingFlow";

const API_BASE = "/api/v1/liff";

function getStoreIdFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("store_id");
  if (fromQuery) return parseInt(fromQuery, 10) || 1;
  const match = window.location.pathname.match(/^\/liff\/?(\d+)?/);
  const fromPath = match && match[1] ? match[1] : null;
  return fromPath ? parseInt(fromPath, 10) : 1;
}

const LiffApp: React.FC = () => {
  const [storeId] = useState(() => getStoreIdFromUrl());
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const liff = (window as any).liff;
        if (liff) {
          await liff.init({ liffId: (import.meta as any).env?.VITE_LIFF_ID || "" });
          if (!liff.isLoggedIn()) {
            liff.login();
            return;
          }
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
          setDisplayName(profile.displayName || "");
        } else {
          // 開発時: LIFF なしで store_id のみで進める（顧客は仮）
          setLineUserId("dev-user");
          setDisplayName("開発用ユーザー");
        }
      } catch (e) {
        if (!cancelled) setError("LINE連携の初期化に失敗しました");
        console.error(e);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!lineUserId || customer !== null) return;

    let cancelled = false;

    async function fetchCustomer() {
      try {
        const res = await fetch(`${API_BASE}/customers/get-or-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            store_id: storeId,
            line_user_id: lineUserId,
            display_name: displayName || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json?.error?.message || "顧客情報の取得に失敗しました");
          return;
        }
        if (!cancelled && json?.data?.customer) {
          setCustomer({ id: json.data.customer.id, name: json.data.customer.name });
        }
      } catch (e) {
        if (!cancelled) setError("顧客情報の取得に失敗しました");
        console.error(e);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    fetchCustomer();
    return () => { cancelled = true; };
  }, [storeId, lineUserId, displayName, customer]);

  // LIFF 未ログイン時は login() が動くので何も描画しない
  const liff = (window as any).liff;
  if (liff && !liff.isLoggedIn?.()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">LINEでログインしています...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (!isReady || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleComplete = (booking: any) => {
    console.log("予約完了", booking);
    if (liff?.sendMessages && booking?.booking_number) {
      liff.sendMessages([
        {
          type: "text",
          text: `予約が完了しました！\n予約番号: ${booking.booking_number}\n日時: ${booking.booking_date} ${booking.start_time}`,
        },
      ]).catch(() => {});
    }
  };

  return (
    <BookingFlow
      storeId={storeId}
      customerId={customer.id}
      customerName={customer.name}
      onComplete={handleComplete}
    />
  );
};

const container = document.getElementById("liff-app");
if (container) {
  const root = createRoot(container);
  root.render(<LiffApp />);
}
