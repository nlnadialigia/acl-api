import {Controller, Get, Param, UseGuards} from '@nestjs/common';
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
  @PluginAccess('Inventory') // Generic check
  @ApiOperation({summary: 'List all active plugins (Requires Inventory access)'})
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

  @Get('structure')
  @PluginAccess('Inventory')
  @ApiOperation({summary: 'Get unit/factory structure'})
  async getStructure() {
    return this.pluginsService.getUnitStructure();
  }
}
