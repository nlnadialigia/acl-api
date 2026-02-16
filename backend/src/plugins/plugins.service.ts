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

  async create(data: {name: string; description?: string; icon?: string; isActive?: boolean; isPublic?: boolean;}) {
    return this.prisma.plugin.create({
      data,
    });
  }

  async update(id: string, data: {name?: string; description?: string; icon?: string; isActive?: boolean; isPublic?: boolean;}) {
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

  async findManagedByUser(userId: string) {
    const managers = await this.prisma.pluginManager.findMany({
      where: {userId},
      include: {plugin: true},
    });
    return managers.map((m) => m.plugin);
  }

  // Helper to fetch unit/factory details for testing
  async getUnitStructure() {
    return this.prisma.unit.findMany({
      include: {factories: true},
    });
  }

  // --- Granular Permissions & Roles ---

  async createPermissionDefinition(data: {pluginId?: string, name: string, label: string;}) {
    return this.prisma.pluginPermissionDefinition.create({
      data,
    });
  }

  async listPermissionDefinitions(pluginId?: string) {
    return this.prisma.pluginPermissionDefinition.findMany({
      where: {
        OR: [
          {pluginId: null},
          {pluginId: pluginId},
        ],
      },
    });
  }

  async createRole(data: {pluginId: string, name: string, description?: string, definitionIds: string[];}) {
    return this.prisma.pluginRole.create({
      data: {
        pluginId: data.pluginId,
        name: data.name,
        description: data.description,
        definitions: {
          connect: data.definitionIds.map(id => ({id})),
        },
      },
      include: {definitions: true},
    });
  }

  async listRoles(pluginId: string) {
    return this.prisma.pluginRole.findMany({
      where: {pluginId},
      include: {definitions: true},
    });
  }

  async getPluginWithAcl(id: string) {
    return this.prisma.plugin.findUnique({
      where: {id},
      include: {
        roleDefinitions: {
          include: {definitions: true},
        },
        availableDefinitions: true,
      },
    });
  }
}
