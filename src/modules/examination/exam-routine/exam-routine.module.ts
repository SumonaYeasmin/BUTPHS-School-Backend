import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ExamRoutineController } from './exam-routine.controller';
import { ExamRoutineService } from './exam-routine.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamRoutineController],
  providers: [ExamRoutineService],
  exports: [ExamRoutineService],
})
export class ExamRoutineModule {}
