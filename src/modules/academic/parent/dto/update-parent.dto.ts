import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateParentDto {
  @ApiPropertyOptional({
    description: 'Full name of the parent/guardian',
    example: 'Md. Rafiqul Islam',
  })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the parent/guardian',
    example: '01711223344',
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address of the parent/guardian',
    example: 'rafiqul@example.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(150)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'National ID (NID) number of the parent',
    example: '19851234567890',
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  nid?: string;

  @ApiPropertyOptional({
    description: 'Occupation of the parent/guardian',
    example: 'Banker',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({
    description: 'Residential address of the parent/guardian',
    example: 'House 12, Road 4, Mirpur-10, Dhaka',
  })
  @IsString()
  @IsOptional()
  address?: string;
}
