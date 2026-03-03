const DEFAULT_AUTH_REDIRECT_PATH = '/app';
const AUTH_REDIRECT_STORAGE_KEY = 'ecotrack.auth.redirect';

const isSafeRedirectPath = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

export const getDefaultAuthRedirectPath = () => DEFAULT_AUTH_REDIRECT_PATH;

export const normalizeAuthRedirectPath = (value: string | null | undefined) => {
  if (!isSafeRedirectPath(value)) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  return value;
};

export const resolveRequestedAuthRedirect = (search: string) => {
  const searchParams = new URLSearchParams(search);
  return normalizeAuthRedirectPath(searchParams.get('next'));
};

export const resolveAuthRedirectTarget = (search: string) => {
  const searchParams = new URLSearchParams(search);
  if (searchParams.has('next')) {
    return normalizeAuthRedirectPath(searchParams.get('next'));
  }

  if (typeof window === 'undefined') {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  return normalizeAuthRedirectPath(window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY));
};

export const storePendingAuthRedirect = (path: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    AUTH_REDIRECT_STORAGE_KEY,
    normalizeAuthRedirectPath(path),
  );
};

export const clearPendingAuthRedirect = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
};
