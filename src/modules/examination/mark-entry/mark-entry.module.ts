import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MarkEntryController } from './mark-entry.controller';
import { MarkEntryService } from './mark-entry.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarkEntryController],
  providers: [MarkEntryService],
  exports: [MarkEntryService],
})
export class MarkEntryModule {}
