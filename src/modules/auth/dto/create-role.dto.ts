import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'TEACHER',
    description: 'Unique name of the role (e.g. TEACHER, ACCOUNTANT, LIBRARIAN)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'School teacher with mark entry and attendance rights',
    description: 'Detailed description of this role',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: ['11111111-1111-1111-1111-111111111111'],
    description: 'Array of Permission UUIDs to assign to this role initially',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
