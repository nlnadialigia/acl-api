import {Module} from '@nestjs/common';
import {AuthModule} from './auth/auth.module';
import {PluginsModule} from './plugins/plugins.module';
import {PrismaModule} from './prisma/prisma.module';
import {UsersModule} from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, PluginsModule, UsersModule],
})
export class AppModule { }
