/**
 * LIFF 動的 init + ID token 連携
 * init 前に liff.isLoggedIn() を呼ばない（SDK クラッシュ防止）
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import BookingFlow from "../../components/liff/BookingFlow/BookingFlow";
import LiffStatusScreen from "../../components/liff/LiffStatusScreen";

const API_BASE = "/api/v1/liff";

type InitPhase = "idle" | "loading_config" | "loading_liff" | "logging_in" | "loading_customer";

interface LineConfig {
  store_id: number;
  line_liff_id: string | null;
  line_integration_active: boolean;
  has_line_integration: boolean;
}

function getStoreIdFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("store_id") || params.get("storeId");
  if (fromQuery) return parseInt(fromQuery, 10) || 1;
  const match = window.location.pathname.match(/^\/liff\/?(\d+)?/);
  const fromPath = match?.[1] ?? null;
  return fromPath ? parseInt(fromPath, 10) : 1;
}

function isDevFallbackAllowed(): boolean {
  return import.meta.env.DEV;
}

function getLiffSdk(): typeof window.liff | undefined {
  return (window as Window & { liff?: typeof window.liff }).liff;
}

const LiffApp: React.FC = () => {
  const [storeId] = useState(() => getStoreIdFromUrl());
  const [phase, setPhase] = useState<InitPhase>("idle");
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; hint?: string } | null>(null);
  const initStarted = useRef(false);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    let cancelled = false;

    async function initLiff() {
      setPhase("loading_config");
      setError(null);
      setSetupRequired(false);

      try {
        const configRes = await fetch(`${API_BASE}/stores/${storeId}/line-config`, {
          headers: { Accept: "application/json" },
        });

        if (configRes.status === 404) {
          if (!cancelled) {
            setError({
              title: "店舗が見つかりません",
              message: "この予約ページの URL が正しくない可能性があります。",
              hint: "LINE のトークから開き直すか、店舗にお問い合わせください。",
            });
          }
          return;
        }

        const configJson = await configRes.json();
        if (!configRes.ok || !configJson?.success) {
          throw new Error(configJson?.error?.message || "店舗設定の取得に失敗しました");
        }

        const config = configJson.data as LineConfig;
        const liffId =
          config.line_liff_id?.trim() ||
          (import.meta as ImportMeta & { env?: { VITE_LIFF_ID?: string } }).env?.VITE_LIFF_ID?.trim() ||
          "";

        if (!liffId) {
          if (isDevFallbackAllowed()) {
            if (!cancelled) {
              setDevMode(true);
              setLineUserId("dev-user");
              setDisplayName("開発用ユーザー");
              setPhase("loading_customer");
            }
            return;
          }

          if (!cancelled) {
            setSetupRequired(true);
            setPhase("idle");
          }
          return;
        }

        const liff = getLiffSdk();
        if (!liff) {
          throw new Error("LINE アプリから開いてください（LIFF SDK が読み込めませんでした）");
        }

        setPhase("loading_liff");
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          if (!cancelled) setPhase("logging_in");
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        if (!cancelled) {
          setLineUserId(profile.userId);
          setDisplayName(profile.displayName || "");
          const token = liff.getIDToken?.();
          if (token) setIdToken(token);
          setPhase("loading_customer");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const raw = e instanceof Error ? e.message : "LINE連携の初期化に失敗しました";
          setError({
            title: "予約を開始できません",
            message: raw,
            hint: "LINE アプリ内ブラウザから開いているか確認し、問題が続く場合は店舗へお問い合わせください。",
          });
          setPhase("idle");
        }
      }
    }

    void initLiff();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    if (phase !== "loading_customer" || !lineUserId || customer !== null) return;

    let cancelled = false;

    async function fetchCustomer() {
      try {
        const body: Record<string, unknown> = {
          store_id: storeId,
          display_name: displayName || undefined,
        };

        if (idToken) {
          body.id_token = idToken;
        } else if (devMode) {
          body.line_user_id = lineUserId;
        }

        const res = await fetch(`${API_BASE}/customers/get-or-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setError({
              title: "お客様情報を取得できません",
              message: json?.error?.message || json?.message || "顧客情報の取得に失敗しました",
              hint: "再読み込みしても改善しない場合は、店舗スタッフにお声がけください。",
            });
          }
          return;
        }

        if (!cancelled && json?.data?.customer) {
          setCustomer({
            id: json.data.customer.id,
            name: json.data.customer.name,
          });
          setPhase("idle");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError({
            title: "通信エラー",
            message: "サーバーとの通信に失敗しました。",
            hint: "通信環境を確認してから、もう一度お試しください。",
          });
        }
      }
    }

    void fetchCustomer();
    return () => {
      cancelled = true;
    };
  }, [phase, storeId, lineUserId, idToken, displayName, customer, devMode]);

  if (setupRequired) {
    return (
      <LiffStatusScreen
        variant="setup"
        title="予約の準備ができていません"
        message={
          "この店舗の LINE 予約設定（LIFF）がまだ完了していません。\n\n" +
          "しばらくお待ちいただくか、店舗へ直接ご予約・お問い合わせください。"
        }
        hint={
          "【店舗オーナー向け】\n" +
          "管理画面 → 設定 → LIFF ID を入力し、LINE Developers の LIFF エンドポイント URL に\n" +
          `${window.location.origin}/liff/${storeId} を登録してください。`
        }
        storeId={storeId}
        onRetry={reload}
      />
    );
  }

  if (error) {
    return (
      <LiffStatusScreen
        variant="error"
        title={error.title}
        message={error.message}
        hint={error.hint}
        storeId={storeId}
        onRetry={reload}
      />
    );
  }

  if (phase === "loading_config") {
    return (
      <LiffStatusScreen
        variant="loading"
        title="読み込み中"
        message="店舗の設定を確認しています…"
      />
    );
  }

  if (phase === "loading_liff") {
    return (
      <LiffStatusScreen
        variant="loading"
        title="読み込み中"
        message="LINE 連携を準備しています…"
      />
    );
  }

  if (phase === "logging_in") {
    return (
      <LiffStatusScreen
        variant="login"
        title="LINE ログイン"
        message="LINE でログインしています…\n画面が切り替わらない場合は、再読み込みしてください。"
        onRetry={reload}
      />
    );
  }

  if (phase === "loading_customer" || !customer) {
    return (
      <LiffStatusScreen
        variant="loading"
        title="読み込み中"
        message="お客様情報を確認しています…"
      />
    );
  }

  const liff = getLiffSdk();

  const handleComplete = (booking: { booking_number?: string; booking_date?: string; start_time?: string }) => {
    if (liff?.sendMessages && booking?.booking_number) {
      liff
        .sendMessages([
          {
            type: "text",
            text: `予約が完了しました！\n予約番号: ${booking.booking_number}\n日時: ${booking.booking_date} ${booking.start_time}`,
          },
        ])
        .catch(() => {});
    }
  };

  return (
    <div className="relative">
      {devMode && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-3 py-2 text-center text-xs text-amber-900">
          開発モード（LIFF 未設定のためテスト用ユーザーで表示しています）
        </div>
      )}
      <BookingFlow
        storeId={storeId}
        customerId={customer.id}
        customerName={customer.name}
        onComplete={handleComplete}
      />
    </div>
  );
};

const container = document.getElementById("liff-app");
if (container) {
  createRoot(container).render(<LiffApp />);
} else {
  document.body.innerHTML =
    '<div style="font-family:sans-serif;padding:24px;text-align:center;color:#334155">' +
    "<p>予約画面を読み込めませんでした。</p><p>ページを再読み込みしてください。</p></div>";
}
