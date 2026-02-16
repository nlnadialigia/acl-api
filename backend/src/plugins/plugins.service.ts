import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class PluginsService {
  constructor(private prisma: PrismaService) { }

  async findAllAdmin() {
    return this.prisma.plugin.findMany({
      orderBy: {name: 'asc'}
    });
  }

  async create(data: {name: string; description?: string; icon?: string; isActive?: boolean; isPublic?: boolean;}) {
    return this.prisma.$transaction(async (tx) => {
      const plugin = await tx.plugin.create({
        data,
      });

      if (data.isPublic) {
        await tx.pluginRole.create({
          data: {
            pluginId: plugin.id,
            name: "Public Access",
            description: "Default role for public access",
          }
        });
      }

      return plugin;
    });
  }

  async update(id: string, data: {name?: string; description?: string; icon?: string; isActive?: boolean; isPublic?: boolean;}) {
    const plugin = await this.prisma.plugin.update({
      where: {id},
      data,
    });

    if (data.isPublic) {
      const rolesCount = await this.prisma.pluginRole.count({
        where: {pluginId: id}
      });

      if (rolesCount === 0) {
        await this.prisma.pluginRole.create({
          data: {
            pluginId: id,
            name: "Public Access",
            description: "Default role for public access",
          }
        });
      }
    }

    return plugin;
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
      include: {
        userPluginFavorites: true
      }
    });
    if (!plugin) {
      throw new NotFoundException(`Plugin ${idOrName} not found`);
    }
    return plugin;
  }

  async findAll() {
    return this.prisma.plugin.findMany({
      where: {isActive: true},
      include: {
        userPluginFavorites: true
      },
      orderBy: {name: 'asc'}
    });
  }

  async toggleFavorite(userId: string, pluginId: string) {
    const existing = await this.prisma.userPluginFavorite.findUnique({
      where: {
        userId_pluginId: {userId, pluginId}
      }
    });

    if (existing) {
      await this.prisma.userPluginFavorite.delete({
        where: {id: existing.id}
      });
      return {isFavorite: false};
    } else {
      await this.prisma.userPluginFavorite.create({
        data: {userId, pluginId}
      });
      return {isFavorite: true};
    }
  }

  async listFavorites(userId: string) {
    const favorites = await this.prisma.userPluginFavorite.findMany({
      where: {userId},
      include: {plugin: true}
    });
    return favorites.map(f => f.plugin);
  }

  async findManagedByUser(userId: string) {
    const managers = await this.prisma.pluginManager.findMany({
      where: {userId},
      include: {
        plugin: {
          include: {
            userPluginFavorites: true
          }
        }
      },
    });
    return managers.map((m) => m.plugin);
  }

  // Helper to fetch unit/factory structure
  async getUnitStructure() {
    return this.prisma.unit.findMany({
      include: {factories: true},
    });
  }

  async listUserAccess(userId: string) {
    return this.prisma.accessRequest.findMany({
      where: {userId},
      include: {
        plugin: {
          include: {
            userPluginFavorites: true
          }
        },
        role: true
      },
      orderBy: {requestedAt: 'desc'},
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
    // Verificar se já existe role com as mesmas permissões
    const existingRoles = await this.prisma.pluginRole.findMany({
      where: {pluginId: data.pluginId},
      include: {definitions: true},
    });

    const sortedNewDefs = [...data.definitionIds].sort();
    
    for (const role of existingRoles) {
      const sortedExistingDefs = role.definitions.map(d => d.id).sort();
      if (JSON.stringify(sortedExistingDefs) === JSON.stringify(sortedNewDefs)) {
        const permissionNames = role.definitions.map(d => d.label).join(', ');
        throw new BadRequestException(`Já existe uma role com essas permissões: ${permissionNames}`);
      }
    }

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

  async deleteRole(id: string) {
    // Check if role is in use
    const inUse = await this.prisma.pluginPermission.count({where: {roleId: id}});
    const requestsInUse = await this.prisma.accessRequest.count({where: {roleId: id}});

    if (inUse > 0 || requestsInUse > 0) {
      throw new Error('Cannot delete role that is currently in use by users or has pending requests');
    }

    return this.prisma.pluginRole.delete({
      where: {id},
    });
  }

  async deletePermissionDefinition(id: string) {
    // Implicit many-to-many relations are handled by Prisma (disconnects automatically)
    // but we can't delete if it's the "last" definition required by a role? 
    // Usually it's fine to delete the definition and it just vanishes from roles.

    return this.prisma.pluginPermissionDefinition.delete({
      where: {id},
    });
  }
}
