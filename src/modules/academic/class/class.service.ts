import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    const trimmedName = dto.name.trim();

    // 1. Check if class with same name already exists
    const existingByName = await this.prisma.schoolClass.findUnique({
      where: { name: trimmedName },
    });
    if (existingByName) {
      throw new ConflictException(
        `Class with name '${trimmedName}' already exists`,
      );
    }

    // 2. Check if class with same numeric value already exists
    const existingByNumeric = await this.prisma.schoolClass.findUnique({
      where: { numericValue: dto.numericValue },
    });
    if (existingByNumeric) {
      throw new ConflictException(
        `Class with numeric value '${dto.numericValue}' already exists (${existingByNumeric.name})`,
      );
    }

    // 3. Create class (and optional sections) in an atomic transaction
    const schoolClass = await this.prisma.$transaction(async (tx) => {
      const createdClass = await tx.schoolClass.create({
        data: {
          name: trimmedName,
          numericValue: dto.numericValue,
          ...(dto.sections && dto.sections.length > 0
            ? {
                sections: {
                  create: dto.sections.map((secName) => ({
                    name: secName.trim(),
                  })),
                },
              }
            : {}),
        },
        include: {
          sections: true,
        },
      });

      return createdClass;
    });

    return ResponseHelper.created(
      schoolClass,
      `Class '${schoolClass.name}' created successfully`,
    );
  }

  async findAll() {
    const classes = await this.prisma.schoolClass.findMany({
      orderBy: { numericValue: 'asc' },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            sections: true,
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(classes, 'Classes retrieved successfully');
  }

  async findOne(id: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        classSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sections: true,
            exams: true,
          },
        },
      },
    });

    if (!schoolClass) {
      throw new NotFoundException('Class');
    }

    return ResponseHelper.success(
      schoolClass,
      'Class details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.schoolClass.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Class');
    }

    // 1. Check duplicate name if name is being changed
    if (dto.name && dto.name.trim() !== existing.name) {
      const trimmedName = dto.name.trim();
      const duplicateName = await this.prisma.schoolClass.findUnique({
        where: { name: trimmedName },
      });
      if (duplicateName) {
        throw new ConflictException(
          `Class with name '${trimmedName}' already exists`,
        );
      }
    }

    // 2. Check duplicate numeric value if numeric value is being changed
    if (
      dto.numericValue !== undefined &&
      dto.numericValue !== existing.numericValue
    ) {
      const duplicateNumeric = await this.prisma.schoolClass.findUnique({
        where: { numericValue: dto.numericValue },
      });
      if (duplicateNumeric) {
        throw new ConflictException(
          `Class with numeric value '${dto.numericValue}' already exists (${duplicateNumeric.name})`,
        );
      }
    }

    const updated = await this.prisma.schoolClass.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.numericValue !== undefined
          ? { numericValue: dto.numericValue }
          : {}),
      },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      updated,
      `Class '${updated.name}' updated successfully`,
    );
  }

  async remove(id: string) {
    const existing = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            sections: true,
            classSubjects: true,
            teacherAssignments: true,
            exams: true,
            admissionApplications: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Class');
    }

    const counts = existing._count;

    // Critical data protection: Enrolled students, Exams, or Applications
    if (counts.enrollments > 0) {
      throw new BadRequestException(
        `Cannot delete class '${existing.name}' because it contains ${counts.enrollments} enrolled student(s).`,
      );
    }

    if (counts.exams > 0) {
      throw new BadRequestException(
        `Cannot delete class '${existing.name}' because it is linked to ${counts.exams} exam(s).`,
      );
    }

    if (counts.admissionApplications > 0) {
      throw new BadRequestException(
        `Cannot delete class '${existing.name}' because it has ${counts.admissionApplications} admission application(s).`,
      );
    }

    // Safely delete empty sections and classSubjects, then the class
    await this.prisma.$transaction(async (tx) => {
      await tx.section.deleteMany({ where: { classId: id } });
      await tx.classSubject.deleteMany({ where: { classId: id } });
      await tx.schoolClass.delete({ where: { id } });
    });

    return ResponseHelper.success(
      null,
      `Class '${existing.name}' deleted successfully`,
    );
  }
}
