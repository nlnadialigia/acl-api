import {Body, Controller, Get, Post, Request, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Role} from '@prisma/client';
import {AuthService} from './auth.service';
import {Roles} from './decorators/roles.decorator';
import {JwtAuthGuard} from './guards/jwt-auth.guard';
import {RolesGuard} from './guards/roles.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @ApiOperation({summary: 'Login with email'})
  @ApiBody({schema: {type: 'object', properties: {email: {type: 'string'}}}})
  async login(@Body() body: {email: string;}) {
    return this.authService.login(body.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({summary: 'Get current user profile'})
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.PORTAL_ADMIN)
  @Get('admin')
  @ApiOperation({summary: 'Admin only endpoint'})
  getAdmin(@Request() req) {
    return {message: 'Welcome Admin!', user: req.user};
  }
}
