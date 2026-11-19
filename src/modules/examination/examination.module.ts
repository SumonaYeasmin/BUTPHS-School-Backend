import { Module } from '@nestjs/common';
import { GradingScaleModule } from './grading-scale/grading-scale.module';
import { ExamModule } from './exam/exam.module';
import { ExamRoutineModule } from './exam-routine/exam-routine.module';

@Module({
  imports: [GradingScaleModule, ExamModule, ExamRoutineModule],
  exports: [GradingScaleModule, ExamModule, ExamRoutineModule],
})
export class ExaminationModule {}
