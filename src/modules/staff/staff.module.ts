import { Module } from '@nestjs/common';
import { DepartmentModule } from './department/department.module';
import { StaffStructureModule } from './staff-structure/staff-structure.module';
import { StaffMemberModule } from './staff-member/staff-member.module';

@Module({
  imports: [DepartmentModule, StaffStructureModule, StaffMemberModule],
  exports: [DepartmentModule, StaffStructureModule, StaffMemberModule],
})
export class StaffModule {}
