import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamSubjectDto } from './dto/create-exam-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ExamStatus,
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
}
