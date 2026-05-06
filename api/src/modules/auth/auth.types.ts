export type AuthUser = {
  provider: 'google' | 'local';
  id: string;
  authUserId?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  roleNames?: string[];
};

export type AuthTokenPayload = {
  sub: string;
  provider: 'google' | 'local';
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  tokenType?:
    | 'access'
    | 'local_access'
    | 'oauth_session'
    | 'planning_stream_session'
    | 'planning_ws_session';
};

