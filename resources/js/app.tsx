import React from "react";
import { createRoot } from "react-dom/client";

// 共通のアプリケーション設定
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-gray-900">tugical</h1>
          <p className="mt-2 text-gray-600">時間貸しリソース予約システム</p>
        </div>
      </div>
    </div>
  );
};

// DOM要素が存在する場合のみマウント
const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
