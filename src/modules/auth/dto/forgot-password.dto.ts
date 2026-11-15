import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Registered email address or phone number',
  })
  @IsString()
  @IsNotEmpty()
  email: string;
}

