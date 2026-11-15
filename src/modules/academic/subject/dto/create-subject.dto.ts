import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({
    example: 'Bangla',
    description:
      'Name of the subject (e.g., Bangla, English, Mathematics, Physics, বাংলা, গণিত)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: '101',
    description:
      'Education board subject code (unique if provided, e.g., 101, 107, 109)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({
    example: 'Class 6',
    description:
      'Target class or grade for this subject (e.g., Class 6, Class 7, Class 9-10)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetClass?: string;

  @ApiPropertyOptional({
    example: 'Compulsory first language subject',
    description: 'Optional description of the subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
