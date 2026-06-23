import * as React from "react";
import { createRoot } from "react-dom/client";
import AppointmentWidget from "../AppointmentWidget";

import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <main className="testShell">
      <AppointmentWidget />
    </main>
  </React.StrictMode>,
);
