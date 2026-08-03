import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirror the "@/*" -> "./src/*" alias from tsconfig.json so tests can import
// modules the same way the app does. Without it, anything reaching through "@/"
// is untestable and silently stays uncovered.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
