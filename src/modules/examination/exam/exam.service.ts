import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamStatus } from '../../../../prisma/generated/client';
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
}
