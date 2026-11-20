import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'TEACHER',
    description: 'Unique role name (e.g. TEACHER, ACCOUNTANT, LIBRARIAN)',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'Subject and class teachers in the institution',
    description: 'Description of the role responsibilities',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
