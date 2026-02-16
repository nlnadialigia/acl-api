import {Global, Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {PermissionCacheService} from './permission-cache.service';
import {PluginsController} from './plugins.controller';
import {PluginsService} from './plugins.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [PluginsController],
  providers: [PluginsService, PermissionCacheService],
  exports: [PermissionCacheService],
})
export class PluginsModule { }
