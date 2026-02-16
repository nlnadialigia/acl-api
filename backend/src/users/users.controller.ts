import {Body, Controller, Get, Param, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {UsersService} from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('register')
  @ApiOperation({summary: 'Register a new user'})
  @ApiBody({schema: {type: 'object', properties: {email: {type: 'string'}, name: {type: 'string'}}}})
  async register(@Body() data: {email: string; name: string;}) {
    return this.usersService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({summary: 'List all users'})
  async list() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({summary: 'Get user by ID'})
  async getProfile(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
