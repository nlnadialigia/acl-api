import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {PermissionStatus, Role, ScopeType} from '@prisma/client';
import {PrismaService} from '../../prisma/prisma.service';
import {PLUGIN_ACCESS_KEY, PluginAccessOptions} from '../decorators/plugin-access.decorator';

@Injectable()
export class PluginAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<PluginAccessOptions>(
      PLUGIN_ACCESS_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const {user} = request;

    if (!user) {
      return false;
    }

    // Rule 1: Portal Admin has full access
    if (user.role === Role.PORTAL_ADMIN) {
      return true;
    }

    // Extract scopeId from request if applicable (param, query, or body)
    // For now, checking 'scopeId' in params as a default convention
    const requestedScopeId = request.params.scopeId || request.query.scopeId || request.body.scopeId;

    // Fetch user permissions for this plugin
    const permissions = await this.prisma.pluginPermission.findMany({
      where: {
        userId: user.userId,
        plugin: {name: options.pluginName},
        status: PermissionStatus.ACTIVE,
      },
      include: {
        plugin: true,
      }
    });

    if (permissions.length === 0) {
      throw new ForbiddenException(`No active permissions for plugin ${options.pluginName}`);
    }

    // Check for GLOBAL permission
    if (permissions.some(p => p.scopeType === ScopeType.GLOBAL)) {
      return true;
    }

    // If a specific scopeId was requested, validate hierarchy
    if (requestedScopeId) {
      for (const permission of permissions) {
        // Direct match (UNIT or FACTORY)
        if (permission.scopeId === requestedScopeId) {
          return true;
        }

        // Hierarchical logic: If permission is UNIT, check if requested scope is a FACTORY within that Unit
        if (permission.scopeType === ScopeType.UNIT && permission.scopeId) {
          const isFactoryInUnit = await this.prisma.factory.findFirst({
            where: {
              id: requestedScopeId,
              unitId: permission.scopeId,
            }
          });
          if (isFactoryInUnit) {
            return true;
          }
        }
      }
    } else {
      // No specific scope requested (e.g., listing plugin data), 
      // but user has at least one permission for this plugin. 
      // Requirement RF03/RF08 implies seeing the plugin is enough if they have any access?
      // For strictness, if they have ANY access they can hit a root plugin endpoint.
      return true;
    }

    throw new ForbiddenException(`Insufficient scope for plugin ${options.pluginName}`);
  }
}
