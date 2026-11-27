import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // PGlite boot and jsdom forms exceed the 5s default when the full suite runs in parallel.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [".claude/**", ".next/**", "node_modules/**"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
