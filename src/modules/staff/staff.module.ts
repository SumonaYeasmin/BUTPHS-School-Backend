import { Module } from '@nestjs/common';
import { DepartmentModule } from './department/department.module';
import { StaffStructureModule } from './staff-structure/staff-structure.module';

@Module({
  imports: [DepartmentModule, StaffStructureModule],
  exports: [DepartmentModule, StaffStructureModule],
})
export class StaffModule {}
