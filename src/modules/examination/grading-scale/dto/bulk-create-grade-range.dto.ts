import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateGradeRangeDto } from './create-grade-range.dto';

export class BulkCreateGradeRangeDto {
  @ApiProperty({
    type: [CreateGradeRangeDto],
    description: 'Array of grade ranges to configure for the scale',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeRangeDto)
  ranges: CreateGradeRangeDto[];
}
