import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamSubjectDto } from './dto/create-exam-subject.dto';
import { UpdateExamSubjectDto } from './dto/update-exam-subject.dto';
import { QueryExamSubjectDto } from './dto/query-exam-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ExamStatus,
  Prisma,
  ResultPublicationStatus,
} from '../../../../prisma/generated/client';

@Injectable()
export class ExamSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a single subject with full marks distribution breakdown to an examination
   */
  async create(examId: string, dto: CreateExamSubjectDto) {
    // 1. Verify Exam existence and state guards
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        academicYear: true,
        schoolClass: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        `Examination '${exam.name}' is locked. Unlock it first before adding subjects.`,
      );
    }

    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot add subjects to examination '${exam.name}' because its results have already been published.`,
      );
    }

    if (
      exam.status === ExamStatus.COMPLETED ||
      exam.status === ExamStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot add subjects to an examination with status '${exam.status}'.`,
      );
    }

    // 2. Verify Subject existence
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, isActive: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found or is inactive');
    }

    // 3. Curriculum Binding Check: Ensure subject belongs to this class & academic year in ClassSubject
    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        subjectId: dto.subjectId,
        isActive: true,
      },
    });

    if (!classSubject) {
      throw new BadRequestException(
        `Subject '${subject.name}' is not assigned to the curriculum for class '${exam.schoolClass.name}' in academic year '${exam.academicYear.name}'.`,
      );
    }

    // 4. Verify Academic Group (if provided or inherited)
    let finalGroupId = dto.groupId;
    if (finalGroupId) {
      const group = await this.prisma.academicGroup.findFirst({
        where: { id: finalGroupId, isActive: true },
      });
      if (!group) {
        throw new NotFoundException('Academic group not found or is inactive');
      }

      if (classSubject.groupId && classSubject.groupId !== finalGroupId) {
        throw new BadRequestException(
          `Specified group does not match curriculum group assigned to '${subject.name}'.`,
        );
      }
    } else if (classSubject.groupId) {
      finalGroupId = classSubject.groupId;
    }

    // 5. Duplicate Check
    const existingExamSubject = await this.prisma.examSubject.findUnique({
      where: {
        examId_subjectId: {
          examId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (existingExamSubject) {
      throw new ConflictException(
        `Subject '${subject.name}' is already configured for this examination.`,
      );
    }

    // 6. Pass Marks vs Full Marks boundary
    if (Number(dto.passMarks) > Number(dto.fullMarks)) {
      throw new BadRequestException(
        `passMarks (${dto.passMarks}) cannot exceed fullMarks (${dto.fullMarks}).`,
      );
    }

    // 7. Component Marks Verification & Mathematical Integrity
    const hasWritten = dto.hasWritten ?? true;
    const hasMcq = dto.hasMcq ?? false;
    const hasPractical = dto.hasPractical ?? false;
    const hasContinuousAssessment = dto.hasContinuousAssessment ?? false;

    if (hasWritten) {
      if (
        dto.writtenFullMarks === undefined ||
        dto.writtenFullMarks === null ||
        dto.writtenFullMarks <= 0
      ) {
        throw new BadRequestException(
          'writtenFullMarks must be specified and greater than 0 when hasWritten is true.',
        );
      }
      if (
        dto.writtenPassMarks !== undefined &&
        dto.writtenPassMarks !== null &&
        dto.writtenPassMarks > dto.writtenFullMarks
      ) {
        throw new BadRequestException(
          `writtenPassMarks (${dto.writtenPassMarks}) cannot exceed writtenFullMarks (${dto.writtenFullMarks}).`,
        );
      }
    }

    if (hasMcq) {
      if (
        dto.mcqFullMarks === undefined ||
        dto.mcqFullMarks === null ||
        dto.mcqFullMarks <= 0
      ) {
        throw new BadRequestException(
          'mcqFullMarks must be specified and greater than 0 when hasMcq is true.',
        );
      }
      if (
        dto.mcqPassMarks !== undefined &&
        dto.mcqPassMarks !== null &&
        dto.mcqPassMarks > dto.mcqFullMarks
      ) {
        throw new BadRequestException(
          `mcqPassMarks (${dto.mcqPassMarks}) cannot exceed mcqFullMarks (${dto.mcqFullMarks}).`,
        );
      }
    }

    if (hasPractical) {
      if (
        dto.practicalFullMarks === undefined ||
        dto.practicalFullMarks === null ||
        dto.practicalFullMarks <= 0
      ) {
        throw new BadRequestException(
          'practicalFullMarks must be specified and greater than 0 when hasPractical is true.',
        );
      }
      if (
        dto.practicalPassMarks !== undefined &&
        dto.practicalPassMarks !== null &&
        dto.practicalPassMarks > dto.practicalFullMarks
      ) {
        throw new BadRequestException(
          `practicalPassMarks (${dto.practicalPassMarks}) cannot exceed practicalFullMarks (${dto.practicalFullMarks}).`,
        );
      }
    }

    if (hasContinuousAssessment) {
      if (
        dto.continuousAssessmentFullMarks === undefined ||
        dto.continuousAssessmentFullMarks === null ||
        dto.continuousAssessmentFullMarks <= 0
      ) {
        throw new BadRequestException(
          'continuousAssessmentFullMarks must be specified and greater than 0 when hasContinuousAssessment is true.',
        );
      }
      if (
        dto.continuousAssessmentPassMarks !== undefined &&
        dto.continuousAssessmentPassMarks !== null &&
        dto.continuousAssessmentPassMarks > dto.continuousAssessmentFullMarks
      ) {
        throw new BadRequestException(
          `continuousAssessmentPassMarks (${dto.continuousAssessmentPassMarks}) cannot exceed continuousAssessmentFullMarks (${dto.continuousAssessmentFullMarks}).`,
        );
      }
    }

    // Component sum exact match verification
    if (hasWritten || hasMcq || hasPractical || hasContinuousAssessment) {
      const componentSum =
        (hasWritten ? Number(dto.writtenFullMarks || 0) : 0) +
        (hasMcq ? Number(dto.mcqFullMarks || 0) : 0) +
        (hasPractical ? Number(dto.practicalFullMarks || 0) : 0) +
        (hasContinuousAssessment
          ? Number(dto.continuousAssessmentFullMarks || 0)
          : 0);

      if (Math.abs(componentSum - Number(dto.fullMarks)) > 0.001) {
        throw new BadRequestException(
          `The sum of component marks (${componentSum}) does not match the total fullMarks (${dto.fullMarks}). Please adjust written, MCQ, practical, or continuous marks.`,
        );
      }
    }

    // 8. Display Order Defaulting
    const displayOrder =
      dto.displayOrder !== undefined && dto.displayOrder !== null
        ? dto.displayOrder
        : classSubject.displayOrder || 0;

    // 9. Create the ExamSubject
    const examSubject = await this.prisma.examSubject.create({
      data: {
        examId,
        subjectId: dto.subjectId,
        groupId: finalGroupId || null,
        fullMarks: dto.fullMarks,
        passMarks: dto.passMarks,
        hasWritten,
        writtenFullMarks: hasWritten ? dto.writtenFullMarks : null,
        writtenPassMarks: hasWritten ? dto.writtenPassMarks : null,
        hasMcq,
        mcqFullMarks: hasMcq ? dto.mcqFullMarks : null,
        mcqPassMarks: hasMcq ? dto.mcqPassMarks : null,
        hasPractical,
        practicalFullMarks: hasPractical ? dto.practicalFullMarks : null,
        practicalPassMarks: hasPractical ? dto.practicalPassMarks : null,
        hasContinuousAssessment,
        continuousAssessmentFullMarks: hasContinuousAssessment
          ? dto.continuousAssessmentFullMarks
          : null,
        continuousAssessmentPassMarks: hasContinuousAssessment
          ? dto.continuousAssessmentPassMarks
          : null,
        isOptional: dto.isOptional ?? classSubject.isOptional ?? false,
        displayOrder,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
            paperNumber: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
          },
        },
      },
    });

    return ResponseHelper.created(
      examSubject,
      `Subject '${subject.name}' added successfully to examination '${exam.name}'`,
    );
  }

  /**
   * Get all subjects configured for an examination with group and marks summary
   */
  async findAllByExam(examId: string, query: QueryExamSubjectDto) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
      include: {
        academicYear: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        schoolClass: {
          select: { id: true, name: true, numericValue: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    const whereClause: Prisma.ExamSubjectWhereInput = {
      examId,
    };

    if (query.groupId) {
      whereClause.groupId = query.groupId;
    }

    if (query.isOptional !== undefined) {
      whereClause.isOptional = query.isOptional;
    }

    const examSubjects = await this.prisma.examSubject.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
            paperNumber: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            marks: true,
            examRoutines: true,
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }],
    });

    const totalCoreMarks = examSubjects
      .filter((s) => !s.isOptional)
      .reduce((sum, s) => sum + Number(s.fullMarks), 0);

    const totalOptionalMarks = examSubjects
      .filter((s) => s.isOptional)
      .reduce((sum, s) => sum + Number(s.fullMarks), 0);

    return ResponseHelper.success(
      {
        examination: {
          id: exam.id,
          name: exam.name,
          examType: exam.examType,
          status: exam.status,
          startDate: exam.startDate,
          endDate: exam.endDate,
          allowCombinedPass: exam.allowCombinedPass,
          weightagePercentage: exam.weightagePercentage,
          academicYear: exam.academicYear,
          schoolClass: exam.schoolClass,
        },
        summary: {
          totalSubjects: examSubjects.length,
          coreSubjectsCount: examSubjects.filter((s) => !s.isOptional).length,
          optionalSubjectsCount: examSubjects.filter((s) => s.isOptional).length,
          totalCoreMarks,
          totalOptionalMarks,
        },
        subjects: examSubjects,
      },
      `Exam subjects for '${exam.name}' retrieved successfully`,
    );
  }

  /**
   * Get single configured subject details by ID
   */
  async findOne(examId: string, examSubjectId: string) {
    const examSubject = await this.prisma.examSubject.findFirst({
      where: { id: examSubjectId, examId },
      include: {
        subject: true,
        group: true,
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            status: true,
            startDate: true,
            endDate: true,
            academicYear: { select: { id: true, name: true } },
            schoolClass: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            marks: true,
            examRoutines: true,
            subjectResults: true,
          },
        },
      },
    });

    if (!examSubject) {
      throw new NotFoundException('Exam subject configuration not found');
    }

    return ResponseHelper.success(
      examSubject,
      `Exam subject '${examSubject.subject.name}' details retrieved successfully`,
    );
  }

  /**
   * Update an existing exam subject configuration with safety checks
   */
  async update(
    examId: string,
    subjectConfigId: string,
    dto: UpdateExamSubjectDto,
  ) {
    // 1. Verify Exam existence and state guards
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        `Examination '${exam.name}' is locked. Unlock it first before modifying subjects.`,
      );
    }

    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot modify subjects of examination '${exam.name}' because results have already been published.`,
      );
    }

    if (
      exam.status === ExamStatus.COMPLETED ||
      exam.status === ExamStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot modify subjects of an examination with status '${exam.status}'.`,
      );
    }

    // 2. Verify ExamSubject existence
    const existing = await this.prisma.examSubject.findFirst({
      where: { id: subjectConfigId, examId },
      include: {
        subject: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Exam subject configuration not found');
    }

    // 3. Recorded marks check: Cannot modify marks breakdown if student marks are already recorded
    const marksCount = await this.prisma.mark.count({
      where: { examSubjectId: subjectConfigId },
    });

    const isModifyingMarksStructure =
      (dto.fullMarks !== undefined &&
        dto.fullMarks !== Number(existing.fullMarks)) ||
      (dto.hasWritten !== undefined && dto.hasWritten !== existing.hasWritten) ||
      (dto.writtenFullMarks !== undefined &&
        dto.writtenFullMarks !== Number(existing.writtenFullMarks || 0)) ||
      (dto.hasMcq !== undefined && dto.hasMcq !== existing.hasMcq) ||
      (dto.mcqFullMarks !== undefined &&
        dto.mcqFullMarks !== Number(existing.mcqFullMarks || 0)) ||
      (dto.hasPractical !== undefined &&
        dto.hasPractical !== existing.hasPractical) ||
      (dto.practicalFullMarks !== undefined &&
        dto.practicalFullMarks !== Number(existing.practicalFullMarks || 0)) ||
      (dto.hasContinuousAssessment !== undefined &&
        dto.hasContinuousAssessment !== existing.hasContinuousAssessment) ||
      (dto.continuousAssessmentFullMarks !== undefined &&
        dto.continuousAssessmentFullMarks !==
          Number(existing.continuousAssessmentFullMarks || 0));

    if (marksCount > 0 && isModifyingMarksStructure) {
      throw new BadRequestException(
        `Cannot modify marks structure or component full marks for '${existing.subject.name}' because ${marksCount} student marks are already recorded for it. Clear marks first.`,
      );
    }

    // 4. Verify Group (if changed)
    let finalGroupId = existing.groupId;
    if (dto.groupId !== undefined) {
      if (dto.groupId) {
        const group = await this.prisma.academicGroup.findFirst({
          where: { id: dto.groupId, isActive: true },
        });
        if (!group) {
          throw new NotFoundException('Academic group not found or is inactive');
        }
        finalGroupId = dto.groupId;
      } else {
        finalGroupId = null;
      }
    }

    // 5. Compute target marks and components
    const targetFullMarks =
      dto.fullMarks !== undefined ? dto.fullMarks : Number(existing.fullMarks);
    const targetPassMarks =
      dto.passMarks !== undefined ? dto.passMarks : Number(existing.passMarks);

    if (targetPassMarks > targetFullMarks) {
      throw new BadRequestException(
        `passMarks (${targetPassMarks}) cannot exceed fullMarks (${targetFullMarks}).`,
      );
    }

    const targetHasWritten =
      dto.hasWritten !== undefined ? dto.hasWritten : existing.hasWritten;
    const targetWrittenFull = targetHasWritten
      ? dto.writtenFullMarks !== undefined
        ? dto.writtenFullMarks
        : Number(existing.writtenFullMarks || 0)
      : null;
    const targetWrittenPass = targetHasWritten
      ? dto.writtenPassMarks !== undefined
        ? dto.writtenPassMarks
        : Number(existing.writtenPassMarks || 0)
      : null;

    if (targetHasWritten) {
      if (!targetWrittenFull || targetWrittenFull <= 0) {
        throw new BadRequestException(
          'writtenFullMarks must be specified and greater than 0 when hasWritten is true.',
        );
      }
      if (targetWrittenPass && targetWrittenPass > targetWrittenFull) {
        throw new BadRequestException(
          `writtenPassMarks (${targetWrittenPass}) cannot exceed writtenFullMarks (${targetWrittenFull}).`,
        );
      }
    }

    const targetHasMcq =
      dto.hasMcq !== undefined ? dto.hasMcq : existing.hasMcq;
    const targetMcqFull = targetHasMcq
      ? dto.mcqFullMarks !== undefined
        ? dto.mcqFullMarks
        : Number(existing.mcqFullMarks || 0)
      : null;
    const targetMcqPass = targetHasMcq
      ? dto.mcqPassMarks !== undefined
        ? dto.mcqPassMarks
        : Number(existing.mcqPassMarks || 0)
      : null;

    if (targetHasMcq) {
      if (!targetMcqFull || targetMcqFull <= 0) {
        throw new BadRequestException(
          'mcqFullMarks must be specified and greater than 0 when hasMcq is true.',
        );
      }
      if (targetMcqPass && targetMcqPass > targetMcqFull) {
        throw new BadRequestException(
          `mcqPassMarks (${targetMcqPass}) cannot exceed mcqFullMarks (${targetMcqFull}).`,
        );
      }
    }

    const targetHasPractical =
      dto.hasPractical !== undefined ? dto.hasPractical : existing.hasPractical;
    const targetPracticalFull = targetHasPractical
      ? dto.practicalFullMarks !== undefined
        ? dto.practicalFullMarks
        : Number(existing.practicalFullMarks || 0)
      : null;
    const targetPracticalPass = targetHasPractical
      ? dto.practicalPassMarks !== undefined
        ? dto.practicalPassMarks
        : Number(existing.practicalPassMarks || 0)
      : null;

    if (targetHasPractical) {
      if (!targetPracticalFull || targetPracticalFull <= 0) {
        throw new BadRequestException(
          'practicalFullMarks must be specified and greater than 0 when hasPractical is true.',
        );
      }
      if (targetPracticalPass && targetPracticalPass > targetPracticalFull) {
        throw new BadRequestException(
          `practicalPassMarks (${targetPracticalPass}) cannot exceed practicalFullMarks (${targetPracticalFull}).`,
        );
      }
    }

    const targetHasCA =
      dto.hasContinuousAssessment !== undefined
        ? dto.hasContinuousAssessment
        : existing.hasContinuousAssessment;
    const targetCAFull = targetHasCA
      ? dto.continuousAssessmentFullMarks !== undefined
        ? dto.continuousAssessmentFullMarks
        : Number(existing.continuousAssessmentFullMarks || 0)
      : null;
    const targetCAPass = targetHasCA
      ? dto.continuousAssessmentPassMarks !== undefined
        ? dto.continuousAssessmentPassMarks
        : Number(existing.continuousAssessmentPassMarks || 0)
      : null;

    if (targetHasCA) {
      if (!targetCAFull || targetCAFull <= 0) {
        throw new BadRequestException(
          'continuousAssessmentFullMarks must be specified and greater than 0 when hasContinuousAssessment is true.',
        );
      }
      if (targetCAPass && targetCAPass > targetCAFull) {
        throw new BadRequestException(
          `continuousAssessmentPassMarks (${targetCAPass}) cannot exceed continuousAssessmentFullMarks (${targetCAFull}).`,
        );
      }
    }

    // 6. Verify component sum exact match
    if (
      targetHasWritten ||
      targetHasMcq ||
      targetHasPractical ||
      targetHasCA
    ) {
      const componentSum =
        (targetHasWritten ? Number(targetWrittenFull || 0) : 0) +
        (targetHasMcq ? Number(targetMcqFull || 0) : 0) +
        (targetHasPractical ? Number(targetPracticalFull || 0) : 0) +
        (targetHasCA ? Number(targetCAFull || 0) : 0);

      if (Math.abs(componentSum - targetFullMarks) > 0.001) {
        throw new BadRequestException(
          `The sum of component marks (${componentSum}) does not match the total fullMarks (${targetFullMarks}). Please adjust written, MCQ, practical, or continuous marks.`,
        );
      }
    }

    // 7. Update in database
    const updated = await this.prisma.examSubject.update({
      where: { id: subjectConfigId },
      data: {
        groupId: finalGroupId,
        fullMarks: targetFullMarks,
        passMarks: targetPassMarks,
        hasWritten: targetHasWritten,
        writtenFullMarks: targetWrittenFull,
        writtenPassMarks: targetWrittenPass,
        hasMcq: targetHasMcq,
        mcqFullMarks: targetMcqFull,
        mcqPassMarks: targetMcqPass,
        hasPractical: targetHasPractical,
        practicalFullMarks: targetPracticalFull,
        practicalPassMarks: targetPracticalPass,
        hasContinuousAssessment: targetHasCA,
        continuousAssessmentFullMarks: targetCAFull,
        continuousAssessmentPassMarks: targetCAPass,
        ...(dto.isOptional !== undefined ? { isOptional: dto.isOptional } : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
            paperNumber: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ResponseHelper.success(
      updated,
      `Exam subject '${updated.subject.name}' configuration updated successfully`,
    );
  }
}
