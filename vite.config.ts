import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/appt-widget-for-AR/",
  plugins: [react()],
});
