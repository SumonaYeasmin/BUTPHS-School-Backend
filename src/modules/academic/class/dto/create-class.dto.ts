import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    example: 'Class 6',
    description: 'Name of the class (e.g., Class 6, Class 7)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 6,
    description:
      'Numeric value for sorting and promotions (e.g., 6, 7, 8, 9, 10)',
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  numericValue: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the class is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['A', 'B'],
    description: 'Optional initial sections to create under this class',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sections?: string[];
}

