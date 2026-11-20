import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateMarkDto {
  @ApiPropertyOptional({
    example: false,
    description:
      'Whether the student was absent in this examination. If true, all marks are set to 0.',
  })
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;

  @ApiPropertyOptional({
    example: 65.5,
    description: 'Updated marks obtained in the Written (Creative/CQ) test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  writtenMarks?: number;

  @ApiPropertyOptional({
    example: 25.0,
    description: 'Updated marks obtained in the MCQ test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mcqMarks?: number;

  @ApiPropertyOptional({
    example: 23.5,
    description: 'Updated marks obtained in the Practical (Lab) test component',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  practicalMarks?: number;

  @ApiPropertyOptional({
    example: 19.0,
    description: 'Updated marks obtained in Continuous Assessment (SBA)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  continuousAssessmentMarks?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Lock status of this mark entry. Only Admins can lock or unlock a mark entry.',
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
