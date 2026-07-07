import { describe, expect, it, vi } from "vitest";

import {
  deleteChunkedSecureStoreItem,
  getChunkedSecureStoreItem,
  SECURE_STORE_CHUNK_SIZE,
  setChunkedSecureStoreItem,
  type SecureStoreBackend,
} from "@/lib/chunkedSecureStore";

const createSecureStore = () => {
  const values = new Map<string, string>();
  const backend: SecureStoreBackend = {
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };

  return {
    backend,
    values,
  };
};

describe("chunked SecureStore helpers", () => {
  it("stores small values directly", async () => {
    const { backend, values } = createSecureStore();

    await setChunkedSecureStoreItem(backend, "token", "small-token");

    expect(values.get("token")).toBe("small-token");
    expect(values.has("token.chunk_metadata")).toBe(false);
    await expect(getChunkedSecureStoreItem(backend, "token")).resolves.toBe("small-token");
  });

  it("chunks and reconstructs values that exceed the per-item limit", async () => {
    const { backend, values } = createSecureStore();
    const largeValue = "a".repeat(SECURE_STORE_CHUNK_SIZE * 2 + 17);

    await setChunkedSecureStoreItem(backend, "session", largeValue);

    expect(values.has("session")).toBe(false);
    expect(values.has("session.chunk_metadata")).toBe(true);
    expect(values.get("session.chunk.0")).toHaveLength(SECURE_STORE_CHUNK_SIZE);
    await expect(getChunkedSecureStoreItem(backend, "session")).resolves.toBe(largeValue);
  });

  it("removes stale chunks when overwriting a large value with a small value", async () => {
    const { backend, values } = createSecureStore();

    await setChunkedSecureStoreItem(
      backend,
      "session",
      "b".repeat(SECURE_STORE_CHUNK_SIZE + 1),
    );
    await setChunkedSecureStoreItem(backend, "session", "short-session");

    expect(values.get("session")).toBe("short-session");
    expect(values.has("session.chunk_metadata")).toBe(false);
    expect(values.has("session.chunk.0")).toBe(false);
    expect(values.has("session.chunk.1")).toBe(false);
    await expect(getChunkedSecureStoreItem(backend, "session")).resolves.toBe("short-session");
  });

  it("deletes chunked values and metadata", async () => {
    const { backend, values } = createSecureStore();

    await setChunkedSecureStoreItem(
      backend,
      "session",
      "c".repeat(SECURE_STORE_CHUNK_SIZE + 1),
    );
    await deleteChunkedSecureStoreItem(backend, "session");

    expect(values.size).toBe(0);
    await expect(getChunkedSecureStoreItem(backend, "session")).resolves.toBeNull();
  });
});
