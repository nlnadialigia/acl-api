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

  async createRequest(userId: string, pluginId: string, scopeType: ScopeType, scopeId?: string, roleId?: string) {
    // Check if plugin exists
    const plugin = await this.prisma.plugin.findUnique({where: {id: pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    // If roleId is not provided, we need a default role or throw error
    if (!roleId) throw new BadRequestException('Role must be specified');

    // Check for existing pending request for this specific scope/role combination
    // Note: The unique constraint is [userId, pluginId, scopeType, scopeId], but for requests we might allow multiple roles to be pending?
    // Actually, usually one pending per scope is enough.
    const existing = await this.prisma.accessRequest.findFirst({
      where: {userId, pluginId, scopeType, scopeId, status: RequestStatus.PENDING},
    });
    if (existing) throw new BadRequestException('A pending request already exists for this scope/plugin');

    if (plugin.isPublic) {
      return this.prisma.$transaction(async (tx) => {
        // 1. Create Request (Already Approved)
        const request = await tx.accessRequest.create({
          data: {
            userId,
            pluginId,
            roleId,
            scopeType,
            scopeId,
            status: RequestStatus.APPROVED,
            resolvedAt: new Date(),
          },
          include: {user: true, role: true},
        });

        // 2. Create/Update Permission
        await tx.pluginPermission.upsert({
          where: {
            userId_pluginId_scopeType_scopeId: {
              userId,
              pluginId,
              scopeType,
              scopeId: scopeId ?? null,
            }
          } as any,
          update: {
            status: PermissionStatus.ACTIVE,
            roleId,
          },
          create: {
            userId,
            pluginId,
            roleId,
            scopeType,
            scopeId: scopeId ?? null,
            status: PermissionStatus.ACTIVE,
          },
        });

        // 3. Audit Log
        await this.audit.log({
          targetId: userId,
          resourceId: pluginId,
          action: 'AUTO_APPROVE',
          actorId: userId,
          details: {requestId: request.id, scope: scopeType, scopeId, role: request.role.name},
        });

        // 4. Invalidate Cache
        await this.cache.invalidate(userId, plugin.name);

        // 5. Notify User
        await this.notification.notify(
          userId,
          'Acesso Concedido',
          `Você agora tem acesso ao plugin público ${plugin.name} como ${request.role.name}.`,
        );

        return request;
      });
    }

    return this.prisma.accessRequest.create({
      data: {
        userId,
        pluginId,
        roleId,
        scopeType,
        scopeId,
        status: RequestStatus.PENDING,
      },
    });
  }

  async listRequests(actor: {userId: string, role: Role;}) {
    if (actor.role === Role.PORTAL_ADMIN) {
      return this.prisma.accessRequest.findMany({
        include: {user: true, plugin: true, role: true},
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
      include: {user: true, plugin: true, role: true},
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
        include: {role: true},
      });

      // 2. Create Permission
      await tx.pluginPermission.upsert({
        where: {
          userId_pluginId_scopeType_scopeId: {
            userId: request.userId,
            pluginId: request.pluginId,
            scopeType: request.scopeType,
            scopeId: request.scopeId ?? null,
          }
        } as any,
        update: {
          status: PermissionStatus.ACTIVE,
          roleId: request.roleId,
        },
        create: {
          userId: request.userId,
          pluginId: request.pluginId,
          roleId: request.roleId,
          scopeType: request.scopeType,
          scopeId: request.scopeId ?? null,
          status: PermissionStatus.ACTIVE,
        },
      });

      // 3. Audit Log
      await this.audit.log({
        targetId: request.userId,
        resourceId: request.pluginId,
        action: 'APPROVE_ACCESS',
        actorId: actorId,
        details: {requestId, scope: request.scopeType, scopeId: request.scopeId, role: updatedRequest.role.name},
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

  async revokePermission(userId: string, pluginId: string, scopeType: ScopeType, scopeId: string | null, actorId: string) {
    const plugin = await this.prisma.plugin.findUnique({where: {id: pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    const permission = await this.prisma.pluginPermission.findUnique({
      where: {
        userId_pluginId_scopeType_scopeId: {
          userId,
          pluginId,
          scopeType,
          scopeId: scopeId ?? null,
        }
      } as any,
    });

    if (!permission) throw new NotFoundException('Permission not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark permission as REVOKED
      const updatedPermission = await tx.pluginPermission.update({
        where: {
          userId_pluginId_scopeType_scopeId: {
            userId,
            pluginId,
            scopeType,
            scopeId: scopeId ?? null,
          }
        } as any,
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

  async grantAccess(data: {userId: string; pluginId: string; roleId: string; scopeType: ScopeType; scopeId?: string;}, actor: {userId: string, role: Role;}) {
    const plugin = await this.prisma.plugin.findUnique({where: {id: data.pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    // If manager, check if they manage this plugin
    if (actor.role === Role.PLUGIN_MANAGER) {
      const isManager = await this.prisma.pluginManager.findFirst({
        where: {userId: actor.userId, pluginId: data.pluginId},
      });
      if (!isManager) throw new BadRequestException('You do not have permission to manage this plugin');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert Permission
      const permission = await tx.pluginPermission.upsert({
        where: {
          userId_pluginId_scopeType_scopeId: {
            userId: data.userId,
            pluginId: data.pluginId,
            scopeType: data.scopeType,
            scopeId: data.scopeId ?? null,
          }
        } as any,
        update: {
          status: PermissionStatus.ACTIVE,
          roleId: data.roleId,
        },
        create: {
          userId: data.userId,
          pluginId: data.pluginId,
          roleId: data.roleId,
          scopeType: data.scopeType,
          scopeId: data.scopeId ?? null,
          status: PermissionStatus.ACTIVE,
        },
        include: {user: true, role: true},
      });

      // 2. Audit Log
      await this.audit.log({
        targetId: data.userId,
        resourceId: data.pluginId,
        action: 'GRANT_ACCESS',
        actorId: actor.userId,
        details: {scope: data.scopeType, scopeId: data.scopeId, role: permission.role.name},
      });

      // 3. Invalidate Cache
      await this.cache.invalidate(data.userId, plugin.name);

      // 4. Notify User
      await this.notification.notify(
        data.userId,
        'Acesso Concedido',
        `Um administrador concedeu a você acesso ao plugin ${plugin.name}.`,
      );

      // 5. Email (Optional)
      if (permission.user.email) {
        await this.email.sendEmail(permission.user.email, 'Novo Acesso Concedido', 'approval', {plugin: plugin.name});
      }

      return permission;
    });
  }
}
