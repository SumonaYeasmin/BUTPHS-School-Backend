import { Module } from '@nestjs/common';
import { AcademicGroupController } from './academic-group.controller';
import { AcademicGroupService } from './academic-group.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicGroupController],
  providers: [AcademicGroupService],
  exports: [AcademicGroupService],
})
export class AcademicGroupModule {}
