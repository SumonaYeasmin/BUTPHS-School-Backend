import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateClassSubjectDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Update whether the subject is optional or mandatory',
  })
  @IsOptional()
  @IsBoolean({ message: 'isOptional must be a boolean' })
  isOptional?: boolean;

  @ApiPropertyOptional({
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    description:
      'Update academic group UUID, or pass null to make it common across all groups',
    nullable: true,
  })
  @IsOptional()
  groupId?: string | null;

  @ApiPropertyOptional({
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    description: 'Update to a different subject UUID from master catalog',
  })
  @IsOptional()
  @IsUUID('4', { message: 'subjectId must be a valid UUID' })
  subjectId?: string;
}
