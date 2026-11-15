import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSubjectDto {
  @ApiPropertyOptional({
    example: 'Higher Mathematics',
    description: 'Updated name of the subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: '126',
    description: 'Updated education board subject code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({
    example: 'Class 9-10',
    description: 'Updated target class or grade for this subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetClass?: string;

  @ApiPropertyOptional({
    example: 'Advanced math curriculum',
    description: 'Updated description of the subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
