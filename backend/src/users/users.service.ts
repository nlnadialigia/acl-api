import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {Prisma, Role} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(data: Prisma.UserCreateInput) {
    const existing = await this.prisma.user.findUnique({
      where: {email: data.email},
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    return this.prisma.user.create({
      data,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {email},
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {id},
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {createdAt: 'desc'},
    });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({where: {id}});
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: {id},
      data: {role},
    });
  }

  async addManagedPlugin(userId: string, pluginId: string) {
    const user = await this.prisma.user.findUnique({where: {id: userId}});
    if (!user) throw new NotFoundException('User not found');

    const plugin = await this.prisma.plugin.findUnique({where: {id: pluginId}});
    if (!plugin) throw new NotFoundException('Plugin not found');

    const existing = await this.prisma.pluginManager.findUnique({
      where: {userId_pluginId: {userId, pluginId}},
    });

    if (existing) {
      throw new ConflictException('User already manages this plugin');
    }

    return this.prisma.pluginManager.create({
      data: {userId, pluginId},
      include: {plugin: true},
    });
  }

  async getManagedPlugins(userId: string) {
    return this.prisma.pluginManager.findMany({
      where: {userId},
      include: {plugin: true},
    });
  }

  async removeManagedPlugin(userId: string, pluginId: string) {
    const manager = await this.prisma.pluginManager.findUnique({
      where: {userId_pluginId: {userId, pluginId}},
    });

    if (!manager) throw new NotFoundException('Manager assignment not found');

    return this.prisma.pluginManager.delete({
      where: {userId_pluginId: {userId, pluginId}},
    });
  }

  async getUserPermissions(id: string) {
    const user = await this.prisma.user.findUnique({where: {id}});
    if (!user) throw new NotFoundException('User not found');

    const permissions = await this.prisma.pluginPermission.findMany({
      where: {userId: id, status: 'ACTIVE'},
      include: {
        plugin: true,
        role: {
          include: {
            definitions: true,
          },
        },
      },
    });

    return {
      user,
      permissions,
    };
  }
}
