import { Module } from '@nestjs/common';
import { ClassSubjectController } from './class-subject.controller';
import { ClassSubjectService } from './class-subject.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClassSubjectController],
  providers: [ClassSubjectService],
  exports: [ClassSubjectService],
})
export class ClassSubjectModule { }
