import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {AdminPluginsController} from './admin-plugins.controller';
import {PermissionCacheService} from './permission-cache.service';
import {PluginsController} from './plugins.controller';
import {PluginsService} from './plugins.service';

@Module({
  imports: [AuthModule],
  controllers: [PluginsController, AdminPluginsController],
  providers: [PluginsService, PermissionCacheService],
  exports: [PluginsService, PermissionCacheService],
})
export class PluginsModule { }
