import {Body, Controller, Get, Param, Post, Request, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Role, ScopeType} from '@prisma/client';
import {Roles} from '../auth/decorators/roles.decorator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {AccessRequestService} from './access-request.service';

@ApiTags('Access Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class AccessRequestController {
  constructor(private readonly requestService: AccessRequestService) { }

  @Post()
  @ApiOperation({summary: 'Request access to a plugin'})
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pluginId: {type: 'string'},
        scopeType: {enum: ['GLOBAL', 'UNIT', 'FACTORY']},
        scopeId: {type: 'string', nullable: true},
      },
      required: ['pluginId', 'scopeType'],
    },
  })
  async create(@Request() req, @Body() body: {pluginId: string; scopeType: ScopeType; scopeId?: string;}) {
    return this.requestService.createRequest(req.user.userId, body.pluginId, body.scopeType, body.scopeId);
  }

  @Get()
  @ApiOperation({summary: 'List access requests (Managers see their plugins, Admins see all)'})
  async list(@Request() req) {
    return this.requestService.listRequests(req.user);
  }

  @Post(':id/approve')
  @Roles(Role.PORTAL_ADMIN, Role.PLUGIN_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({summary: 'Approve an access request'})
  async approve(@Request() req, @Param('id') id: string) {
    return this.requestService.approveRequest(id, req.user.userId);
  }

  @Post(':id/reject')
  @Roles(Role.PORTAL_ADMIN, Role.PLUGIN_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({summary: 'Reject an access request'})
  async reject(@Request() req, @Param('id') id: string, @Body() body: {reason?: string;}) {
    return this.requestService.rejectRequest(id, req.user.userId, body.reason);
  }

  @Post('revoke')
  @Roles(Role.PORTAL_ADMIN, Role.PLUGIN_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({summary: 'Revoke a user permission'})
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {type: 'string'},
        pluginId: {type: 'string'},
      },
      required: ['userId', 'pluginId'],
    },
  })
  async revoke(@Request() req, @Body() body: {userId: string; pluginId: string;}) {
    return this.requestService.revokePermission(body.userId, body.pluginId, req.user.userId);
  }
}
