import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RolloverClassSubjectDto {
  @ApiProperty({
    example: 'd3b07384-d113-4a1b-9e8c-8f4277b06821',
    description: 'Source Academic Year UUID to copy from',
  })
  @IsUUID()
  @IsNotEmpty()
  fromAcademicYearId: string;

  @ApiProperty({
    example: 'e4c08395-e224-4b2c-8f9d-9f5388c17932',
    description: 'Target Academic Year UUID to copy to',
  })
  @IsUUID()
  @IsNotEmpty()
  toAcademicYearId: string;
}
