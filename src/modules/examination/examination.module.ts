import { Module } from '@nestjs/common';
import { GradingScaleModule } from './grading-scale/grading-scale.module';
import { ExamModule } from './exam/exam.module';
import { ExamRoutineModule } from './exam-routine/exam-routine.module';
import { ExamSubjectModule } from './exam-subject/exam-subject.module';

@Module({
  imports: [
    GradingScaleModule,
    ExamModule,
    ExamRoutineModule,
    ExamSubjectModule,
  ],
  exports: [
    GradingScaleModule,
    ExamModule,
    ExamRoutineModule,
    ExamSubjectModule,
  ],
})
export class ExaminationModule {}
