import { Module } from '@nestjs/common';
import { ResultProcessingService } from './result-processing.service';
import { ResultProcessingController } from './result-processing.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResultProcessingController],
  providers: [ResultProcessingService],
  exports: [ResultProcessingService],
})
export class ResultProcessingModule {}
