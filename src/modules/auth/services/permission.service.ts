import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new unique permission
   */
  async create(dto: CreatePermissionDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(
        `Permission with name '${name}' already exists.`,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        name,
        description: dto.description?.trim(),
      },
    });

    return ResponseHelper.success(
      permission,
      `Permission '${permission.name}' created successfully`,
    );
  }
}
