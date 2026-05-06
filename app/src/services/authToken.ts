export const ACCESS_TOKEN_STORAGE_KEY = 'ecotrack_access_token';
export const MAX_AUTHORIZATION_HEADER_BYTES = 12_000;

const AUTHORIZATION_BEARER_PREFIX = 'Bearer ';

const getUtf8ByteLength = (value: string) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength;
  }

  return value.length;
};

export const getAuthorizationHeaderByteLength = (token: string) =>
  getUtf8ByteLength(`${AUTHORIZATION_BEARER_PREFIX}${token.trim()}`);

export const isAccessTokenHeaderSafe = (token: string) =>
  getAuthorizationHeaderByteLength(token) <= MAX_AUTHORIZATION_HEADER_BYTES;

export const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const setAccessToken = (token: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedToken = token.trim();
  if (!normalizedToken || !isAccessTokenHeaderSafe(normalizedToken)) {
    clearAccessToken();
    return false;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
  return true;
};

export const clearAccessToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const withAuthHeader = (headers?: HeadersInit) => {
  const resolved = new Headers(headers ?? {});
  const token = getAccessToken();

  if (token && isAccessTokenHeaderSafe(token) && !resolved.has('Authorization')) {
    resolved.set('Authorization', `Bearer ${token}`);
  }

  return resolved;
};
