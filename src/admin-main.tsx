import * as React from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "../admin/AdminApp";

import "../admin/admin.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
