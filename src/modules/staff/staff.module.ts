import { Module } from '@nestjs/common';
import { DepartmentModule } from './department/department.module';

@Module({
  imports: [DepartmentModule],
  exports: [DepartmentModule],
})
export class StaffModule {}
