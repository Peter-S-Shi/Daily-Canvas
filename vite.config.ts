import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4173,
    watch: {
      // The Tauri CLI owns rebuilds for src-tauri. Watching it from Vite adds nothing
      // and, on Windows, trips EBUSY on files Cargo holds open under src-tauri/target.
      ignored: ["**/src-tauri/**"],
    },
  },
});
