import type { Request } from 'express';

export type ResolvedRole = {
  id: string;
  name: string;
};

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  roles: ResolvedRole[];
  permissions: string[];
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
  depotLabel?: string | null;
  depotLatitude?: string | null;
  depotLongitude?: string | null;
  isActive: boolean;
};

export type RequestWithAuthUser = Request & {
  authUser?: AuthenticatedRequestUser;
};

