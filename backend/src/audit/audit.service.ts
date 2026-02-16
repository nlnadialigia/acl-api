import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) { }

  async log(data: {
    targetId: string;
    resourceId: string;
    action: string;
    actorId: string;
    details?: any;
  }) {
    return this.prisma.permissionAuditLog.create({
      data: {
        targetId: data.targetId,
        resourceId: data.resourceId,
        action: data.action,
        actorId: data.actorId,
        details: data.details || {},
      },
    });
  }
}
