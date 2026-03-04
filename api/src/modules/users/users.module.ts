import { Module } from '@nestjs/common';

import { USERS_ADMIN_PORT } from './users.contract.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [
    UsersRepository,
    UsersService,
    {
      provide: USERS_ADMIN_PORT,
      useExisting: UsersService,
    },
  ],
  exports: [UsersService, USERS_ADMIN_PORT],
})
export class UsersModule {}

