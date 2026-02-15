import {Module} from '@nestjs/common';
import {AuthModule} from './auth/auth.module';
import {PluginsModule} from './plugins/plugins.module';
import {PrismaModule} from './prisma/prisma.module';
import {RedisModule} from './redis/redis.module';
import {UsersModule} from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, PluginsModule, UsersModule, RedisModule],
})
export class AppModule { }
