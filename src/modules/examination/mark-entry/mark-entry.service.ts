import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMarkDto } from './dto/create-mark.dto';
import {
  BulkCreateMarkDto,
  StudentMarkEntryItemDto,
} from './dto/bulk-create-mark.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  EnrollmentStatus,
  ExamStatus,
  ResultPublicationStatus,
} from '../../../../prisma/generated/client';

@Injectable()
export class MarkEntryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enter or update mark for a single student with strict teacher authorization & score bounds
   */
  async createSingleMark(dto: CreateMarkDto, currentUser: any) {
    const { examSubject, exam, enrollment, classSubject } =
      await this.validateAndFetchEntities(
        dto.examSubjectId,
        dto.studentEnrollmentId,
      );

    // 1. Verify Teacher Assignment / Authorization
    await this.verifyTeacherPermission(
      currentUser,
      exam,
      enrollment,
      classSubject,
      examSubject,
    );

    // 2. Validate Student Subject Eligibility (Group & 4th/Optional subject)
    this.verifyStudentSubjectEligibility(enrollment, examSubject, classSubject);

    // 3. Check Existing Mark Lock Guard
    const existingMark = await this.prisma.mark.findUnique({
      where: {
        studentEnrollmentId_examSubjectId: {
          studentEnrollmentId: dto.studentEnrollmentId,
          examSubjectId: dto.examSubjectId,
        },
      },
    });

    if (existingMark?.isLocked) {
      throw new BadRequestException(
        `Marks for student roll ${enrollment.roll} (${enrollment.student.nameEn}) are locked and cannot be modified.`,
      );
    }

    // 4. Validate and calculate marks breakdown
    const marksData = this.calculateAndValidateComponentScores(
      dto,
      examSubject,
    );

    // 5. Upsert Mark in Database with Audit
    const savedMark = await this.prisma.mark.upsert({
      where: {
        studentEnrollmentId_examSubjectId: {
          studentEnrollmentId: dto.studentEnrollmentId,
          examSubjectId: dto.examSubjectId,
        },
      },
      create: {
        studentEnrollmentId: dto.studentEnrollmentId,
        examSubjectId: dto.examSubjectId,
        isAbsent: marksData.isAbsent,
        writtenMarks: marksData.writtenMarks,
        mcqMarks: marksData.mcqMarks,
        practicalMarks: marksData.practicalMarks,
        continuousAssessmentMarks: marksData.continuousAssessmentMarks,
        totalMarks: marksData.totalMarks,
        isLocked: false,
        enteredBy: currentUser.id,
      },
      update: {
        isAbsent: marksData.isAbsent,
        writtenMarks: marksData.writtenMarks,
        mcqMarks: marksData.mcqMarks,
        practicalMarks: marksData.practicalMarks,
        continuousAssessmentMarks: marksData.continuousAssessmentMarks,
        totalMarks: marksData.totalMarks,
        enteredBy: currentUser.id,
      },
      include: {
        enrollment: {
          select: {
            id: true,
            roll: true,
            student: { select: { id: true, nameEn: true, studentId: true } },
            section: { select: { id: true, name: true } },
          },
        },
        examSubject: {
          select: {
            id: true,
            fullMarks: true,
            subject: { select: { id: true, name: true, officialCode: true } },
          },
        },
      },
    });

    return ResponseHelper.created(
      savedMark,
      `Mark recorded successfully for roll ${enrollment.roll} in subject '${examSubject.subject.name}'`,
    );
  }

  /**
   * Bulk enter / save marks for an entire class or section atomically
   */
  async createBulkMarks(dto: BulkCreateMarkDto, currentUser: any) {
    if (!dto.marks || dto.marks.length === 0) {
      throw new BadRequestException('At least one student mark entry is required.');
    }

    // Fetch ExamSubject, Exam, and ClassSubject
    const examSubject = await this.prisma.examSubject.findUnique({
      where: { id: dto.examSubjectId },
      include: {
        exam: true,
        subject: true,
      },
    });

    if (!examSubject) {
      throw new NotFoundException('Exam subject configuration not found');
    }

    const exam = examSubject.exam;
    if (exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    // Global Exam Guards
    this.verifyExamOperationalStatus(exam, currentUser);

    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        subjectId: examSubject.subjectId,
        isActive: true,
      },
    });

    if (!classSubject) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' is not configured in this class curriculum.`,
      );
    }

    // Process all entries in a database transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      const verifiedSections = new Set<string>();

      for (const item of dto.marks) {
        // Fetch student enrollment
        const enrollment = await tx.studentEnrollment.findUnique({
          where: { id: item.studentEnrollmentId },
          include: {
            student: { select: { id: true, nameEn: true, studentId: true } },
            section: { select: { id: true, name: true } },
          },
        });

        if (!enrollment) {
          throw new NotFoundException(
            `Student enrollment '${item.studentEnrollmentId}' not found.`,
          );
        }

        if (enrollment.status !== EnrollmentStatus.ACTIVE) {
          throw new BadRequestException(
            `Cannot enter mark for inactive/dropped student roll ${enrollment.roll}.`,
          );
        }

        if (
          enrollment.academicYearId !== exam.academicYearId ||
          enrollment.classId !== exam.classId
        ) {
          throw new BadRequestException(
            `Student roll ${enrollment.roll} does not belong to the exam's class or academic year.`,
          );
        }

        if (dto.sectionId && enrollment.sectionId !== dto.sectionId) {
          throw new BadRequestException(
            `Student roll ${enrollment.roll} belongs to section '${enrollment.section.name}', not the selected batch section.`,
          );
        }

        // Verify teacher permission for this section (cached check per section)
        if (!verifiedSections.has(enrollment.sectionId)) {
          await this.verifyTeacherPermission(
            currentUser,
            exam,
            enrollment,
            classSubject,
            examSubject,
          );
          verifiedSections.add(enrollment.sectionId);
        }

        // Student subject eligibility check
        this.verifyStudentSubjectEligibility(enrollment, examSubject, classSubject);

        // Check Existing Mark Lock Guard
        const existing = await tx.mark.findUnique({
          where: {
            studentEnrollmentId_examSubjectId: {
              studentEnrollmentId: item.studentEnrollmentId,
              examSubjectId: dto.examSubjectId,
            },
          },
        });

        if (existing?.isLocked) {
          throw new BadRequestException(
            `Marks for roll ${enrollment.roll} are locked and cannot be updated.`,
          );
        }

        // Validate and compute scores
        const scores = this.calculateAndValidateComponentScores(item, examSubject);

        if (existing) {
          await tx.mark.update({
            where: { id: existing.id },
            data: {
              isAbsent: scores.isAbsent,
              writtenMarks: scores.writtenMarks,
              mcqMarks: scores.mcqMarks,
              practicalMarks: scores.practicalMarks,
              continuousAssessmentMarks: scores.continuousAssessmentMarks,
              totalMarks: scores.totalMarks,
              enteredBy: currentUser.id,
            },
          });
          updatedCount++;
        } else {
          await tx.mark.create({
            data: {
              studentEnrollmentId: item.studentEnrollmentId,
              examSubjectId: dto.examSubjectId,
              isAbsent: scores.isAbsent,
              writtenMarks: scores.writtenMarks,
              mcqMarks: scores.mcqMarks,
              practicalMarks: scores.practicalMarks,
              continuousAssessmentMarks: scores.continuousAssessmentMarks,
              totalMarks: scores.totalMarks,
              isLocked: false,
              enteredBy: currentUser.id,
            },
          });
          createdCount++;
        }
      }

      return {
        totalProcessed: dto.marks.length,
        createdCount,
        updatedCount,
      };
    });

    return ResponseHelper.created(
      result,
      `Successfully processed ${result.totalProcessed} student mark(s) for '${examSubject.subject.name}' (Created: ${result.createdCount}, Updated: ${result.updatedCount})`,
    );
  }

  /**
   * Helper: Validates entity existence and returns relevant records
   */
  private async validateAndFetchEntities(
    examSubjectId: string,
    studentEnrollmentId: string,
  ) {
    const examSubject = await this.prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: {
        exam: true,
        subject: true,
      },
    });

    if (!examSubject) {
      throw new NotFoundException('Exam subject configuration not found');
    }

    const exam = examSubject.exam;
    if (exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: studentEnrollmentId },
      include: {
        student: { select: { id: true, nameEn: true, studentId: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot enter mark for inactive/dropped student roll ${enrollment.roll}.`,
      );
    }

    if (
      enrollment.academicYearId !== exam.academicYearId ||
      enrollment.classId !== exam.classId
    ) {
      throw new BadRequestException(
        `Student roll ${enrollment.roll} does not belong to the exam's class or academic year.`,
      );
    }

    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        subjectId: examSubject.subjectId,
        isActive: true,
      },
    });

    if (!classSubject) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' is not configured in this class curriculum.`,
      );
    }

    return { examSubject, exam, enrollment, classSubject };
  }

  /**
   * Helper: Validates exam operational status & deadlines
   */
  private verifyExamOperationalStatus(exam: any, currentUser: any) {
    if (exam.isLocked) {
      throw new BadRequestException(
        `Examination '${exam.name}' is locked. Marks cannot be entered or modified.`,
      );
    }

    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Results for examination '${exam.name}' have already been published. Marks cannot be altered.`,
      );
    }

    if (exam.status === ExamStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot enter marks for cancelled examination '${exam.name}'.`,
      );
    }

    // Deadline check
    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    if (exam.marksEntryDeadline && !isAdmin) {
      const now = new Date();
      if (now > exam.marksEntryDeadline) {
        const deadlineStr = exam.marksEntryDeadline
          .toISOString()
          .split('T')[0];
        throw new BadRequestException(
          `The deadline for entering marks (${deadlineStr}) has passed. Contact the administrator.`,
        );
      }
    }
  }

  /**
   * Helper: Verifies that the current user has assigned teaching rights to this section & subject
   */
  private async verifyTeacherPermission(
    currentUser: any,
    exam: any,
    enrollment: any,
    classSubject: any,
    examSubject: any,
  ) {
    this.verifyExamOperationalStatus(exam, currentUser);

    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    // Admins have universal marks entry rights
    if (isAdmin) {
      return;
    }

    // Retrieve staff profile linked to this user
    let staffId = currentUser.staff?.id;
    if (!staffId) {
      const staff = await this.prisma.staff.findUnique({
        where: { userId: currentUser.id },
      });
      if (!staff) {
        throw new ForbiddenException(
          'You do not have a teacher/staff profile linked to your user account.',
        );
      }
      staffId = staff.id;
    }

    // Look for active teacher assignment for this class, section, and subject
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        staffId,
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        sectionId: enrollment.sectionId,
        classSubjectId: classSubject.id,
        isActive: true,
        canEnterMarks: true,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        `Access denied: You are not assigned to teach '${examSubject.subject.name}' for section '${enrollment.section.name}', or your permission to enter marks has been revoked.`,
      );
    }
  }

  /**
   * Helper: Verifies whether the student is eligible to take this exam subject (Group and 4th subject)
   */
  private verifyStudentSubjectEligibility(
    enrollment: any,
    examSubject: any,
    classSubject: any,
  ) {
    // 1. Group match check
    if (examSubject.groupId) {
      if (!enrollment.groupId || enrollment.groupId !== examSubject.groupId) {
        throw new BadRequestException(
          `Student roll ${enrollment.roll} belongs to a different academic group and is not eligible for subject '${examSubject.subject.name}'.`,
        );
      }
    }

    // 2. 4th / Optional subject enrollment check
    if (examSubject.isOptional || classSubject.isOptional) {
      if (
        enrollment.optionalClassSubjectId &&
        enrollment.optionalClassSubjectId !== classSubject.id
      ) {
        throw new BadRequestException(
          `Student roll ${enrollment.roll} selected a different optional/4th subject. They cannot receive marks in '${examSubject.subject.name}'.`,
        );
      }
    }
  }

  /**
   * Helper: Calculates and validates score components against ExamSubject full marks
   */
  private calculateAndValidateComponentScores(
    dto: StudentMarkEntryItemDto | CreateMarkDto,
    examSubject: any,
  ) {
    if (dto.isAbsent) {
      return {
        isAbsent: true,
        writtenMarks: 0,
        mcqMarks: 0,
        practicalMarks: 0,
        continuousAssessmentMarks: 0,
        totalMarks: 0,
      };
    }

    let written = 0;
    let mcq = 0;
    let practical = 0;
    let ca = 0;

    // Written Component
    if (examSubject.hasWritten) {
      written = Number(dto.writtenMarks || 0);
      const maxWritten = Number(examSubject.writtenFullMarks || 0);
      if (written < 0 || written > maxWritten) {
        throw new BadRequestException(
          `Written marks (${written}) must be between 0 and maximum allowed (${maxWritten}).`,
        );
      }
    } else if (dto.writtenMarks && Number(dto.writtenMarks) > 0) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' does not have a written component.`,
      );
    }

    // MCQ Component
    if (examSubject.hasMcq) {
      mcq = Number(dto.mcqMarks || 0);
      const maxMcq = Number(examSubject.mcqFullMarks || 0);
      if (mcq < 0 || mcq > maxMcq) {
        throw new BadRequestException(
          `MCQ marks (${mcq}) must be between 0 and maximum allowed (${maxMcq}).`,
        );
      }
    } else if (dto.mcqMarks && Number(dto.mcqMarks) > 0) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' does not have an MCQ component.`,
      );
    }

    // Practical Component
    if (examSubject.hasPractical) {
      practical = Number(dto.practicalMarks || 0);
      const maxPractical = Number(examSubject.practicalFullMarks || 0);
      if (practical < 0 || practical > maxPractical) {
        throw new BadRequestException(
          `Practical marks (${practical}) must be between 0 and maximum allowed (${maxPractical}).`,
        );
      }
    } else if (dto.practicalMarks && Number(dto.practicalMarks) > 0) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' does not have a practical component.`,
      );
    }

    // Continuous Assessment Component
    if (examSubject.hasContinuousAssessment) {
      ca = Number(dto.continuousAssessmentMarks || 0);
      const maxCA = Number(examSubject.continuousAssessmentFullMarks || 0);
      if (ca < 0 || ca > maxCA) {
        throw new BadRequestException(
          `Continuous assessment marks (${ca}) must be between 0 and maximum allowed (${maxCA}).`,
        );
      }
    } else if (
      dto.continuousAssessmentMarks &&
      Number(dto.continuousAssessmentMarks) > 0
    ) {
      throw new BadRequestException(
        `Subject '${examSubject.subject.name}' does not have continuous assessment.`,
      );
    }

    const totalMarks = written + mcq + practical + ca;
    const maxSubjectTotal = Number(examSubject.fullMarks);

    if (totalMarks > maxSubjectTotal) {
      throw new BadRequestException(
        `Calculated total marks (${totalMarks}) cannot exceed subject fullMarks (${maxSubjectTotal}).`,
      );
    }

    return {
      isAbsent: false,
      writtenMarks: written,
      mcqMarks: mcq,
      practicalMarks: practical,
      continuousAssessmentMarks: ca,
      totalMarks,
    };
  }
}
