import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateGradingScaleDto } from './dto/create-grading-scale.dto';
import { UpdateGradingScaleDto } from './dto/update-grading-scale.dto';
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
   */
  async create(dto: CreateGradingScaleDto) {
    const trimmedName = dto.name.trim();

    // 1. Verify unique name among non-deleted scales
    const existing = await this.prisma.gradingScale.findFirst({
      where: { name: trimmedName, isDeleted: false },
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
      this.validateGradeRanges(dto.gradeRanges, maxGpa);
    }

    // 3. Atomic Database Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // If setting this scale as default, reset other default scales
      if (dto.isDefault) {
        await tx.gradingScale.updateMany({
          where: { isDefault: true, isDeleted: false },
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
          isDeleted: false,
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

    const where: Prisma.GradingScaleWhereInput = {
      isDeleted: false,
    };

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
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id, isDeleted: false },
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

  /**
   * Update an existing grading scale
   */
  async update(id: string, dto: UpdateGradingScaleDto) {
    const existing = await this.prisma.gradingScale.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
        gradeRanges: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Grading scale');
    }

    // 1. System Default Protections
    if (existing.isSystemDefault) {
      if (dto.name && dto.name.trim() !== existing.name) {
        throw new BadRequestException(
          'Cannot rename system default grading scale',
        );
      }
      if (dto.isActive === false) {
        throw new BadRequestException(
          'Cannot deactivate system default grading scale',
        );
      }
    }

    // 2. Default scale status guard
    if (existing.isDefault && dto.isDefault === false) {
      throw new BadRequestException(
        'Cannot remove default status directly. Please set another grading scale as default instead.',
      );
    }

    // 3. Name uniqueness check if renamed
    if (dto.name && dto.name.trim() !== existing.name) {
      const trimmed = dto.name.trim();
      const duplicate = await this.prisma.gradingScale.findFirst({
        where: { name: trimmed, isDeleted: false, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException(
          `Grading scale with name '${trimmed}' already exists`,
        );
      }
    }

    // 4. In-use exam protection on maxGpa
    const targetMaxGpa =
      dto.maxGpa !== undefined ? dto.maxGpa : Number(existing.maxGpa);

    if (dto.maxGpa !== undefined && Number(existing.maxGpa) !== dto.maxGpa) {
      if (dto.maxGpa <= 0) {
        throw new BadRequestException('maxGpa must be greater than 0');
      }
      if (existing._count.exams > 0) {
        throw new BadRequestException(
          `Cannot modify maxGpa because this scale is already in use by ${existing._count.exams} examination(s).`,
        );
      }
    }

    // 5. Grade ranges validation if ranges are updated/replaced
    if (dto.gradeRanges && dto.gradeRanges.length > 0) {
      this.validateGradeRanges(dto.gradeRanges, targetMaxGpa);
    }

    // 6. Atomic Database Transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // If promoting this scale to default, reset other default scales
      if (dto.isDefault === true && !existing.isDefault) {
        await tx.gradingScale.updateMany({
          where: { isDefault: true, isDeleted: false },
          data: { isDefault: false },
        });
      }

      // If replacing grade ranges atomically
      if (dto.gradeRanges) {
        await tx.gradeRange.deleteMany({
          where: { gradingScaleId: id },
        });

        if (dto.gradeRanges.length > 0) {
          await tx.gradeRange.createMany({
            data: dto.gradeRanges.map((r) => ({
              gradingScaleId: id,
              minPercentage: r.minPercentage,
              maxPercentage: r.maxPercentage,
              letterGrade: r.letterGrade.trim().toUpperCase(),
              gradePoint: r.gradePoint,
              remarks: r.remarks?.trim() || null,
              isFailGrade: r.isFailGrade ?? false,
              displayOrder: r.displayOrder ?? 0,
            })),
          });
        }
      }

      return tx.gradingScale.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.maxGpa !== undefined ? { maxGpa: dto.maxGpa } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
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
    });

    return ResponseHelper.success(
      updated,
      `Grading scale '${updated.name}' updated successfully`,
    );
  }

  /**
   * Soft delete a grading scale
   * Protects against deleting:
   * 1. System default scale
   * 2. Active default scale
   * 3. Scale linked to active examinations
   */
  async softDelete(id: string) {
    const existing = await this.prisma.gradingScale.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Grading scale');
    }

    if (existing.isSystemDefault) {
      throw new BadRequestException(
        'Cannot delete system default grading scale',
      );
    }

    if (existing.isDefault) {
      throw new BadRequestException(
        'Cannot delete default grading scale. Please designate another grading scale as default first.',
      );
    }

    if (existing._count.exams > 0) {
      throw new BadRequestException(
        `Cannot delete grading scale '${existing.name}' because it is associated with ${existing._count.exams} examination(s).`,
      );
    }

    await this.prisma.gradingScale.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return ResponseHelper.success(
      null,
      `Grading scale '${existing.name}' soft deleted successfully`,
    );
  }

  /**
   * Helper: Validate grade ranges for duplicates, bounds, and interval overlaps
   */
  private validateGradeRanges(ranges: any[], maxGpa: number) {
    const seenGrades = new Set<string>();

    for (const r of ranges) {
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
    const sortedRanges = [...ranges].sort(
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
}
