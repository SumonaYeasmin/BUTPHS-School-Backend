import { Module } from '@nestjs/common';
import { GradingScaleController } from './grading-scale.controller';
import { GradeRangeController } from './grade-range.controller';
import { GradingScaleService } from './grading-scale.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GradingScaleController, GradeRangeController],
  providers: [GradingScaleService],
  exports: [GradingScaleService],
})
export class GradingScaleModule {}
