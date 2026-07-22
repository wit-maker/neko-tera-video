import { defineConfig } from "vitest/config";

// 最小構成: node 環境の純粋関数ユニットテスト用(ブラウザ不要)。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
