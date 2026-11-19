import { Module } from '@nestjs/common';
import { GradingScaleModule } from './grading-scale/grading-scale.module';
import { ExamModule } from './exam/exam.module';
import { ExamRoutineModule } from './exam-routine/exam-routine.module';
import { ExamSubjectModule } from './exam-subject/exam-subject.module';
import { MarkEntryModule } from './mark-entry/mark-entry.module';
import { ResultProcessingModule } from './result-processing/result-processing.module';

@Module({
  imports: [
    GradingScaleModule,
    ExamModule,
    ExamRoutineModule,
    ExamSubjectModule,
    MarkEntryModule,
    ResultProcessingModule,
  ],
  exports: [
    GradingScaleModule,
    ExamModule,
    ExamRoutineModule,
    ExamSubjectModule,
    MarkEntryModule,
    ResultProcessingModule,
  ],
})
export class ExaminationModule {}
