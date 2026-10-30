import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // 브라우저가 필요 없는 순수 모듈(경로·가드·초안·클립보드·QR·CSS 토큰)만 테스트해요
    include: ["src/**/*.test.ts"],
  },
});
