import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      react: path.resolve(__dirname, "../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../node_modules/react-dom"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      path.resolve(__dirname, "offline-tests/**/*.test.{ts,tsx}"),
      "offline-tests/**/*.test.{ts,tsx}",
      "mobile/offline-tests/**/*.test.{ts,tsx}",
    ],
    setupFiles: [path.resolve(__dirname, "offline-tests/setup.ts")],
    clearMocks: true,
  },
});
