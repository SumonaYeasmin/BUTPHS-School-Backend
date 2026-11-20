import { Module } from '@nestjs/common';
import { StaffMemberController } from './staff-member.controller';
import { StaffMemberService } from './staff-member.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffMemberController],
  providers: [StaffMemberService],
  exports: [StaffMemberService],
})
export class StaffMemberModule {}
