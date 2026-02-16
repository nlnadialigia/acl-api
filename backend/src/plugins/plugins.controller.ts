import {Controller, Get, Param, Post, Request, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {PluginAccess} from '../auth/decorators/plugin-access.decorator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PluginAccessGuard} from '../auth/guards/plugin-access.guard';
import {PluginsService} from './plugins.service';

@ApiTags('Plugins (ACL Test)')
@ApiBearerAuth()
@Controller('plugins')
@UseGuards(JwtAuthGuard, PluginAccessGuard)
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) { }

  @Get()
  @ApiOperation({summary: 'List all active plugins'})
  async list() {
    return this.pluginsService.findAll();
  }

  @Get('units/:scopeId')
  @PluginAccess('Inventory')
  @ApiOperation({summary: 'Check access to a specific Unit'})
  async checkUnit(@Param('scopeId') scopeId: string) {
    return {message: `You have access to Unit ${scopeId}`};
  }

  @Get('factories/:scopeId')
  @PluginAccess('Inventory')
  @ApiOperation({summary: 'Check access to a specific Factory'})
  async checkFactory(@Param('scopeId') scopeId: string) {
    return {message: `You have access to Factory ${scopeId}`};
  }

  @Get('my-permissions')
  @ApiOperation({summary: 'List current user permissions'})
  async getMyPermissions(@Request() req: any) {
    return this.pluginsService.listUserAccess(req.user.userId);
  }

  @Get('structure')
  @PluginAccess('Inventory')
  @ApiOperation({summary: 'Get unit/factory structure'})
  async getStructure() {
    return this.pluginsService.getUnitStructure();
  }

  @Post(':id/favorite')
  @ApiOperation({summary: 'Toggle favorite status for a plugin'})
  async toggleFavorite(@Param('id') id: string, @Request() req: any) {
    return this.pluginsService.toggleFavorite(req.user.userId, id);
  }

  @Get('favorites')
  @ApiOperation({summary: 'List user favorite plugins'})
  async listFavorites(@Request() req: any) {
    return this.pluginsService.listFavorites(req.user.userId);
  }
}
