import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ExamRoutineModule } from '../exam-routine/exam-routine.module';

@Module({
  imports: [PrismaModule, ExamRoutineModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
