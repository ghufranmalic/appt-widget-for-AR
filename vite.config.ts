import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH || "/appt-widget-for-AR/";

export default defineConfig({
  base,
  publicDir: "public",
  build: {
    rollupOptions: {
      input: {
        main: "src/index.html",
        admin: "src/admin.html",
      },
    },
  },
  plugins: [react()],
});
