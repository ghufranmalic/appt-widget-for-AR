import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/appt-widget-for-AR/",
  build: {
    rollupOptions: {
      input: "src/index.html",
    },
  },
  plugins: [react()],
});
