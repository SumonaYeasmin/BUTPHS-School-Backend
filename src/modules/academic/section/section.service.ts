import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { QuerySectionDto } from './dto/query-section.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionDto) {
    const trimmedName = dto.name.trim();

    // 1. Verify class exists
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });

    if (!schoolClass) {
      throw new NotFoundException('Class');
    }

    // 2. Check duplicate section name within this specific class
    const existingSection = await this.prisma.section.findUnique({
      where: {
        classId_name: {
          classId: dto.classId,
          name: trimmedName,
        },
      },
    });

    if (existingSection) {
      throw new ConflictException(
        `Section '${trimmedName}' already exists in class '${schoolClass.name}'`,
      );
    }

    // 3. Create the section
    const section = await this.prisma.section.create({
      data: {
        classId: dto.classId,
        name: trimmedName,
      },
      include: {
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
      },
    });

    return ResponseHelper.created(
      section,
      `Section '${section.name}' created successfully in ${schoolClass.name}`,
    );
  }

  async findAll(query?: QuerySectionDto) {
    const where: Prisma.SectionWhereInput = {};

    if (query?.classId) {
      where.classId = query.classId;
    }

    const sections = await this.prisma.section.findMany({
      where,
      orderBy: [{ schoolClass: { numericValue: 'asc' } }, { name: 'asc' }],
      include: {
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            teacherAssignments: true,
            classRoutines: true,
          },
        },
      },
    });

    return ResponseHelper.success(sections, 'Sections retrieved successfully');
  }

  async findOne(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            teacherAssignments: true,
            classRoutines: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section');
    }

    return ResponseHelper.success(
      section,
      'Section details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.section.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Section');
    }

    const data: Prisma.SectionUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Section name cannot be empty');
      }

      if (trimmedName !== existing.name) {
        const duplicate = await this.prisma.section.findUnique({
          where: {
            classId_name: {
              classId: existing.classId,
              name: trimmedName,
            },
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `Section '${trimmedName}' already exists in this class`,
          );
        }

        data.name = trimmedName;
      }
    }

    const updated = await this.prisma.section.update({
      where: { id },
      data,
      include: {
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
      },
    });

    return ResponseHelper.success(updated, 'Section updated successfully');
  }

  async remove(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            teacherAssignments: true,
            classRoutines: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section');
    }

    const issues: string[] = [];
    if (section._count.enrollments > 0) {
      issues.push(`${section._count.enrollments} enrolled student(s)`);
    }
    if (section._count.teacherAssignments > 0) {
      issues.push(`${section._count.teacherAssignments} teacher assignment(s)`);
    }
    if (section._count.classRoutines > 0) {
      issues.push(`${section._count.classRoutines} class routine period(s)`);
    }

    if (issues.length > 0) {
      throw new BadRequestException(
        `Cannot delete section with active relations: ${issues.join(', ')}`,
      );
    }

    await this.prisma.section.delete({
      where: { id },
    });

    return ResponseHelper.success(null, 'Section deleted successfully');
  }
}
