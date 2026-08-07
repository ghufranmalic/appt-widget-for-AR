import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/appt-widget-for-AR/",
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
