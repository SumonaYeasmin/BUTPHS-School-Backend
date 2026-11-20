import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicYearDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be earlier than end date');
    }

    const trimmedName = dto.name.trim();

    const existingYear = await this.prisma.academicYear.findUnique({
      where: { name: trimmedName },
    });

    if (existingYear) {
      throw new ConflictException(
        `Academic year '${trimmedName}' already exists`,
      );
    }

    const isActive = dto.isActive ?? false;

    // Use transaction to ensure single active year if isActive is true
    const academicYear = await this.prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.academicYear.create({
        data: {
          name: trimmedName,
          startDate,
          endDate,
          isActive,
        },
      });
    });

    return ResponseHelper.created(
      academicYear,
      `Academic year '${academicYear.name}' created successfully`,
    );
  }

  async findAll() {
    const years = await this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            enrollments: true,
            classRoutines: true,
            exams: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      years,
      'Academic years retrieved successfully',
    );
  }

  async findCurrent() {
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            enrollments: true,
            classRoutines: true,
            exams: true,
          },
        },
      },
    });

    if (!currentYear) {
      throw new NotFoundException('Current active academic year');
    }

    return ResponseHelper.success(
      currentYear,
      'Current academic year retrieved successfully',
    );
  }

  async findOne(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            classRoutines: true,
            exams: true,
            classSubjects: true,
          },
        },
      },
    });

    if (!year) {
      throw new NotFoundException('Academic year');
    }

    return ResponseHelper.success(
      year,
      'Academic year details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic year');
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const trimmedName = dto.name.trim();
      const duplicate = await this.prisma.academicYear.findUnique({
        where: { name: trimmedName },
      });
      if (duplicate) {
        throw new ConflictException(
          `Academic year '${trimmedName}' already exists`,
        );
      }
    }

    const effectiveStart = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const effectiveEnd = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (effectiveStart >= effectiveEnd) {
      throw new BadRequestException('Start date must be earlier than end date');
    }

    if (existing.isActive && dto.isActive === false) {
      throw new BadRequestException(
        'Cannot directly deactivate the active academic year. Please set another academic year as active instead.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isActive === true && !existing.isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.academicYear.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    });

    return ResponseHelper.success(
      updated,
      `Academic year '${updated.name}' updated successfully`,
    );
  }

  async setActive(id: string) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic year');
    }

    if (existing.isActive) {
      return ResponseHelper.success(
        existing,
        `Academic year '${existing.name}' is already active`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      return tx.academicYear.update({
        where: { id },
        data: { isActive: true },
      });
    });

    return ResponseHelper.success(
      updated,
      `Academic year '${updated.name}' is now set as the active academic year`,
    );
  }

  async remove(id: string) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            classSubjects: true,
            teacherAssignments: true,
            classRoutines: true,
            exams: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Academic year');
    }

    if (existing.isActive) {
      throw new BadRequestException(
        'Cannot delete the currently active academic year. Please activate another year first.',
      );
    }

    const counts = existing._count;
    const totalRelations =
      counts.enrollments +
      counts.classSubjects +
      counts.teacherAssignments +
      counts.classRoutines +
      counts.exams;

    if (totalRelations > 0) {
      throw new BadRequestException(
        `Cannot delete academic year '${existing.name}' because it contains associated records (${counts.enrollments} enrollments, ${counts.classRoutines} routines, ${counts.exams} exams).`,
      );
    }

    await this.prisma.academicYear.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      `Academic year '${existing.name}' deleted successfully`,
    );
  }
}
