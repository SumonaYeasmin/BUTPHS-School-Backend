import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description:
      'Array of Role UUIDs to set for this user (replaces existing assignments with this new list)',
    type: [String],
  })
  @IsArray({ message: 'roleIds must be an array of UUIDs' })
  @IsUUID('4', { each: true, message: 'Each roleId must be a valid UUID v4' })
  roleIds: string[];
}
