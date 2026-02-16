import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {PermissionStatus, RequestStatus, Role, ScopeType} from '@prisma/client';
import {AuditService} from '../audit/audit.service';
import {EmailService} from '../email/email.service';
import {NotificationService} from '../notifications/notification.service';
import {PermissionCacheService} from '../plugins/permission-cache.service';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class AccessRequestService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notification: NotificationService,
    private email: EmailService,
    private cache: PermissionCacheService,
  ) { }

  async createRequest(userId: string, pluginId: string, scopeType: ScopeType, scopeId?: string) {
    // Check if plugin exists
    const plugin = await this.prisma.plugin.findUnique({where: {id: pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    // Check for existing pending request
    const existing = await this.prisma.accessRequest.findFirst({
      where: {userId, pluginId, status: RequestStatus.PENDING},
    });
    if (existing) throw new BadRequestException('A pending request already exists for this plugin');

    if (plugin.isPublic) {
      return this.prisma.$transaction(async (tx) => {
        // 1. Create Request (Already Approved)
        const request = await tx.accessRequest.create({
          data: {
            userId,
            pluginId,
            scopeType,
            scopeId,
            status: RequestStatus.APPROVED,
            resolvedAt: new Date(),
          },
          include: {user: true},
        });

        // 2. Create/Update Permission
        await tx.pluginPermission.upsert({
          where: {
            userId_pluginId: {userId, pluginId}
          },
          update: {
            status: PermissionStatus.ACTIVE,
            scopeType,
            scopeId,
          },
          create: {
            userId,
            pluginId,
            scopeType,
            scopeId,
            status: PermissionStatus.ACTIVE,
          },
        });

        // 3. Audit Log
        await this.audit.log({
          targetId: userId,
          resourceId: pluginId,
          action: 'AUTO_APPROVE',
          actorId: userId, // User self-granted access to a public plugin
          details: {requestId: request.id, scope: scopeType, scopeId},
        });

        // 4. Invalidate Cache
        await this.cache.invalidate(userId, plugin.name);

        // 5. Notify User (Optional, but good for consistency)
        await this.notification.notify(
          userId,
          'Acesso Concedido',
          `Você agora tem acesso ao plugin público ${plugin.name}.`,
        );

        return request;
      });
    }

    return this.prisma.accessRequest.create({
      data: {
        userId,
        pluginId,
        scopeType,
        scopeId,
        status: RequestStatus.PENDING,
      },
    });
  }

  async listRequests(actor: {userId: string, role: Role;}) {
    if (actor.role === Role.PORTAL_ADMIN) {
      return this.prisma.accessRequest.findMany({
        include: {user: true, plugin: true},
        orderBy: {requestedAt: 'desc'},
      });
    }

    // Managers see requests for plugins they manage
    const managedPlugins = await this.prisma.pluginManager.findMany({
      where: {userId: actor.userId},
      select: {pluginId: true},
    });
    const pluginIds = managedPlugins.map(mp => mp.pluginId);

    return this.prisma.accessRequest.findMany({
      where: {pluginId: {in: pluginIds}},
      include: {user: true, plugin: true},
      orderBy: {requestedAt: 'desc'},
    });
  }

  async approveRequest(requestId: string, actorId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: {id: requestId},
      include: {plugin: true, user: true},
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request is not pending');

    // Transactional logic: Update request AND Create/Update permission
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Request
      const updatedRequest = await tx.accessRequest.update({
        where: {id: requestId},
        data: {status: RequestStatus.APPROVED, resolvedById: actorId, resolvedAt: new Date()},
      });

      // 2. Create Permission (Upsert logic: enable if exists but inactive, or create new)
      await tx.pluginPermission.upsert({
        where: {
          userId_pluginId: {
            userId: request.userId,
            pluginId: request.pluginId,
          }
        },
        update: {
          status: PermissionStatus.ACTIVE,
          scopeType: request.scopeType,
          scopeId: request.scopeId,
        },
        create: {
          userId: request.userId,
          pluginId: request.pluginId,
          scopeType: request.scopeType,
          scopeId: request.scopeId,
          status: PermissionStatus.ACTIVE,
        },
      });

      // Async/Post-hook actions (usually done via events, but we'll do here for simplicity)
      // 3. Audit Log
      await this.audit.log({
        targetId: request.userId,
        resourceId: request.pluginId,
        action: 'APPROVE_ACCESS',
        actorId: actorId,
        details: {requestId, scope: request.scopeType, scopeId: request.scopeId},
      });

      // 4. Invalidate Cache
      await this.cache.invalidate(request.userId, request.plugin.name);

      // 5. Notify User
      await this.notification.notify(
        request.userId,
        'Acesso Aprovado',
        `Sua solicitação para o plugin ${request.plugin.name} foi aprovada.`,
      );

      // 6. Email (Async)
      await this.email.sendEmail(request.user.email, 'Acesso Aprovado', 'approval', {plugin: request.plugin.name});

      return updatedRequest;
    });
  }

  async rejectRequest(requestId: string, actorId: string, reason?: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: {id: requestId},
      include: {plugin: true, user: true},
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request is not pending');

    const updatedRequest = await this.prisma.accessRequest.update({
      where: {id: requestId},
      data: {status: RequestStatus.REJECTED, resolvedById: actorId, resolvedAt: new Date()},
    });

    // Notify User
    await this.notification.notify(
      request.userId,
      'Acesso Negado',
      `Sua solicitação para o plugin ${request.plugin.name} foi recusada.`,
    );

    return updatedRequest;
  }

  async revokePermission(userId: string, pluginId: string, actorId: string) {
    const plugin = await this.prisma.plugin.findUnique({where: {id: pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    const permission = await this.prisma.pluginPermission.findUnique({
      where: {userId_pluginId: {userId, pluginId}},
    });

    if (!permission) throw new NotFoundException('Permission not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark permission as REVOKED
      const updatedPermission = await tx.pluginPermission.update({
        where: {userId_pluginId: {userId, pluginId}},
        data: {status: PermissionStatus.REVOKED},
      });

      // 2. Audit Log
      await this.audit.log({
        targetId: userId,
        resourceId: pluginId,
        action: 'REVOKE_ACCESS',
        actorId,
      });

      // 3. Invalidate Cache
      await this.cache.invalidate(userId, plugin.name);

      // 4. Notify User
      await this.notification.notify(
        userId,
        'Acesso Revogado',
        `Seu acesso ao plugin ${plugin.name} foi revogado.`,
      );

      return updatedPermission;
    });
  }
}
