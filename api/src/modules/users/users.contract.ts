export const USERS_ADMIN_PORT = Symbol('USERS_ADMIN_PORT');

export interface UsersAdminPort {
  findByEmail(email: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    isActive: boolean;
  } | null>;
  createLocalUser(params: {
    email: string;
    passwordHash: string;
    displayName?: string;
    roleIds?: string[];
    defaultRoleName?: string;
    isActive?: boolean;
  }): Promise<{
    id: string;
    email: string;
    displayName: string;
    isActive: boolean;
  } | null>;
  listUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
    authProvider?: string;
    createdFrom?: Date;
    createdTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<unknown>;
  getUserWithRoles(id: string): Promise<{
    isActive: boolean;
    roles: Array<{ id: string; name: string }>;
  } & Record<string, unknown>>;
  updateUserRoles(userId: string, roleIds: string[]): Promise<{
    roles: Array<{ id: string; name: string }>;
  } & Record<string, unknown>>;
  updateUserStatus(userId: string, isActive: boolean): Promise<{
    isActive: boolean;
  } & Record<string, unknown>>;
}

