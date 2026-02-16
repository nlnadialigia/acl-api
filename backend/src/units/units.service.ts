import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.unit.findMany({
      include: {factories: true},
      orderBy: {name: 'asc'}
    });
  }

  async create(data: {name: string; factories?: {name: string;}[];}) {
    return this.prisma.unit.create({
      data: {
        name: data.name,
        factories: data.factories ? {
          create: data.factories
        } : undefined
      },
      include: {factories: true}
    });
  }

  async update(id: string, data: {name?: string; factories?: {name: string;}[];}) {
    // Delete existing factories and recreate
    await this.prisma.factory.deleteMany({
      where: {unitId: id}
    });

    return this.prisma.unit.update({
      where: {id},
      data: {
        name: data.name,
        factories: data.factories ? {
          create: data.factories
        } : undefined
      },
      include: {factories: true}
    });
  }

  async remove(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: {id},
      include: {factories: true}
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    
    // Coletar IDs de todas as fábricas
    const factoryIds = unit.factories.map(f => f.id);
    
    // Excluir permissões relacionadas à unidade e suas fábricas
    await this.prisma.pluginPermission.deleteMany({
      where: {
        OR: [
          {scopeId: id},
          {scopeId: {in: factoryIds}}
        ]
      }
    });
    
    // Excluir access requests relacionados
    await this.prisma.accessRequest.deleteMany({
      where: {
        OR: [
          {scopeId: id},
          {scopeId: {in: factoryIds}}
        ]
      }
    });
    
    // Excluir fábricas
    await this.prisma.factory.deleteMany({
      where: {unitId: id}
    });
    
    // Excluir unidade
    return this.prisma.unit.delete({where: {id}});
  }
}
