import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassModule } from './class/class.module';

@Module({
  imports: [AcademicYearModule, ClassModule],
  exports: [AcademicYearModule, ClassModule],
})
export class AcademicModule {}
