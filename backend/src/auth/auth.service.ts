import {Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Role} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async login(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {email},
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // Temporary helper for registration/seeding or testing
  async createTestUser(email: string, name: string, role: Role = Role.USER) {
    return this.prisma.user.upsert({
      where: {email},
      update: {name, role},
      create: {email, name, role},
    });
  }
}
