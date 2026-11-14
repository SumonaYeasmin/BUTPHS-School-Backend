import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAcademicGroupDto {
  @ApiPropertyOptional({
    example: 'Business Studies',
    description: 'Updated name of the academic group',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description for business studies group',
    description: 'Updated description of the academic group',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

