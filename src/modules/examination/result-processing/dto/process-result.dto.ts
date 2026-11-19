import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ProcessResultDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Whether to force re-calculation even if results have already been processed previously.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  forceRecalculate?: boolean = true;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether to lock the exam and marks entry once results are processed to prevent further edits.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  lockExamOnProcess?: boolean = false;
}
