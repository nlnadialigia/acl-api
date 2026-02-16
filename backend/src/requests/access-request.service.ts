import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {AccessRequest, PermissionStatus, RequestStatus, Role, ScopeType} from '@prisma/client';
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

  async createRequest(
    userId: string,
    pluginId: string,
    scopeType: ScopeType,
    scopeIds: string[],
    roleId?: string,
    userJustification?: string
  ) {
    // Check if plugin exists
    const plugin = await this.prisma.plugin.findUnique({
      where: {id: pluginId},
      include: {roleDefinitions: {take: 1, orderBy: {name: 'asc'}}},
    });
    if (!plugin) throw new NotFoundException('Plugin not found');

    let effectiveRoleId = roleId;

    // If roleId is missing, check if it's public and pick a default
    if (!effectiveRoleId) {
      if (!plugin.isPublic) {
        throw new BadRequestException('Role must be specified for private plugins');
      }

      const defaultRole = plugin.roleDefinitions[0];
      if (!defaultRole) {
        throw new BadRequestException('This plugin has no roles defined. Contact administrator.');
      }
      effectiveRoleId = defaultRole.id;
    }

    // Default to a single empty string for GLOBAL if no scopeIds provided
    const idsToProcess = scopeType === 'GLOBAL' ? [null] : scopeIds;
    if (idsToProcess.length === 0) {
      throw new BadRequestException('At least one scope must be selected');
    }

    const createdRequests: AccessRequest[] = [];

    for (const scopeId of idsToProcess) {
      // Check for existing pending request for this specific scope/role combination
      const existing = await this.prisma.accessRequest.findFirst({
        where: {userId, pluginId, scopeType, scopeId: scopeId ?? null, status: RequestStatus.PENDING},
      });
      if (existing) continue; // Skip if already pending

      if (plugin.isPublic) {
        const request = await this.prisma.$transaction(async (tx) => {
          // 1. Create Request (Already Approved)
          const req = await tx.accessRequest.create({
            data: {
              userId,
              pluginId,
              roleId: effectiveRoleId!,
              scopeType,
              scopeId: scopeId ?? null,
              status: RequestStatus.APPROVED,
              resolvedAt: new Date(),
              userJustification,
            },
            include: {user: true, role: true},
          });

          // 2. Create Permission only if not exists
          const existingPermission = await tx.pluginPermission.findFirst({
            where: {
              userId,
              pluginId,
              scopeType,
              scopeId: scopeId ?? null,
            },
          });

          if (!existingPermission) {
            await tx.pluginPermission.create({
              data: {
                userId,
                pluginId,
                roleId: effectiveRoleId!,
                scopeType,
                scopeId: scopeId ?? null,
                status: PermissionStatus.ACTIVE,
              },
            });
          }

          // 3. Audit Log
          await this.audit.log({
            targetId: userId,
            resourceId: pluginId,
            action: 'AUTO_APPROVE',
            actorId: userId,
            details: {requestId: req.id, scope: scopeType, scopeId, role: req.role.name},
          });

          return req;
        });

        createdRequests.push(request);
      } else {
        const request = await this.prisma.accessRequest.create({
          data: {
            userId,
            pluginId,
            roleId: effectiveRoleId!,
            scopeType,
            scopeId: scopeId ?? null,
            status: RequestStatus.PENDING,
            userJustification,
          },
          include: {user: true, plugin: true},
        });
        createdRequests.push(request);

        // Notify admins
        const admins = await this.prisma.user.findMany({
          where: {role: Role.PORTAL_ADMIN},
        });
        for (const admin of admins) {
          await this.notification.notify(
            admin.id,
            'Nova Solicitação',
            `${request.user.email} solicitou acesso ao plugin ${request.plugin.name}`,
          );
        }

        // Notify managers of this plugin
        const managers = await this.prisma.pluginManager.findMany({
          where: {pluginId},
          include: {user: true},
        });
        for (const manager of managers) {
          await this.notification.notify(
            manager.userId,
            'Nova Solicitação',
            `${request.user.email} solicitou acesso ao plugin ${request.plugin.name}`,
          );
          if (manager.user.email) {
            await this.email.sendEmail(
              manager.user.email,
              'Nova Solicitação de Acesso',
              'new-request',
              {plugin: request.plugin.name, user: request.user.email}
            );
          }
        }
      }
    }

    if (plugin.isPublic && createdRequests.length > 0) {
      await this.cache.invalidate(userId, plugin.name);
    }

    return createdRequests;
  }

  async listRequests(actor: {userId: string, role: Role;}) {
    if (actor.role === Role.PORTAL_ADMIN) {
      return this.prisma.accessRequest.findMany({
        where: {status: RequestStatus.PENDING},
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
      where: {
        pluginId: {in: pluginIds},
        status: RequestStatus.PENDING
      },
      include: {user: true, plugin: true, role: true},
      orderBy: {requestedAt: 'desc'},
    });
  }

  async listUserAccess(userId: string) {
    return this.prisma.accessRequest.findMany({
      where: {userId},
      include: {plugin: true, role: true},
      orderBy: {requestedAt: 'desc'},
    });
  }

  async approveRequest(requestId: string, actorId: string, managerJustification?: string) {
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
        data: {
          status: RequestStatus.APPROVED,
          resolvedById: actorId,
          resolvedAt: new Date(),
          managerJustification
        },
        include: {role: true},
      });

      // 2. Create Permission only if not exists
      const existingPermission = await tx.pluginPermission.findFirst({
        where: {
          userId: request.userId,
          pluginId: request.pluginId,
          scopeType: request.scopeType,
          scopeId: request.scopeId ?? null,
        },
      });

      if (!existingPermission) {
        await tx.pluginPermission.create({
          data: {
            userId: request.userId,
            pluginId: request.pluginId,
            roleId: request.roleId,
            scopeType: request.scopeType,
            scopeId: request.scopeId ?? null,
            status: PermissionStatus.ACTIVE,
          },
        });
      }

      // 3. Audit Log
      await this.audit.log({
        targetId: request.userId,
        resourceId: request.pluginId,
        action: 'APPROVE_ACCESS',
        actorId: actorId,
        details: {
          requestId,
          scope: request.scopeType,
          scopeId: request.scopeId,
          role: updatedRequest.role.name,
          managerJustification
        },
      });

      // 4. Invalidate Cache
      await this.cache.invalidate(request.userId, request.plugin.name);

      // 5. Notify User
      const approvalMsg = managerJustification
        ? `Sua solicitação para o plugin ${request.plugin.name} foi aprovada. Obs: ${managerJustification}`
        : `Sua solicitação para o plugin ${request.plugin.name} foi aprovada.`;

      await this.notification.notify(
        request.userId,
        'Acesso Aprovado',
        approvalMsg,
      );

      // 6. Email (Async)
      await this.email.sendEmail(request.user.email, 'Acesso Aprovado', 'approval', {plugin: request.plugin.name});

      return updatedRequest;
    });
  }

  async rejectRequest(requestId: string, actorId: string, managerJustification: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: {id: requestId},
      include: {plugin: true, user: true},
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request is not pending');
    if (!managerJustification) throw new BadRequestException('A reason/justification must be provided to reject a request');

    const updatedRequest = await this.prisma.accessRequest.update({
      where: {id: requestId},
      data: {
        status: RequestStatus.REJECTED,
        resolvedById: actorId,
        resolvedAt: new Date(),
        managerJustification
      },
    });

    // Notify User
    await this.notification.notify(
      request.userId,
      'Acesso Negado',
      `Sua solicitação para o plugin ${request.plugin.name} foi recusada. Motivo: ${managerJustification}`,
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
      // 1. Create Permission only if not exists
      let permission = await tx.pluginPermission.findFirst({
        where: {
          userId: data.userId,
          pluginId: data.pluginId,
          scopeType: data.scopeType,
          scopeId: data.scopeId ?? null,
        },
        include: {user: true, role: true},
      });

      if (!permission) {
        permission = await tx.pluginPermission.create({
          data: {
            userId: data.userId,
            pluginId: data.pluginId,
            roleId: data.roleId,
            scopeType: data.scopeType,
            scopeId: data.scopeId ?? null,
            status: PermissionStatus.ACTIVE,
          },
          include: {user: true, role: true},
        });
      }

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
