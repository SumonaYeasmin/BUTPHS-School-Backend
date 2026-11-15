import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code?.trim() || null;
    const trimmedTargetClass = dto.targetClass?.trim() || null;

    // 1. Check if subject with same name and targetClass already exists
    const existingByNameAndClass = await this.prisma.subject.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        targetClass: trimmedTargetClass,
      },
    });

    if (existingByNameAndClass) {
      throw new ConflictException(
        `Subject '${trimmedName}'${trimmedTargetClass ? ` for ${trimmedTargetClass}` : ''} already exists`,
      );
    }

    // 2. Check if subject with same board code already exists (if code provided)
    if (trimmedCode) {
      const existingByCode = await this.prisma.subject.findUnique({
        where: { code: trimmedCode },
      });

      if (existingByCode) {
        throw new ConflictException(
          `Subject with board code '${trimmedCode}' already exists`,
        );
      }
    }

    // 3. Create the subject in master catalog
    const subject = await this.prisma.subject.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        targetClass: trimmedTargetClass,
        description: dto.description?.trim() || null,
      },
    });

    return ResponseHelper.created(
      subject,
      `Subject '${subject.name}' created successfully`,
    );
  }

  async findAll(query?: QuerySubjectDto) {
    const where: Prisma.SubjectWhereInput = {};

    if (query?.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query?.targetClass?.trim()) {
      where.targetClass = {
        contains: query.targetClass.trim(),
        mode: 'insensitive',
      };
    }

    if (query?.classId) {
      where.classSubjects = {
        some: { classId: query.classId },
      };
    }

    const subjects = await this.prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            classSubjects: true,
            examSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(subjects, 'Subjects retrieved successfully');
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        classSubjects: {
          include: {
            schoolClass: {
              select: { id: true, name: true, numericValue: true },
            },
            group: { select: { id: true, name: true } },
            academicYear: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
        _count: {
          select: {
            classSubjects: true,
            examSubjects: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject');
    }

    return ResponseHelper.success(
      subject,
      'Subject details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const existing = await this.prisma.subject.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Subject');
    }

    const data: Prisma.SubjectUpdateInput = {};

    const targetName = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (!targetName) {
      throw new BadRequestException('Subject name cannot be empty');
    }

    const targetClass =
      dto.targetClass !== undefined
        ? dto.targetClass.trim() || null
        : existing.targetClass;

    if (targetName !== existing.name || targetClass !== existing.targetClass) {
      const duplicate = await this.prisma.subject.findFirst({
        where: {
          id: { not: id },
          name: { equals: targetName, mode: 'insensitive' },
          targetClass,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Subject '${targetName}'${targetClass ? ` for ${targetClass}` : ''} already exists`,
        );
      }

      data.name = targetName;
      data.targetClass = targetClass;
    }

    if (dto.code !== undefined) {
      const trimmedCode = dto.code.trim() || null;
      if (trimmedCode !== existing.code) {
        if (trimmedCode) {
          const duplicateCode = await this.prisma.subject.findUnique({
            where: { code: trimmedCode },
          });

          if (duplicateCode) {
            throw new ConflictException(
              `Subject with board code '${trimmedCode}' already exists`,
            );
          }
        }
        data.code = trimmedCode;
      }
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            classSubjects: true,
            examSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(updated, 'Subject updated successfully');
  }

  async remove(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            classSubjects: true,
            examSubjects: true,
            digitalResources: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject');
    }

    const issues: string[] = [];
    if (subject._count.classSubjects > 0) {
      issues.push(
        `${subject._count.classSubjects} class syllabus assignment(s)`,
      );
    }
    if (subject._count.examSubjects > 0) {
      issues.push(`${subject._count.examSubjects} exam(s)`);
    }
    if (subject._count.digitalResources > 0) {
      issues.push(`${subject._count.digitalResources} digital resource(s)`);
    }

    if (issues.length > 0) {
      throw new BadRequestException(
        `Cannot delete subject actively in use: ${issues.join(', ')}. Please remove it from classes/exams first.`,
      );
    }

    await this.prisma.subject.delete({
      where: { id },
    });

    return ResponseHelper.success(null, 'Subject deleted successfully');
  }
}
