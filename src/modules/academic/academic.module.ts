import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';
import { AcademicGroupModule } from './academic-group/academic-group.module';
import { StudentModule } from './student/student.module';
import { SubjectModule } from './subject/subject.module';

@Module({
  imports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
    StudentModule,
    SubjectModule,
  ],
  exports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
    StudentModule,
    SubjectModule,
  ],
})
export class AcademicModule {}
