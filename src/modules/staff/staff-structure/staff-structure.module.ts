import { Module } from '@nestjs/common';
import { StaffStructureController } from './staff-structure.controller';
import { StaffStructureService } from './staff-structure.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffStructureController],
  providers: [StaffStructureService],
  exports: [StaffStructureService],
})
export class StaffStructureModule {}
