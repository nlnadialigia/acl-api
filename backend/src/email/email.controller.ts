import {Controller, Get, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Role} from '@prisma/client';
import {Roles} from '../auth/decorators/roles.decorator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {EmailService} from './email.service';

@ApiTags('Email')
@Controller('emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PORTAL_ADMIN)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

  @Get()
  @ApiOperation({summary: 'List all emails (Admin only)'})
  async listEmails() {
    return this.emailService.findAll();
  }
}
