import {Body, Controller, Get, Post, Request, UseGuards} from '@nestjs/common';
import {Role} from '@prisma/client';
import {AuthService} from './auth.service';
import {Roles} from './decorators/roles.decorator';
import {JwtAuthGuard} from './guards/jwt-auth.guard';
import {RolesGuard} from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: {email: string;}) {
    return this.authService.login(body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN)
  @Get('admin')
  getAdmin(@Request() req) {
    return {message: 'Welcome Admin!', user: req.user};
  }
}
