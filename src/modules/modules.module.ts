import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicModule } from './academic/academic.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [AuthModule, AcademicModule, StaffModule],
})
export class ModulesModule {}
