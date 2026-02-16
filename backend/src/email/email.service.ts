import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService) { }

  async sendEmail(to: string, subject: string, template: string, context: any) {
    console.log(`[EmailService] Persisting email to ${to}`);

    return this.prisma.email.create({
      data: {
        to,
        subject,
        template,
        context,
      },
    });
  }
}
