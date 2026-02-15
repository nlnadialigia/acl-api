import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class PluginsService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.plugin.findMany({
      where: {isActive: true},
    });
  }

  async findOne(name: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: {name},
    });
    if (!plugin) {
      throw new NotFoundException(`Plugin ${name} not found`);
    }
    return plugin;
  }

  // Helper to fetch unit/factory details for testing
  async getUnitStructure() {
    return this.prisma.unit.findMany({
      include: {factories: true},
    });
  }
}
