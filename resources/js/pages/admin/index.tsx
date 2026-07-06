import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import adminTheme from "@/theme/adminTheme";
import App from "./App";

// DOM要素が存在する場合のみマウント（管理画面＝MUI ThemeProvider 適用）
const container = document.getElementById("admin-app");
if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
