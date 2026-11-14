import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateAcademicGroupDto } from './dto/create-academic-group.dto';
import { UpdateAcademicGroupDto } from './dto/update-academic-group.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

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

  async findAll() {
    const groups = await this.prisma.academicGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      groups,
      'Academic groups retrieved successfully',
    );
  }

  async findOne(id: string) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Academic group');
    }

    return ResponseHelper.success(
      group,
      'Academic group details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateAcademicGroupDto) {
    const existing = await this.prisma.academicGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic group');
    }

    const data: Prisma.AcademicGroupUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Academic group name cannot be empty');
      }

      if (trimmedName !== existing.name) {
        const duplicate = await this.prisma.academicGroup.findUnique({
          where: { name: trimmedName },
        });

        if (duplicate) {
          throw new ConflictException(
            `Academic group with name '${trimmedName}' already exists`,
          );
        }

        data.name = trimmedName;
      }
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    const updated = await this.prisma.academicGroup.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      updated,
      'Academic group updated successfully',
    );
  }

  async remove(id: string) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Academic group');
    }

    const issues: string[] = [];
    if (group._count.enrollments > 0) {
      issues.push(`${group._count.enrollments} enrolled student(s)`);
    }
    if (group._count.classSubjects > 0) {
      issues.push(`${group._count.classSubjects} assigned subject(s)`);
    }

    if (issues.length > 0) {
      throw new BadRequestException(
        `Cannot delete academic group with active relations: ${issues.join(', ')}`,
      );
    }

    await this.prisma.academicGroup.delete({
      where: { id },
    });

    return ResponseHelper.success(null, 'Academic group deleted successfully');
  }
}
