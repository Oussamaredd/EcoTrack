const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

export const normalizeInternalEventRoutingKey = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : 'default';
};

export const computeInternalEventShardId = (
  routingKey: string | null | undefined,
  shardCount: number,
) => {
  const safeShardCount = Math.max(1, Math.trunc(shardCount || 1));
  const normalizedKey = normalizeInternalEventRoutingKey(routingKey);
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < normalizedKey.length; index += 1) {
    hash ^= normalizedKey.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return Math.abs(hash >>> 0) % safeShardCount;
};
