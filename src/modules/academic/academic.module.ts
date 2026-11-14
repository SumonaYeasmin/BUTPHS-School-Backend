import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';

@Module({
  imports: [AcademicYearModule, ClassModule, SectionModule],
  exports: [AcademicYearModule, ClassModule, SectionModule],
})
export class AcademicModule {}
