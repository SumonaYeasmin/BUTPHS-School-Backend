import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RelationshipType } from '../../../../../prisma/generated/client';

export class AssignParentDto {
  @ApiPropertyOptional({
    description:
      'Existing Parent UUID (provide if linking an existing parent from another sibling)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string;

  // --- New Parent Profile Fields (Used if parentId is not provided) ---
  @ApiPropertyOptional({
    description: 'Full name of the parent/guardian (required if parentId is omitted)',
    example: 'Md. Rafiqul Islam',
  })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the parent/guardian (required if parentId is omitted)',
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
    description: 'National ID (NID) number of the parent (optional)',
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
    description: 'Residential address',
    example: 'House 12, Road 4, Mirpur-10, Dhaka',
  })
  @IsString()
  @IsOptional()
  address?: string;

  // --- Relationship Mapping Fields ---
  @ApiProperty({
    enum: RelationshipType,
    description: 'Relationship to the student (FATHER, MOTHER, GUARDIAN)',
    example: RelationshipType.FATHER,
  })
  @IsEnum(RelationshipType, {
    message: 'relationship must be FATHER, MOTHER, or GUARDIAN',
  })
  @IsNotEmpty({ message: 'relationship is required' })
  relationship: RelationshipType;

  @ApiPropertyOptional({
    description:
      'Set to true if this person is the primary emergency contact & communication recipient',
    default: false,
    example: true,
  })
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  @IsOptional()
  isPrimary?: boolean;
}
