import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
      "@api": path.resolve(rootDirectory, "src/api"),
      "react-native": path.resolve(rootDirectory, "src/tests/shims/react-native.ts"),
      "expo-constants": path.resolve(rootDirectory, "src/tests/shims/expo-constants.ts"),
      "expo-notifications": path.resolve(rootDirectory, "src/tests/shims/expo-notifications.ts")
    }
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1
  }
});
