import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';
import { AcademicGroupModule } from './academic-group/academic-group.module';

@Module({
  imports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
  ],
  exports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
  ],
})
export class AcademicModule {}
