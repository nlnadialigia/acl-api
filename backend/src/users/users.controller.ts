import {Body, Controller, Get, Param, Patch, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Role} from '@prisma/client';
import {Roles} from '../auth/decorators/roles.decorator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {UsersService} from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('register')
  @ApiOperation({summary: 'Register a new user'})
  @ApiBody({schema: {type: 'object', properties: {email: {type: 'string'}, name: {type: 'string'}}}})
  async register(@Body() data: {email: string; name: string;}) {
    return this.usersService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({summary: 'List all users'})
  async list() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({summary: 'Get user by ID'})
  async getProfile(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  @ApiBearerAuth()
  @Patch(':id/role')
  @ApiOperation({summary: 'Update user role (Admin only)'})
  async updateRole(@Param('id') id: string, @Body() data: {role: Role;}) {
    return this.usersService.updateRole(id, data.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  @ApiBearerAuth()
  @Post(':id/managed-plugins')
  @ApiOperation({summary: 'Add managed plugin to user (Admin only)'})
  async addManagedPlugin(@Param('id') id: string, @Body() data: {pluginId: string;}) {
    return this.usersService.addManagedPlugin(id, data.pluginId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  @ApiBearerAuth()
  @Get(':id/managed-plugins')
  @ApiOperation({summary: 'Get user managed plugins (Admin only)'})
  async getManagedPlugins(@Param('id') id: string) {
    return this.usersService.getManagedPlugins(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  @ApiBearerAuth()
  @Post(':id/managed-plugins/:pluginId/remove')
  @ApiOperation({summary: 'Remove managed plugin from user (Admin only)'})
  async removeManagedPlugin(@Param('id') id: string, @Param('pluginId') pluginId: string) {
    return this.usersService.removeManagedPlugin(id, pluginId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/permissions')
  @ApiOperation({summary: 'Get user permissions'})
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }
}
