/**
 * 認証必須ルートガード（ADMIN_DASHBOARD_IMPLEMENTATION_PLAN Step 2）
 * 未認証時に /admin/dashboard 等にアクセスした場合に /admin/login へリダイレクトする。
 */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, token } = useAuthStore();

  const allowed = isAuthenticated || Boolean(token);
  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

export default ProtectedRoute;
