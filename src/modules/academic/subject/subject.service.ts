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

    // 1. Check if subject with same name already exists
    const existingByName = await this.prisma.subject.findUnique({
      where: { name: trimmedName },
    });

    if (existingByName) {
      throw new ConflictException(
        `Subject with name '${trimmedName}' already exists`,
      );
    }

    // 2. Check if subject with same board code already exists (if code provided)
    if (trimmedCode) {
      const existingByCode = await this.prisma.subject.findUnique({
        where: { officialCode: trimmedCode },
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
        officialCode: trimmedCode,
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
        { officialCode: { contains: term, mode: 'insensitive' } },
      ];
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

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Subject name cannot be empty');
      }

      if (trimmedName !== existing.name) {
        const duplicateName = await this.prisma.subject.findUnique({
          where: { name: trimmedName },
        });

        if (duplicateName) {
          throw new ConflictException(
            `Subject with name '${trimmedName}' already exists`,
          );
        }

        data.name = trimmedName;
      }
    }

    if (dto.code !== undefined) {
      const trimmedCode = dto.code.trim() || null;
      if (trimmedCode !== existing.officialCode) {
        if (trimmedCode) {
          const duplicateCode = await this.prisma.subject.findUnique({
            where: { officialCode: trimmedCode },
          });

          if (duplicateCode) {
            throw new ConflictException(
              `Subject with board code '${trimmedCode}' already exists`,
            );
          }
        }
        data.officialCode = trimmedCode;
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
