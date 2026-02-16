import {Body, Controller, Delete, Get, Param, Patch, Post, UseGuards} from '@nestjs/common';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {Roles} from '../auth/decorators/roles.decorator';
import {Role} from '@prisma/client';
import {UnitsService} from './units.service';

@Controller('admin/units')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PORTAL_ADMIN)
export class UnitsController {
  constructor(private unitsService: UnitsService) { }

  @Get()
  findAll() {
    return this.unitsService.findAll();
  }

  @Post()
  create(@Body() body: {name: string; factories?: {name: string;}[];}) {
    return this.unitsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: {name?: string; factories?: {name: string;}[];}) {
    return this.unitsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
