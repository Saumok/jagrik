import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Single Vite SPA. Tailwind v4 runs via its Vite plugin (no postcss config needed).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    // proxy API calls to the Express backend during local dev
    proxy: { "/api": "http://localhost:8787" },
  },
});
