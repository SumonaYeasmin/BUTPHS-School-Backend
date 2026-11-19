import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateGradingScaleDto } from './dto/create-grading-scale.dto';
import { QueryGradingScaleDto } from './dto/query-grading-scale.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class GradingScaleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new grading scale with optional initial grade ranges
   * Guaranteed secure with:
   * 1. Unique name check
   * 2. Max GPA range boundary check
   * 3. No duplicate letter grades
   * 4. Strict interval overlap validation (0 - 100%)
   * 5. Atomic transaction for default scale management and range insertion
   */
  async create(dto: CreateGradingScaleDto) {
    const trimmedName = dto.name.trim();

    // 1. Verify unique name
    const existing = await this.prisma.gradingScale.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      throw new ConflictException(
        `Grading scale '${trimmedName}' already exists`,
      );
    }

    const maxGpa = dto.maxGpa ?? 5.0;
    if (maxGpa <= 0) {
      throw new BadRequestException('maxGpa must be greater than 0');
    }

    // 2. Validate grade ranges if provided
    if (dto.gradeRanges && dto.gradeRanges.length > 0) {
      const seenGrades = new Set<string>();

      for (const r of dto.gradeRanges) {
        const gradeKey = r.letterGrade.trim().toUpperCase();

        if (seenGrades.has(gradeKey)) {
          throw new BadRequestException(
            `Duplicate letter grade '${r.letterGrade.trim()}' in grade ranges`,
          );
        }
        seenGrades.add(gradeKey);

        if (r.minPercentage > r.maxPercentage) {
          throw new BadRequestException(
            `Invalid range for grade '${r.letterGrade}': minPercentage (${r.minPercentage}%) cannot be greater than maxPercentage (${r.maxPercentage}%)`,
          );
        }

        if (r.gradePoint > maxGpa) {
          throw new BadRequestException(
            `Grade point (${r.gradePoint}) for grade '${r.letterGrade}' exceeds scale maxGpa (${maxGpa})`,
          );
        }
      }

      // Check for percentage overlap among ranges
      const sortedRanges = [...dto.gradeRanges].sort(
        (a, b) => a.minPercentage - b.minPercentage,
      );

      for (let i = 0; i < sortedRanges.length - 1; i++) {
        const current = sortedRanges[i];
        const next = sortedRanges[i + 1];

        if (current.maxPercentage >= next.minPercentage) {
          throw new BadRequestException(
            `Percentage overlap detected between grade '${current.letterGrade}' (${current.minPercentage}% - ${current.maxPercentage}%) and grade '${next.letterGrade}' (${next.minPercentage}% - ${next.maxPercentage}%)`,
          );
        }
      }
    }

    // 3. Atomic Database Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // If setting this scale as default, reset other default scales
      if (dto.isDefault) {
        await tx.gradingScale.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.gradingScale.create({
        data: {
          name: trimmedName,
          description: dto.description?.trim() || null,
          maxGpa,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          gradeRanges:
            dto.gradeRanges && dto.gradeRanges.length > 0
              ? {
                  create: dto.gradeRanges.map((r) => ({
                    minPercentage: r.minPercentage,
                    maxPercentage: r.maxPercentage,
                    letterGrade: r.letterGrade.trim().toUpperCase(),
                    gradePoint: r.gradePoint,
                    remarks: r.remarks?.trim() || null,
                    isFailGrade: r.isFailGrade ?? false,
                    displayOrder: r.displayOrder ?? 0,
                  })),
                }
              : undefined,
        },
        include: {
          gradeRanges: {
            orderBy: { minPercentage: 'desc' },
          },
          _count: {
            select: { exams: true },
          },
        },
      });

      return created;
    });

    return ResponseHelper.created(
      result,
      `Grading scale '${result.name}' created successfully`,
    );
  }

  /**
   * Get all grading scales with pagination, search, and active filtering
   */
  async findAll(query: QueryGradingScaleDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.GradingScaleWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.gradingScale.count({ where }),
      this.prisma.gradingScale.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        include: {
          gradeRanges: {
            orderBy: { minPercentage: 'desc' },
          },
          _count: {
            select: {
              gradeRanges: true,
              exams: true,
            },
          },
        },
      }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);

    return ResponseHelper.paginated(
      data,
      meta,
      'Grading scales retrieved successfully',
    );
  }

  /**
   * Get details of a single grading scale by ID with all sorted grade ranges
   */
  async findOne(id: string) {
    const scale = await this.prisma.gradingScale.findUnique({
      where: { id },
      include: {
        gradeRanges: {
          orderBy: { minPercentage: 'desc' },
        },
        _count: {
          select: {
            gradeRanges: true,
            exams: true,
          },
        },
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    return ResponseHelper.success(
      scale,
      `Grading scale '${scale.name}' retrieved successfully`,
    );
  }
}
