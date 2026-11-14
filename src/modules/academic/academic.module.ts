import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';

@Module({
  imports: [AcademicYearModule],
  exports: [AcademicYearModule],
})
export class AcademicModule {}

