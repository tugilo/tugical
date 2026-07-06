/**
 * tugical 管理画面 SPA
 * 認証後は AdminShell（左ナビ）配下で /dashboard, /bookings, /menus, /customers, /resources, /settings を表示。
 * 未認証時は ProtectedRoute が /login へリダイレクト。
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import AdminShell from "./layout/AdminShell";
import DashboardPage from "./dashboard/DashboardPage";
import BookingsPage from "./bookings/BookingsPage";
import MenusPage from "./menus/MenusPage";
import CustomersPage from "./customers/CustomersPage";
import ResourcesPage from "./resources/ResourcesPage";
import SettingsPage from "./settings/SettingsPage";

const App: React.FC = () => {
  return (
    <BrowserRouter basename="/admin">
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
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
