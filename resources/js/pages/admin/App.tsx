/**
 * tugical 管理画面 SPA
 * 認証後は AdminShell（左ナビ）配下で /dashboard, /bookings, /menus, /customers, /resources, /settings を表示。
 * 未認証時は ProtectedRoute が /login へリダイレクト。
 */
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ToastContainer } from "@/components/admin";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import AdminShell from "./layout/AdminShell";
import DashboardPage from "./dashboard/DashboardPage";
import BookingsPage from "./bookings/BookingsPage";
import MenusPage from "./menus/MenusPage";
import CustomersPage from "./customers/CustomersPage";
import ResourcesPage from "./resources/ResourcesPage";
import SettingsPage from "./settings/SettingsPage";
import SettingsRoute from "./SettingsRoute";

const App: React.FC = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const onAuthExpired = () => clearAuth();
    window.addEventListener("tugical:auth-expired", onAuthExpired);
    return () => window.removeEventListener("tugical:auth-expired", onAuthExpired);
  }, [clearAuth]);

  return (
    <BrowserRouter basename="/admin">
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="menus" element={<MenusPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route
            path="settings"
            element={
              <SettingsRoute>
                <SettingsPage />
              </SettingsRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
