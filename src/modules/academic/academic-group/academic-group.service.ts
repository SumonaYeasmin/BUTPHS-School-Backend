import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAcademicGroupDto } from './dto/create-academic-group.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { ConflictException } from '../../../common/exceptions/business.exception';

@Injectable()
export class AcademicGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicGroupDto) {
    const trimmedName = dto.name.trim();

    // 1. Check if an academic group with the same name already exists
    const existingGroup = await this.prisma.academicGroup.findUnique({
      where: { name: trimmedName },
    });

    if (existingGroup) {
      throw new ConflictException(
        `Academic group with name '${trimmedName}' already exists`,
      );
    }

    // 2. Create the academic group
    const group = await this.prisma.academicGroup.create({
      data: {
        name: trimmedName,
        description: dto.description?.trim() || null,
      },
    });

    return ResponseHelper.created(
      group,
      `Academic group '${group.name}' created successfully`,
    );
  }
}
