/**
 * LIFF 共通ステータス画面（ローディング・設定不足・エラー）
 * 常にユーザーが次に何をすべきか分かる文言を表示する
 */
import React from "react";

export type LiffStatusVariant = "loading" | "login" | "setup" | "error" | "dev";

interface LiffStatusScreenProps {
  variant: LiffStatusVariant;
  title: string;
  message: string;
  hint?: string;
  storeId?: number;
  onRetry?: () => void;
}

const variantStyles: Record<LiffStatusVariant, { icon: string; accent: string }> = {
  loading: { icon: "⏳", accent: "border-emerald-500" },
  login: { icon: "💬", accent: "border-emerald-500" },
  setup: { icon: "🔧", accent: "border-amber-400" },
  error: { icon: "⚠️", accent: "border-red-400" },
  dev: { icon: "🛠", accent: "border-blue-400" },
};

const LiffStatusScreen: React.FC<LiffStatusScreenProps> = ({
  variant,
  title,
  message,
  hint,
  storeId,
  onRetry,
}) => {
  const style = variantStyles[variant];
  const isLoading = variant === "loading" || variant === "login";

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm border-l-4 border-l-emerald-600">
          <p className="text-lg font-bold text-emerald-700">tugical</p>
          <p className="text-xs text-gray-500 mt-0.5">オンライン予約</p>
        </div>

        <div className={`rounded-2xl border bg-white p-6 shadow-sm border-l-4 ${style.accent}`}>
          <div className="text-center">
            {isLoading ? (
              <div
                className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600"
                aria-hidden
              />
            ) : (
              <div className="text-5xl mb-4" aria-hidden>
                {style.icon}
              </div>
            )}

            <h1 className="text-lg font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{message}</p>

            {hint && (
              <p className="mt-4 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-xl p-3 text-left whitespace-pre-line">
                {hint}
              </p>
            )}

            {storeId != null && variant === "setup" && (
              <p className="mt-3 text-xs text-gray-400">店舗 ID: {storeId}</p>
            )}

            {onRetry && !isLoading && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                再読み込み
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiffStatusScreen;
