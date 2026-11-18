import { Module } from '@nestjs/common';
import { TeacherAssignmentController } from './teacher-assignment.controller';
import { TeacherAssignmentService } from './teacher-assignment.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherAssignmentController],
  providers: [TeacherAssignmentService],
  exports: [TeacherAssignmentService],
})
export class TeacherAssignmentModule {}
