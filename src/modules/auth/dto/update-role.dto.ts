import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'SENIOR_TEACHER',
    description: 'Updated unique role name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: 'Senior teachers and department heads',
    description: 'Updated description of the role',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
