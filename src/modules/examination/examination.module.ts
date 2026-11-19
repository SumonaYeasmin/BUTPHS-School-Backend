import { Module } from '@nestjs/common';
import { GradingScaleModule } from './grading-scale/grading-scale.module';
import { ExamModule } from './exam/exam.module';

@Module({
  imports: [GradingScaleModule, ExamModule],
  exports: [GradingScaleModule, ExamModule],
})
export class ExaminationModule {}
