import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: [
      'b188c0fa-d2cf-4b6e-8e50-25e24cf74f76',
      'c299d1fa-e3df-5c7f-9f61-36f35df85f87',
    ],
    description:
      'Array of Permission UUIDs to set for this role (replaces current assignments with this new list)',
    type: [String],
  })
  @IsArray({ message: 'permissionIds must be an array of UUIDs' })
  @IsUUID('4', { each: true, message: 'Each permissionId must be a valid UUID v4' })
  permissionIds: string[];
}
