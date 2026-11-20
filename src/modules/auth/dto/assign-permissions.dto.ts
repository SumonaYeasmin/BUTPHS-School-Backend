import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({
    example: ['b188c0fa-d2cf-4b6e-8e50-25e24cf74f76', 'c299d1fa-e3df-5c7f-9f61-36f35df85f87'],
    description: 'Array of Permission UUIDs to assign to the role',
    type: [String],
  })
  @IsArray({ message: 'permissionIds must be an array of UUIDs' })
  @ArrayNotEmpty({ message: 'permissionIds array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each permissionId must be a valid UUID v4' })
  permissionIds: string[];
}
