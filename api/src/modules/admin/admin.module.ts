import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { InternalEventsModule } from '../events/internal-events.module.js';
import { IngestionModule } from '../iot/ingestion/ingestion.module.js';
import { ValidatedConsumerModule } from '../iot/validated-consumer/validated-consumer.module.js';
import { UsersModule } from '../users/users.module.js';

import { AdminAuditController } from './admin.audit.controller.js';
import { AdminAuditRepository } from './admin.audit.repository.js';
import { AdminAuditService } from './admin.audit.service.js';
import { AdminEventWorkflowController } from './admin.event-workflow.controller.js';
import { AdminEventWorkflowRepository } from './admin.event-workflow.repository.js';
import { AdminEventWorkflowService } from './admin.event-workflow.service.js';
import { AdminGuard } from './admin.guard.js';
import { AdminRolesController } from './admin.roles.controller.js';
import { AdminRolesRepository } from './admin.roles.repository.js';
import { AdminRolesService } from './admin.roles.service.js';
import { AdminSettingsController } from './admin.settings.controller.js';
import { AdminSettingsRepository } from './admin.settings.repository.js';
import { AdminSettingsService } from './admin.settings.service.js';
import { AdminUsersController } from './admin.users.controller.js';

@Module({
  imports: [AuthModule, UsersModule, IngestionModule, ValidatedConsumerModule, InternalEventsModule],
  controllers: [
    AdminUsersController,
    AdminRolesController,
    AdminAuditController,
    AdminSettingsController,
    AdminEventWorkflowController,
  ],
  providers: [
    AdminGuard,
    AdminAuditRepository,
    AdminAuditService,
    AdminEventWorkflowRepository,
    AdminEventWorkflowService,
    AdminRolesRepository,
    AdminRolesService,
    AdminSettingsRepository,
    AdminSettingsService,
  ],
})
export class AdminModule {}

