import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth/auth.service.js';

import type { AdminUserContext } from './admin.types.js';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);
const normalizeRole = (value?: string | null) => value?.trim().toLowerCase();

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminUserContext }>();

    const authUser = await this.authService.resolveActiveUserFromRequest(request);
    if (!authUser) {
      throw new UnauthorizedException();
    }
    const roleNames = new Set<string>();
    const primaryRole = normalizeRole(authUser.role);
    if (primaryRole) {
      roleNames.add(primaryRole);
    }

    for (const role of authUser.roles) {
      const roleName = normalizeRole(role.name);
      if (roleName) {
        roleNames.add(roleName);
      }
    }

    const isAdmin = Array.from(roleNames).some((role) => ADMIN_ROLE_NAMES.has(role));

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    request.adminUser = {
      id: authUser.id,
      email: authUser.email,
      displayName: authUser.displayName,
      role: authUser.role,
      roles: authUser.roles.map((role) => ({ id: role.id, name: role.name })),
      isActive: authUser.isActive,
    };

    return true;
  }
}

