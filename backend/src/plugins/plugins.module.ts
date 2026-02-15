import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {PluginsController} from './plugins.controller';
import {PluginsService} from './plugins.service';

@Module({
  imports: [AuthModule],
  controllers: [PluginsController],
  providers: [PluginsService],
})
export class PluginsModule { }
