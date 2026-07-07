export type SecureStoreBackend = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type ChunkMetadata = {
  chunkSize: number;
  chunks: number;
  version: 1;
};

export const SECURE_STORE_CHUNK_SIZE = 1800;

const metadataKey = (key: string) => `${key}.chunk_metadata`;
const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

const parseMetadata = (value: string | null): ChunkMetadata | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ChunkMetadata>;
    if (
      parsed.version === 1 &&
      Number.isInteger(parsed.chunks) &&
      typeof parsed.chunks === "number" &&
      parsed.chunks > 0 &&
      Number.isInteger(parsed.chunkSize) &&
      typeof parsed.chunkSize === "number" &&
      parsed.chunkSize > 0
    ) {
      return {
        chunkSize: parsed.chunkSize,
        chunks: parsed.chunks,
        version: 1,
      };
    }
  } catch {
    return null;
  }

  return null;
};

const readMetadata = async (secureStore: SecureStoreBackend, key: string) =>
  parseMetadata(await secureStore.getItemAsync(metadataKey(key)));

const deleteStoredChunks = async (
  secureStore: SecureStoreBackend,
  key: string,
  metadata: ChunkMetadata | null,
) => {
  if (!metadata) {
    return;
  }

  await Promise.all(
    Array.from({ length: metadata.chunks }, (_unused, index) =>
      secureStore.deleteItemAsync(chunkKey(key, index)),
    ),
  );
};

export const getChunkedSecureStoreItem = async (
  secureStore: SecureStoreBackend,
  key: string,
) => {
  const metadata = await readMetadata(secureStore, key);
  if (!metadata) {
    return secureStore.getItemAsync(key);
  }

  const chunks = await Promise.all(
    Array.from({ length: metadata.chunks }, (_unused, index) =>
      secureStore.getItemAsync(chunkKey(key, index)),
    ),
  );

  if (chunks.some((chunk) => chunk === null)) {
    return secureStore.getItemAsync(key);
  }

  return chunks.join("");
};

export const setChunkedSecureStoreItem = async (
  secureStore: SecureStoreBackend,
  key: string,
  value: string,
) => {
  const existingMetadata = await readMetadata(secureStore, key);
  await Promise.all([
    secureStore.deleteItemAsync(key),
    secureStore.deleteItemAsync(metadataKey(key)),
    deleteStoredChunks(secureStore, key, existingMetadata),
  ]);

  if (value.length <= SECURE_STORE_CHUNK_SIZE) {
    await secureStore.setItemAsync(key, value);
    return;
  }

  const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, "g")) ?? [];
  await Promise.all(
    chunks.map((chunk, index) => secureStore.setItemAsync(chunkKey(key, index), chunk)),
  );
  await secureStore.setItemAsync(
    metadataKey(key),
    JSON.stringify({
      chunkSize: SECURE_STORE_CHUNK_SIZE,
      chunks: chunks.length,
      version: 1,
    } satisfies ChunkMetadata),
  );
};

export const deleteChunkedSecureStoreItem = async (
  secureStore: SecureStoreBackend,
  key: string,
) => {
  const existingMetadata = await readMetadata(secureStore, key);
  await Promise.all([
    secureStore.deleteItemAsync(key),
    secureStore.deleteItemAsync(metadataKey(key)),
    deleteStoredChunks(secureStore, key, existingMetadata),
  ]);
};
