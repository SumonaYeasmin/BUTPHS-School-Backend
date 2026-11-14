import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
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
}
