import { PartialType } from '@nestjs/swagger';
import { CreateStaffStructureDto } from './create-staff-structure.dto';

export class UpdateStaffStructureDto extends PartialType(CreateStaffStructureDto) {}
