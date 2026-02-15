import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {Role} from '@prisma/client';
import {ROLES_KEY} from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const {user} = context.switchToHttp().getRequest();

    // If user is PORTAL_ADMIN, allow everything (RF07 rule 1)
    if (user?.role === Role.PORTAL_ADMIN) {
      return true;
    }

    return requiredRoles.some((role) => user?.role === role);
  }
}
