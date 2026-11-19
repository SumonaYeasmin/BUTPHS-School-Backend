import { Module } from '@nestjs/common';
import { GradingScaleController } from './grading-scale.controller';
import { GradingScaleService } from './grading-scale.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GradingScaleController],
  providers: [GradingScaleService],
  exports: [GradingScaleService],
})
export class GradingScaleModule {}
