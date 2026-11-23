import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js", "tests/catalog/**/*.test.js"],
    environment: "node",
    // The catalog tests solve and grade every puzzle (10,000 per level).
    testTimeout: 300_000,
  },
});
