import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { RelationshipType } from '../../../../../prisma/generated/client';

export class UpdateStudentParentDto {
  @ApiPropertyOptional({
    enum: RelationshipType,
    description: 'Updated relationship to the student (FATHER, MOTHER, GUARDIAN)',
    example: RelationshipType.FATHER,
  })
  @IsEnum(RelationshipType, {
    message: 'relationship must be FATHER, MOTHER, or GUARDIAN',
  })
  @IsOptional()
  relationship?: RelationshipType;

  @ApiPropertyOptional({
    description:
      'Set to true to make this parent the primary emergency contact & communication recipient',
    example: true,
  })
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  @IsOptional()
  isPrimary?: boolean;
}
