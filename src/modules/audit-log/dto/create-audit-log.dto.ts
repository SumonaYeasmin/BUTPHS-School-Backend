import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({
    example: 'UPDATE_MARK',
    description: 'Specific action performed (e.g. USER_LOGIN, UPDATE_MARK, PUBLISH_RESULT)',
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    example: 'EXAMINATION',
    description:
      'Module or domain where the action took place (e.g. AUTH, EXAMINATION, ACADEMIC, STAFF)',
  })
  @IsNotEmpty()
  @IsString()
  module: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'UUID of the user who performed the action. If omitted, defaults to the authenticated user.',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description:
      'Client IP address. If omitted, automatically captured from the incoming HTTP request.',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    example:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    description:
      'Client User-Agent / device string. If omitted, automatically captured from request headers.',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
