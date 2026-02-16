import {Body, Controller, Get, Patch, Query, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {NotificationService} from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  @ApiOperation({summary: 'Listar notificações do usuário'})
  async list(@Query('userId') userId: string) {
    const notifications = await this.notificationService.listForUser(userId);
    const unreadCount = notifications.filter(n => !n.read).length;
    return {
      notifications,
      unreadCount,
    };
  }

  @Patch()
  @ApiOperation({summary: 'Marcar notificações como lidas'})
  async markRead(
    @Body('notificationId') notificationId?: string,
    @Body('userId') userId?: string,
    @Body('markAll') markAll?: boolean,
  ) {
    if (markAll && userId) {
      const notifications = await this.notificationService.listForUser(userId);
      for (const n of notifications) {
        if (!n.read) await this.notificationService.markAsRead(n.id);
      }
      return {success: true};
    }

    if (notificationId) {
      await this.notificationService.markAsRead(notificationId);
      return {success: true};
    }

    return {success: false};
  }
}
