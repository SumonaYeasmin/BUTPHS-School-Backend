import { Module } from '@nestjs/common';
import { GradingScaleModule } from './grading-scale/grading-scale.module';

@Module({
  imports: [GradingScaleModule],
  exports: [GradingScaleModule],
})
export class ExaminationModule {}
