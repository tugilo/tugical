/**
 * tugical 管理画面 SPA（認証・ダッシュボード計画 Step 1 / Step 2）
 * React Router で /admin 配下の /login と /dashboard を定義。未認証時は /dashboard → /login へリダイレクト。
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./auth/LoginPage";
import DashboardPage from "./dashboard/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";

const App: React.FC = () => {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
