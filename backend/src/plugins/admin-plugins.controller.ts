import {Body, Controller, Delete, Get, Param, Patch, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Role} from '@prisma/client';
import {Roles} from '../auth/decorators/roles.decorator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {PluginsService} from './plugins.service';

@ApiTags('Admin / Plugins')
@ApiBearerAuth()
@Controller('admin/plugins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PORTAL_ADMIN)
export class AdminPluginsController {
  constructor(private readonly pluginsService: PluginsService) { }

  @Get()
  @ApiOperation({summary: 'List all plugins (including inactive)'})
  async list() {
    return this.pluginsService.findAllAdmin();
  }

  @Post()
  @ApiOperation({summary: 'Create a new plugin'})
  async create(@Body() data: {name: string; description?: string; isPublic?: boolean;}) {
    return this.pluginsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({summary: 'Update a plugin'})
  async update(@Param('id') id: string, @Body() data: {name?: string; description?: string; isActive?: boolean; isPublic?: boolean;}) {
    return this.pluginsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({summary: 'Deactivate a plugin (Soft Delete)'})
  async remove(@Param('id') id: string) {
    return this.pluginsService.remove(id);
  }
}
