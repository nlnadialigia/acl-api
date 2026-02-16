import {Module} from '@nestjs/common';
import {AuditModule} from './audit/audit.module';
import {AuthModule} from './auth/auth.module';
import {EmailModule} from './email/email.module';
import {NotificationModule} from './notifications/notification.module';
import {PluginsModule} from './plugins/plugins.module';
import {PrismaModule} from './prisma/prisma.module';
import {RedisModule} from './redis/redis.module';
import {AccessRequestModule} from './requests/access-request.module';
import {UsersModule} from './users/users.module';
import {UnitsModule} from './units/units.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PluginsModule,
    UsersModule,
    RedisModule,
    AuditModule,
    NotificationModule,
    EmailModule,
    AccessRequestModule,
    UnitsModule,
  ],
})
export class AppModule { }
