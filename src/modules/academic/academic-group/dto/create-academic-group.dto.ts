import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAcademicGroupDto {
  @ApiProperty({
    example: 'Science',
    description:
      'Name of the academic group (e.g. Science, Humanities, Business Studies, বিজ্ঞান, মানবিক)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Science group for secondary levels',
    description: 'Optional description of the academic group',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
