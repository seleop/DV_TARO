import { defineConfig } from "vitest/config";
import path from "node:path";

// 실제 외부 API 연동 검증 (네트워크 필요). `npm run test:live`
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/empty.ts") } },
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    setupFiles: ["tests/setup-live.ts"],
    testTimeout: 30000,
  },
});
