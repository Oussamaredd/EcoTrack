export const DEFAULT_RESPONSE_COMPRESSION_LEVEL = 6;
export const DEFAULT_RESPONSE_COMPRESSION_THRESHOLD_BYTES = 1024;

const STREAM_PATHS = new Set(['/api/planning/stream']);

const normalizeHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
};

export const shouldCompressResponse = (input: {
  acceptHeader?: string | string[];
  requestPath?: string;
}) => {
  const normalizedPath = input.requestPath?.split('?')[0] ?? '';
  if (STREAM_PATHS.has(normalizedPath)) {
    return false;
  }

  const acceptHeader = normalizeHeaderValue(input.acceptHeader).toLowerCase();
  return !acceptHeader.includes('text/event-stream');
};
