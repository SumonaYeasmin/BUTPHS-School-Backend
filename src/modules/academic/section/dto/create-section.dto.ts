import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the class this section belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    example: 'A',
    description: 'Name of the section (e.g., A, B, ক, খ, Padma, Meghna)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
