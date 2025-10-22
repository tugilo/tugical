import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import BookingFlow from "../../components/liff/BookingFlow/BookingFlow";

interface LiffAppProps {
  storeId: number;
  lineUserId?: string;
}

const LiffApp: React.FC<LiffAppProps> = ({ storeId, lineUserId }) => {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    // LIFF SDK初期化
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      // LIFF SDK読み込み
      if (typeof window !== "undefined" && (window as any).liff) {
        const liff = (window as any).liff;

        await liff.init({ liffId: process.env.REACT_APP_LIFF_ID });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          console.log("LINE Profile:", profile);
        } else {
          // ログインが必要な場合
          liff.login();
        }

        setIsLiffReady(true);
      } else {
        // 開発環境ではLIFF SDKなしで動作
        setIsLiffReady(true);
      }
    } catch (error) {
      console.error("LIFF初期化エラー:", error);
      setLiffError("LINE連携の初期化に失敗しました");
    }
  };

  const handleBookingComplete = (booking: any) => {
    console.log("予約完了:", booking);

    // 予約完了後の処理
    if (typeof window !== "undefined" && (window as any).liff) {
      const liff = (window as any).liff;

      // LINE通知送信
      liff.sendMessages([
        {
          type: "text",
          text: `予約が完了しました！\n予約番号: ${booking.booking_number}\n日時: ${booking.date} ${booking.time}`,
        },
      ]);
    }
  };

  if (liffError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-gray-600 mb-4">{liffError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (!isLiffReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">LINE連携を初期化しています...</p>
        </div>
      </div>
    );
  }

  return (
    <BookingFlow
      storeId={storeId}
      lineUserId={lineUserId}
      onComplete={handleBookingComplete}
    />
  );
};

// DOM要素が存在する場合のみマウント
const container = document.getElementById("liff-app");
if (container) {
  const root = createRoot(container);
  root.render(<LiffApp storeId={1} />);
}
