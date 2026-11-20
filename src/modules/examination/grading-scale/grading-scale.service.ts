import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateGradingScaleDto } from './dto/create-grading-scale.dto';
import { UpdateGradingScaleDto } from './dto/update-grading-scale.dto';
import { QueryGradingScaleDto } from './dto/query-grading-scale.dto';
import { CreateGradeRangeDto } from './dto/create-grade-range.dto';
import { UpdateGradeRangeDto } from './dto/update-grade-range.dto';
import { BulkCreateGradeRangeDto } from './dto/bulk-create-grade-range.dto';
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
   * Add a single grade range to a grading scale
   */
  async addGradeRange(scaleId: string, dto: CreateGradeRangeDto) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
        gradeRanges: {
          where: { isDeleted: false },
        },
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    if (scale.isSystemDefault) {
      throw new BadRequestException(
        'Cannot modify grade ranges of system default grading scale',
      );
    }

    if (scale._count.exams > 0) {
      throw new BadRequestException(
        `Cannot add grade range because this grading scale is actively used by ${scale._count.exams} examination(s).`,
      );
    }

    if (dto.minPercentage > dto.maxPercentage) {
      throw new BadRequestException(
        `minPercentage (${dto.minPercentage}%) cannot be greater than maxPercentage (${dto.maxPercentage}%)`,
      );
    }

    if (dto.gradePoint > Number(scale.maxGpa)) {
      throw new BadRequestException(
        `Grade point (${dto.gradePoint}) exceeds scale maxGpa (${scale.maxGpa})`,
      );
    }

    const targetGrade = dto.letterGrade.trim().toUpperCase();
    const duplicateLetter = scale.gradeRanges.find(
      (r) => r.letterGrade.toUpperCase() === targetGrade,
    );
    if (duplicateLetter) {
      throw new ConflictException(
        `Grade range with letter grade '${targetGrade}' already exists in this scale`,
      );
    }

    for (const r of scale.gradeRanges) {
      const curMin = Number(r.minPercentage);
      const curMax = Number(r.maxPercentage);
      if (!(dto.maxPercentage < curMin || dto.minPercentage > curMax)) {
        throw new BadRequestException(
          `Percentage range (${dto.minPercentage}% - ${dto.maxPercentage}%) overlaps with existing grade '${r.letterGrade}' (${curMin}% - ${curMax}%)`,
        );
      }
    }

    const created = await this.prisma.gradeRange.create({
      data: {
        gradingScaleId: scaleId,
        minPercentage: dto.minPercentage,
        maxPercentage: dto.maxPercentage,
        letterGrade: targetGrade,
        gradePoint: dto.gradePoint,
        remarks: dto.remarks?.trim() || null,
        isFailGrade: dto.isFailGrade ?? false,
        displayOrder: dto.displayOrder ?? 0,
      },
    });

    return ResponseHelper.created(
      created,
      `Grade range '${created.letterGrade}' added successfully to scale '${scale.name}'`,
    );
  }

  /**
   * Bulk add / replace all grade ranges for a grading scale atomically
   */
  async bulkAddGradeRanges(scaleId: string, dto: BulkCreateGradeRangeDto) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    if (scale.isSystemDefault) {
      throw new BadRequestException(
        'Cannot modify grade ranges of system default grading scale',
      );
    }

    if (scale._count.exams > 0) {
      throw new BadRequestException(
        `Cannot replace grade ranges because this grading scale is actively used by ${scale._count.exams} examination(s).`,
      );
    }

    if (!dto.ranges || dto.ranges.length === 0) {
      throw new BadRequestException(
        'At least one grade range must be provided',
      );
    }

    this.validateGradeRanges(dto.ranges, Number(scale.maxGpa));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.gradeRange.deleteMany({
        where: { gradingScaleId: scaleId },
      });

      await tx.gradeRange.createMany({
        data: dto.ranges.map((r) => ({
          gradingScaleId: scaleId,
          minPercentage: r.minPercentage,
          maxPercentage: r.maxPercentage,
          letterGrade: r.letterGrade.trim().toUpperCase(),
          gradePoint: r.gradePoint,
          remarks: r.remarks?.trim() || null,
          isFailGrade: r.isFailGrade ?? false,
          displayOrder: r.displayOrder ?? 0,
        })),
      });

      return tx.gradeRange.findMany({
        where: { gradingScaleId: scaleId },
        orderBy: [{ displayOrder: 'asc' }, { minPercentage: 'desc' }],
      });
    });

    return ResponseHelper.created(
      result,
      `${result.length} grade range(s) configured successfully for scale '${scale.name}'`,
    );
  }

  /**
   * Get all grade ranges for a grading scale
   */
  async getGradeRanges(scaleId: string) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, isDeleted: false },
      select: {
        id: true,
        name: true,
        maxGpa: true,
        isDefault: true,
        isActive: true,
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    const ranges = await this.prisma.gradeRange.findMany({
      where: { gradingScaleId: scaleId, isDeleted: false },
      orderBy: [{ displayOrder: 'asc' }, { minPercentage: 'desc' }],
    });

    return ResponseHelper.success(
      {
        gradingScale: scale,
        totalRanges: ranges.length,
        ranges,
      },
      `Grade ranges for '${scale.name}' retrieved successfully`,
    );
  }

  /**
   * Get a specific grade range by ID
   */
  async getGradeRangeById(scaleId: string, rangeId: string) {
    const range = await this.prisma.gradeRange.findFirst({
      where: { id: rangeId, gradingScaleId: scaleId, isDeleted: false },
      include: {
        gradingScale: {
          select: {
            id: true,
            name: true,
            maxGpa: true,
            isDefault: true,
            isDeleted: true,
          },
        },
      },
    });

    if (!range || range.gradingScale.isDeleted) {
      throw new NotFoundException('Grade range');
    }

    return ResponseHelper.success(
      range,
      `Grade range '${range.letterGrade}' details retrieved successfully`,
    );
  }

  /**
   * Update a specific grade range
   */
  async updateGradeRange(
    scaleId: string,
    rangeId: string,
    dto: UpdateGradeRangeDto,
  ) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
        gradeRanges: {
          where: { isDeleted: false },
        },
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    if (scale.isSystemDefault) {
      throw new BadRequestException(
        'Cannot modify grade ranges of system default grading scale',
      );
    }

    if (scale._count.exams > 0) {
      throw new BadRequestException(
        `Cannot modify grade range because this grading scale is actively used by ${scale._count.exams} examination(s).`,
      );
    }

    const existingRange = scale.gradeRanges.find((r) => r.id === rangeId);
    if (!existingRange) {
      throw new NotFoundException('Grade range');
    }

    const targetMin =
      dto.minPercentage !== undefined
        ? dto.minPercentage
        : Number(existingRange.minPercentage);
    const targetMax =
      dto.maxPercentage !== undefined
        ? dto.maxPercentage
        : Number(existingRange.maxPercentage);
    const targetGrade =
      dto.letterGrade !== undefined
        ? dto.letterGrade.trim().toUpperCase()
        : existingRange.letterGrade;
    const targetPoint =
      dto.gradePoint !== undefined
        ? dto.gradePoint
        : Number(existingRange.gradePoint);

    if (targetMin > targetMax) {
      throw new BadRequestException(
        `minPercentage (${targetMin}%) cannot be greater than maxPercentage (${targetMax}%)`,
      );
    }

    if (targetPoint > Number(scale.maxGpa)) {
      throw new BadRequestException(
        `Grade point (${targetPoint}) exceeds scale maxGpa (${scale.maxGpa})`,
      );
    }

    if (
      dto.letterGrade !== undefined &&
      targetGrade !== existingRange.letterGrade
    ) {
      const duplicate = scale.gradeRanges.find(
        (r) => r.id !== rangeId && r.letterGrade.toUpperCase() === targetGrade,
      );
      if (duplicate) {
        throw new ConflictException(
          `Grade range with letter grade '${targetGrade}' already exists in this scale`,
        );
      }
    }

    // Overlap check against all other active ranges of this scale
    for (const r of scale.gradeRanges) {
      if (r.id === rangeId) continue;
      const curMin = Number(r.minPercentage);
      const curMax = Number(r.maxPercentage);

      if (!(targetMax < curMin || targetMin > curMax)) {
        throw new BadRequestException(
          `Percentage range (${targetMin}% - ${targetMax}%) overlaps with existing grade '${r.letterGrade}' (${curMin}% - ${curMax}%)`,
        );
      }
    }

    const updated = await this.prisma.gradeRange.update({
      where: { id: rangeId },
      data: {
        ...(dto.minPercentage !== undefined
          ? { minPercentage: dto.minPercentage }
          : {}),
        ...(dto.maxPercentage !== undefined
          ? { maxPercentage: dto.maxPercentage }
          : {}),
        ...(dto.letterGrade !== undefined
          ? { letterGrade: targetGrade }
          : {}),
        ...(dto.gradePoint !== undefined
          ? { gradePoint: dto.gradePoint }
          : {}),
        ...(dto.remarks !== undefined
          ? { remarks: dto.remarks?.trim() || null }
          : {}),
        ...(dto.isFailGrade !== undefined
          ? { isFailGrade: dto.isFailGrade }
          : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
      },
    });

    return ResponseHelper.success(
      updated,
      `Grade range '${updated.letterGrade}' updated successfully`,
    );
  }

  /**
   * Soft delete a specific grade range
   */
  async softDeleteGradeRange(scaleId: string, rangeId: string) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id: scaleId, isDeleted: false },
      include: {
        _count: { select: { exams: true } },
      },
    });

    if (!scale) {
      throw new NotFoundException('Grading scale');
    }

    if (scale.isSystemDefault) {
      throw new BadRequestException(
        'Cannot delete grade ranges from system default grading scale',
      );
    }

    if (scale._count.exams > 0) {
      throw new BadRequestException(
        `Cannot delete grade range because this grading scale is actively used by ${scale._count.exams} examination(s).`,
      );
    }

    const existingRange = await this.prisma.gradeRange.findFirst({
      where: { id: rangeId, gradingScaleId: scaleId, isDeleted: false },
    });

    if (!existingRange) {
      throw new NotFoundException('Grade range');
    }

    await this.prisma.gradeRange.update({
      where: { id: rangeId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return ResponseHelper.success(
      null,
      `Grade range '${existingRange.letterGrade}' soft deleted successfully`,
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
