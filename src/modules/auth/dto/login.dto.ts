import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address or phone number',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'adminpassword' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
