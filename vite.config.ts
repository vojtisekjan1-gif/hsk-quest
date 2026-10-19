import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
