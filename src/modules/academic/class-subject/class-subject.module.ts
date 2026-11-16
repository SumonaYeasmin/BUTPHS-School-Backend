import { Module } from '@nestjs/common';
import { ClassSubjectController } from './class-subject.controller';
import { ClassSubjectService } from './class-subject.service';

@Module({
  controllers: [ClassSubjectController],
  providers: [ClassSubjectService],
  exports: [ClassSubjectService],
})
export class ClassSubjectModule {}
