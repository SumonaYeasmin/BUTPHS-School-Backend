import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicModule } from './academic/academic.module';

@Module({
  imports: [AuthModule, AcademicModule],
})
export class ModulesModule {}
