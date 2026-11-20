import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of Role UUIDs to assign to the user',
    type: [String],
  })
  @IsArray({ message: 'roleIds must be an array of UUIDs' })
  @ArrayNotEmpty({ message: 'roleIds array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each roleId must be a valid UUID v4' })
  roleIds: string[];
}
