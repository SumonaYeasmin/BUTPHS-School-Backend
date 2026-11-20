import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import {
  ExamStatus,
  ResultPublicationStatus,
} from '../../../../prisma/generated/client';
import { ResponseHelper } from '../../../common/helpers/response.helper';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Examination with full business logic and validation
   */
  async create(dto: CreateExamDto) {
    // 1. Verify Academic Year exists and is active
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (!academicYear.isActive) {
      throw new BadRequestException(
        `Cannot schedule examination for inactive academic year '${academicYear.name}'`,
      );
    }

    // 2. Verify School Class exists and is active
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });

    if (!schoolClass) {
      throw new NotFoundException('School class not found');
    }

    if (!schoolClass.isActive) {
      throw new BadRequestException(
        `Cannot schedule examination for inactive class '${schoolClass.name}'`,
      );
    }

    // 3. Resolve & Validate Grading Scale
    let gradingScaleId = dto.gradingScaleId;

    if (gradingScaleId) {
      const scale = await this.prisma.gradingScale.findFirst({
        where: { id: gradingScaleId, isDeleted: false },
        include: {
          _count: {
            select: {
              gradeRanges: { where: { isDeleted: false } },
            },
          },
        },
      });

      if (!scale) {
        throw new NotFoundException('Grading scale not found or has been deleted');
      }

      if (!scale.isActive) {
        throw new BadRequestException(
          `Grading scale '${scale.name}' is inactive and cannot be assigned to an exam`,
        );
      }

      if (scale._count.gradeRanges === 0) {
        throw new BadRequestException(
          `Grading scale '${scale.name}' does not have any active grade ranges configured. Configure grade ranges first.`,
        );
      }
    } else {
      // Auto-assign active default grading scale
      let defaultScale = await this.prisma.gradingScale.findFirst({
        where: { isDefault: true, isActive: true, isDeleted: false },
        include: {
          _count: {
            select: {
              gradeRanges: { where: { isDeleted: false } },
            },
          },
        },
      });

      if (!defaultScale) {
        defaultScale = await this.prisma.gradingScale.findFirst({
          where: { isSystemDefault: true, isActive: true, isDeleted: false },
          include: {
            _count: {
              select: {
                gradeRanges: { where: { isDeleted: false } },
              },
            },
          },
        });
      }

      if (!defaultScale) {
        throw new BadRequestException(
          'No gradingScaleId provided and no active default grading scale exists in the system. Please specify a gradingScaleId.',
        );
      }

      if (defaultScale._count.gradeRanges === 0) {
        throw new BadRequestException(
          `Default grading scale '${defaultScale.name}' has no active grade ranges configured.`,
        );
      }

      gradingScaleId = defaultScale.id;
    }

    // 4. Validate Exam Dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException(
        `Exam startDate (${dto.startDate}) cannot be after endDate (${dto.endDate})`,
      );
    }

    // Date bounds relative to Academic Year
    const ayStart = new Date(academicYear.startDate);
    const ayEnd = new Date(academicYear.endDate);
    ayStart.setHours(0, 0, 0, 0);
    ayEnd.setHours(23, 59, 59, 999);

    const examStart = new Date(startDate);
    examStart.setHours(0, 0, 0, 0);
    const examEnd = new Date(endDate);
    examEnd.setHours(23, 59, 59, 999);

    if (examStart < ayStart || examEnd > ayEnd) {
      const ayStartStr = academicYear.startDate.toISOString().split('T')[0];
      const ayEndStr = academicYear.endDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Exam dates (${dto.startDate} to ${dto.endDate}) must fall within the academic year '${academicYear.name}' (${ayStartStr} to ${ayEndStr})`,
      );
    }

    // Deadline validation (if specified)
    let marksDeadline: Date | null = null;
    if (dto.marksEntryDeadline) {
      marksDeadline = new Date(dto.marksEntryDeadline);
      if (marksDeadline < examStart) {
        throw new BadRequestException(
          'marksEntryDeadline cannot be earlier than exam startDate',
        );
      }
    }

    // 5. Weightage Percentage Validation
    if (
      dto.weightagePercentage !== undefined &&
      dto.weightagePercentage !== null
    ) {
      const existingExams = await this.prisma.exam.findMany({
        where: {
          academicYearId: dto.academicYearId,
          classId: dto.classId,
          isDeleted: false,
          weightagePercentage: { not: null },
        },
        select: {
          name: true,
          weightagePercentage: true,
        },
      });

      const currentTotalWeightage = existingExams.reduce(
        (acc, exam) => acc + Number(exam.weightagePercentage || 0),
        0,
      );

      const proposedTotal =
        currentTotalWeightage + Number(dto.weightagePercentage);
      if (proposedTotal > 100) {
        throw new BadRequestException(
          `Total weightage percentage for class '${schoolClass.name}' exams cannot exceed 100% (Current total: ${currentTotalWeightage}%, Proposed: ${dto.weightagePercentage}%, Resulting total: ${proposedTotal}%).`,
        );
      }
    }

    // 6. Duplicate Name Check (Case-insensitive trim check)
    const normalizedName = dto.name.trim();
    const duplicate = await this.prisma.exam.findFirst({
      where: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        name: { equals: normalizedName, mode: 'insensitive' },
        isDeleted: false,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `An examination named '${normalizedName}' already exists for class '${schoolClass.name}' in academic year '${academicYear.name}'.`,
      );
    }

    // 7. Determine initial status if not explicitly provided
    let status = dto.status;
    if (!status) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (today < examStart) {
        status = ExamStatus.UPCOMING;
      } else if (today <= examEnd) {
        status = ExamStatus.ONGOING;
      } else {
        status = ExamStatus.COMPLETED;
      }
    }

    // 8. Create the Exam
    const exam = await this.prisma.exam.create({
      data: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        gradingScaleId,
        name: normalizedName,
        examType: dto.examType,
        startDate,
        endDate,
        status,
        marksEntryDeadline: marksDeadline,
        allowCombinedPass: dto.allowCombinedPass ?? true,
        weightagePercentage:
          dto.weightagePercentage !== undefined &&
          dto.weightagePercentage !== null
            ? dto.weightagePercentage
            : null,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
        gradingScale: {
          select: {
            id: true,
            name: true,
            maxGpa: true,
            isDefault: true,
          },
        },
      },
    });

    return ResponseHelper.created(
      exam,
      `Examination '${exam.name}' created successfully for class '${schoolClass.name}'`,
    );
  }

  /**
   * Update an existing examination with complete domain validations
   */
  async update(id: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, isDeleted: false },
      include: {
        academicYear: true,
        schoolClass: true,
        gradingScale: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    // 1. Lock Guard: If exam is locked, cannot edit parameters unless unlocking
    const isUnlockingOnly =
      dto.isLocked === false &&
      Object.keys(dto).filter((k) => (dto as any)[k] !== undefined).length === 1;

    if (exam.isLocked && !isUnlockingOnly) {
      throw new BadRequestException(
        'This examination is locked. Unlock the examination first before modifying its details.',
      );
    }

    // 2. Published Results Guard: Cannot change grading scale or pass policy after results published
    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      if (dto.gradingScaleId && dto.gradingScaleId !== exam.gradingScaleId) {
        throw new BadRequestException(
          'Cannot change grading scale after examination results have been published',
        );
      }
      if (
        dto.allowCombinedPass !== undefined &&
        dto.allowCombinedPass !== exam.allowCombinedPass
      ) {
        throw new BadRequestException(
          'Cannot modify passing policy after examination results have been published',
        );
      }
    }

    // 3. Grading Scale Validation (if changed)
    let newGradingScaleId = exam.gradingScaleId;
    if (dto.gradingScaleId && dto.gradingScaleId !== exam.gradingScaleId) {
      const scale = await this.prisma.gradingScale.findFirst({
        where: { id: dto.gradingScaleId, isDeleted: false },
        include: {
          _count: {
            select: { gradeRanges: { where: { isDeleted: false } } },
          },
        },
      });

      if (!scale) {
        throw new NotFoundException('Grading scale not found or has been deleted');
      }

      if (!scale.isActive) {
        throw new BadRequestException(
          `Grading scale '${scale.name}' is inactive and cannot be assigned`,
        );
      }

      if (scale._count.gradeRanges === 0) {
        throw new BadRequestException(
          `Grading scale '${scale.name}' has no active grade ranges configured`,
        );
      }

      // Check if marks exist
      const marksCount = await this.prisma.mark.count({
        where: { examSubject: { examId: id } },
      });
      if (marksCount > 0) {
        throw new BadRequestException(
          `Cannot change grading scale because ${marksCount} student marks are already recorded for this examination`,
        );
      }

      newGradingScaleId = dto.gradingScaleId;
    }

    // 4. Dates Validation
    const targetStartDate = dto.startDate
      ? new Date(dto.startDate)
      : exam.startDate;
    const targetEndDate = dto.endDate ? new Date(dto.endDate) : exam.endDate;

    if (targetStartDate > targetEndDate) {
      throw new BadRequestException(
        'Exam startDate cannot be after endDate',
      );
    }

    // Academic year bounds
    const ayStart = new Date(exam.academicYear.startDate);
    const ayEnd = new Date(exam.academicYear.endDate);
    ayStart.setHours(0, 0, 0, 0);
    ayEnd.setHours(23, 59, 59, 999);

    const examStart = new Date(targetStartDate);
    examStart.setHours(0, 0, 0, 0);
    const examEnd = new Date(targetEndDate);
    examEnd.setHours(23, 59, 59, 999);

    if (examStart < ayStart || examEnd > ayEnd) {
      const ayStartStr = exam.academicYear.startDate.toISOString().split('T')[0];
      const ayEndStr = exam.academicYear.endDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Exam dates must fall within academic year '${exam.academicYear.name}' (${ayStartStr} to ${ayEndStr})`,
      );
    }

    // Marks entry deadline
    let targetDeadline: Date | null = exam.marksEntryDeadline;
    if (dto.marksEntryDeadline !== undefined) {
      targetDeadline = dto.marksEntryDeadline
        ? new Date(dto.marksEntryDeadline)
        : null;
    }
    if (targetDeadline && targetDeadline < examStart) {
      throw new BadRequestException(
        'marksEntryDeadline cannot be earlier than exam startDate',
      );
    }

    // 5. Weightage Percentage Validation (if changed)
    if (
      dto.weightagePercentage !== undefined &&
      dto.weightagePercentage !== null
    ) {
      const existingExams = await this.prisma.exam.findMany({
        where: {
          id: { not: id },
          academicYearId: exam.academicYearId,
          classId: exam.classId,
          isDeleted: false,
          weightagePercentage: { not: null },
        },
        select: {
          name: true,
          weightagePercentage: true,
        },
      });

      const currentTotalWeightage = existingExams.reduce(
        (acc, e) => acc + Number(e.weightagePercentage || 0),
        0,
      );

      const proposedTotal =
        currentTotalWeightage + Number(dto.weightagePercentage);
      if (proposedTotal > 100) {
        throw new BadRequestException(
          `Total weightage percentage for class '${exam.schoolClass.name}' exams cannot exceed 100% (Other exams: ${currentTotalWeightage}%, Proposed: ${dto.weightagePercentage}%, Total: ${proposedTotal}%).`,
        );
      }
    }

    // 6. Duplicate Name Check (if name changed)
    let normalizedName = exam.name;
    if (dto.name) {
      normalizedName = dto.name.trim();
      if (normalizedName.toLowerCase() !== exam.name.toLowerCase()) {
        const duplicate = await this.prisma.exam.findFirst({
          where: {
            id: { not: id },
            academicYearId: exam.academicYearId,
            classId: exam.classId,
            name: { equals: normalizedName, mode: 'insensitive' },
            isDeleted: false,
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `An examination named '${normalizedName}' already exists for class '${exam.schoolClass.name}' in academic year '${exam.academicYear.name}'.`,
          );
        }
      }
    }

    // 7. Update in Database
    const updated = await this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.name ? { name: normalizedName } : {}),
        ...(dto.examType ? { examType: dto.examType } : {}),
        ...(dto.gradingScaleId ? { gradingScaleId: newGradingScaleId } : {}),
        ...(dto.startDate ? { startDate: targetStartDate } : {}),
        ...(dto.endDate ? { endDate: targetEndDate } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.marksEntryDeadline !== undefined
          ? { marksEntryDeadline: targetDeadline }
          : {}),
        ...(dto.allowCombinedPass !== undefined
          ? { allowCombinedPass: dto.allowCombinedPass }
          : {}),
        ...(dto.weightagePercentage !== undefined
          ? { weightagePercentage: dto.weightagePercentage }
          : {}),
        ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
        gradingScale: {
          select: {
            id: true,
            name: true,
            maxGpa: true,
            isDefault: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      updated,
      `Examination '${updated.name}' updated successfully`,
    );
  }

  /**
   * Soft delete an examination with safety integrity checks
   */
  async softDelete(id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot delete examination '${exam.name}' because its results have already been published. Unpublish or withhold results first.`,
      );
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        `Cannot delete examination '${exam.name}' because it is locked. Unlock it first.`,
      );
    }

    const marksCount = await this.prisma.mark.count({
      where: { examSubject: { examId: id } },
    });

    if (marksCount > 0) {
      throw new BadRequestException(
        `Cannot delete examination '${exam.name}' because ${marksCount} student mark(s) have already been entered. Remove marks first.`,
      );
    }

    await this.prisma.exam.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: ExamStatus.CANCELLED,
      },
    });

    return ResponseHelper.success(
      null,
      `Examination '${exam.name}' soft deleted successfully`,
    );
  }
}
