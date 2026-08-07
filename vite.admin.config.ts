import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const widgetUrl =
  process.env.VITE_WIDGET_URL || "https://ghufranmalic.github.io/appt-widget-for-AR/";
const scheduleUrl =
  process.env.VITE_SCHEDULE_URL || `${widgetUrl.replace(/\/?$/, "/")}schedule.json`;

export default defineConfig({
  base: "/",
  publicDir: "public",
  define: {
    "import.meta.env.VITE_WIDGET_URL": JSON.stringify(widgetUrl),
    "import.meta.env.VITE_SCHEDULE_URL": JSON.stringify(scheduleUrl),
  },
  build: {
    outDir: "dist-admin",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "src/admin.html",
      },
    },
  },
  plugins: [react()],
});
