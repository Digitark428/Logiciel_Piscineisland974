import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Permet d'importer des modules marqués "server-only" dans les tests unitaires.
      "server-only": resolve(__dirname, "tests/stubs/empty.ts"),
      "@": resolve(__dirname, "src"),
    },
  },
});
