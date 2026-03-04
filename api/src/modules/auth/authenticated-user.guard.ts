import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import type { RequestWithAuthUser } from './authorization.types.js';

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authUser = await this.authService.resolveActiveUserFromRequest(request);

    if (!authUser) {
      throw new UnauthorizedException();
    }

    request.authUser = authUser;

    return true;
  }
}

