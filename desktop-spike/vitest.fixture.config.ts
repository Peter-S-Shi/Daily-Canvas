import { defineConfig } from "vitest/config";

// Spike-only config: generates the synthetic v6 fixture. Not part of `pnpm test`.
export default defineConfig({
  test: { globals: true, include: ["desktop-spike/generate-fixture.fixture.ts"], environment: "jsdom", testTimeout: 120000 },
});
