import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) { }

  async notify(userId: string, title: string, message: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {userId},
      orderBy: {createdAt: 'desc'},
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: {id},
      data: {read: true},
    });
  }
}
