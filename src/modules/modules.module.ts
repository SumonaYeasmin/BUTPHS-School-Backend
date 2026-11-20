import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicModule } from './academic/academic.module';
import { StaffModule } from './staff/staff.module';
import { ExaminationModule } from './examination/examination.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    AuthModule,
    AcademicModule,
    StaffModule,
    ExaminationModule,
    AuditLogModule,
  ],
  exports: [AuditLogModule],
})
export class ModulesModule {}
