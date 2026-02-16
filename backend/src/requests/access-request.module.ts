import {Module} from '@nestjs/common';
import {PluginsModule} from '../plugins/plugins.module';
import {AccessRequestController} from './access-request.controller';
import {AccessRequestService} from './access-request.service';

@Module({
  imports: [PluginsModule],
  controllers: [AccessRequestController],
  providers: [AccessRequestService],
})
export class AccessRequestModule { }
