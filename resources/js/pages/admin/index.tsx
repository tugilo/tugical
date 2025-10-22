import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// DOM要素が存在する場合のみマウント
const container = document.getElementById("admin-app");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
