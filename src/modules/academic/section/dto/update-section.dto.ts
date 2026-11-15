import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSectionDto {
  @ApiPropertyOptional({
    example: 'Padma',
    description: 'Updated name of the section (e.g. A, B, Meghna, Padma)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}

