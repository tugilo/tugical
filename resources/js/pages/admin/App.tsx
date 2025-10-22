import React from "react";

// 管理者用のメインコンポーネント（統合版）
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-gray-900">tugical 管理画面</h1>
          <p className="mt-2 text-gray-600">予約管理システム（統合版）</p>
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">統合完了</h2>
            <p className="text-gray-600">
              frontendとbackendがLaravelアプリケーションとして統合されました。
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold text-emerald-900">管理者機能</h3>
                <p className="text-sm text-emerald-700">
                  予約・顧客・メニュー管理
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">LIFF機能</h3>
                <p className="text-sm text-blue-700">LINE連携予約システム</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
