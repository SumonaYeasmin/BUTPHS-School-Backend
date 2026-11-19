import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ExamSubjectController } from './exam-subject.controller';
import { ExamSubjectService } from './exam-subject.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamSubjectController],
  providers: [ExamSubjectService],
  exports: [ExamSubjectService],
})
export class ExamSubjectModule {}
