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

  async findAllAdmin() {
    return this.prisma.plugin.findMany();
  }

  async create(data: {name: string; description?: string; isActive?: boolean;}) {
    return this.prisma.plugin.create({
      data,
    });
  }

  async update(id: string, data: {name?: string; description?: string; isActive?: boolean;}) {
    return this.prisma.plugin.update({
      where: {id},
      data,
    });
  }

  async remove(id: string) {
    // Soft delete to maintain history
    return this.prisma.plugin.update({
      where: {id},
      data: {isActive: false},
    });
  }

  async findOne(idOrName: string) {
    const plugin = await this.prisma.plugin.findFirst({
      where: {
        OR: [
          {id: idOrName},
          {name: idOrName},
        ],
      },
    });
    if (!plugin) {
      throw new NotFoundException(`Plugin ${idOrName} not found`);
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
