import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMarkDto } from './dto/create-mark.dto';
import { UpdateMarkDto } from './dto/update-mark.dto';
import {
  BulkCreateMarkDto,
  StudentMarkEntryItemDto,
} from './dto/bulk-create-mark.dto';
import { QueryGradeSheetDto } from './dto/query-grade-sheet.dto';
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

  /**
   * Get complete grade sheet table for a subject & section (For Teachers & Admins)
   */
  async getGradeSheet(query: QueryGradeSheetDto, currentUser: any) {
    const examSubject = await this.prisma.examSubject.findUnique({
      where: { id: query.examSubjectId },
      include: {
        subject: true,
        group: true,
        exam: {
          include: {
            academicYear: true,
            schoolClass: true,
          },
        },
      },
    });

    if (!examSubject) {
      throw new NotFoundException('Exam subject configuration not found');
    }

    const exam = examSubject.exam;
    if (exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    // Find class subject in curriculum
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
        'Class subject curriculum relation not found',
      );
    }

    // Determine allowed section IDs for this user
    let allowedSectionIds: string[] | null = null;
    if (!isAdmin) {
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

      const assignments = await this.prisma.teacherAssignment.findMany({
        where: {
          staffId,
          academicYearId: exam.academicYearId,
          classId: exam.classId,
          classSubjectId: classSubject.id,
          isActive: true,
        },
        select: { sectionId: true, canEnterMarks: true },
      });

      if (assignments.length === 0) {
        throw new ForbiddenException(
          `Access denied: You are not assigned to teach '${examSubject.subject.name}' for any section in class '${exam.schoolClass.name}'.`,
        );
      }

      allowedSectionIds = assignments.map((a) => a.sectionId);

      if (query.sectionId && !allowedSectionIds.includes(query.sectionId)) {
        throw new ForbiddenException(
          'You are not authorized to view or enter marks for this section.',
        );
      }
    }

    // Build filter for student enrollments
    const enrollmentWhere: any = {
      academicYearId: exam.academicYearId,
      classId: exam.classId,
      status: EnrollmentStatus.ACTIVE,
    };

    if (query.sectionId) {
      enrollmentWhere.sectionId = query.sectionId;
    } else if (allowedSectionIds) {
      enrollmentWhere.sectionId = { in: allowedSectionIds };
    }

    if (examSubject.groupId) {
      enrollmentWhere.groupId = examSubject.groupId;
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            nameEn: true,
            nameBn: true,
            gender: true,
          },
        },
        section: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ section: { name: 'asc' } }, { roll: 'asc' }],
    });

    // Fetch existing marks for these students in this exam subject
    const enrollmentIds = enrollments.map((e) => e.id);
    const existingMarks = await this.prisma.mark.findMany({
      where: {
        examSubjectId: query.examSubjectId,
        studentEnrollmentId: { in: enrollmentIds },
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const marksMap = new Map<string, any>();
    for (const m of existingMarks) {
      marksMap.set(m.studentEnrollmentId, m);
    }

    let marksEnteredCount = 0;
    let absentCount = 0;

    const studentRows = enrollments.map((e) => {
      const existing = marksMap.get(e.id);
      let markInfo = null;

      if (existing) {
        marksEnteredCount++;
        if (existing.isAbsent) {
          absentCount++;
        }
        markInfo = {
          id: existing.id,
          isAbsent: existing.isAbsent,
          writtenMarks: Number(existing.writtenMarks),
          mcqMarks: Number(existing.mcqMarks),
          practicalMarks: Number(existing.practicalMarks),
          continuousAssessmentMarks: Number(existing.continuousAssessmentMarks),
          totalMarks: Number(existing.totalMarks),
          isLocked: existing.isLocked,
          enteredBy: existing.creator?.name || 'System',
          updatedAt: existing.updatedAt,
        };
      }

      // 4th subject eligibility check
      const isOptionalEnrolled =
        examSubject.isOptional || classSubject.isOptional
          ? e.optionalClassSubjectId === classSubject.id
          : false;

      return {
        studentEnrollmentId: e.id,
        studentId: e.student.studentId,
        roll: e.roll,
        name: e.student.nameEn,
        nameBn: e.student.nameBn,
        gender: e.student.gender,
        section: e.section.name,
        sectionId: e.sectionId,
        group: e.group ? e.group.name : null,
        isOptionalSubject: examSubject.isOptional || classSubject.isOptional,
        isEnrolledOptional: isOptionalEnrolled,
        mark: markInfo,
      };
    });

    return ResponseHelper.success(
      {
        examination: {
          id: exam.id,
          name: exam.name,
          examType: exam.examType,
          status: exam.status,
          marksEntryDeadline: exam.marksEntryDeadline,
          isLocked: exam.isLocked,
          resultStatus: exam.resultStatus,
          academicYear: exam.academicYear.name,
          schoolClass: exam.schoolClass.name,
        },
        examSubject: {
          id: examSubject.id,
          subjectName: examSubject.subject.name,
          officialCode: examSubject.subject.officialCode,
          fullMarks: Number(examSubject.fullMarks),
          passMarks: Number(examSubject.passMarks),
          hasWritten: examSubject.hasWritten,
          writtenFullMarks: examSubject.writtenFullMarks
            ? Number(examSubject.writtenFullMarks)
            : null,
          hasMcq: examSubject.hasMcq,
          mcqFullMarks: examSubject.mcqFullMarks
            ? Number(examSubject.mcqFullMarks)
            : null,
          hasPractical: examSubject.hasPractical,
          practicalFullMarks: examSubject.practicalFullMarks
            ? Number(examSubject.practicalFullMarks)
            : null,
          hasContinuousAssessment: examSubject.hasContinuousAssessment,
          continuousAssessmentFullMarks: examSubject.continuousAssessmentFullMarks
            ? Number(examSubject.continuousAssessmentFullMarks)
            : null,
        },
        summary: {
          totalStudents: enrollments.length,
          marksEnteredCount,
          marksPendingCount: enrollments.length - marksEnteredCount,
          absentCount,
        },
        students: studentRows,
      },
      `Grade sheet for '${examSubject.subject.name}' retrieved successfully`,
    );
  }

  /**
   * Get all marks recorded for a specific student enrollment
   */
  async getStudentMarks(enrollmentId: string, examId?: string) {
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        schoolClass: true,
        academicYear: true,
        section: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    const whereClause: any = {
      studentEnrollmentId: enrollmentId,
    };

    if (examId) {
      whereClause.examSubject = {
        examId,
        exam: { isDeleted: false },
      };
    }

    const marks = await this.prisma.mark.findMany({
      where: whereClause,
      include: {
        examSubject: {
          include: {
            subject: true,
            exam: {
              select: {
                id: true,
                name: true,
                examType: true,
                status: true,
                resultStatus: true,
              },
            },
          },
        },
      },
      orderBy: [{ examSubject: { displayOrder: 'asc' } }],
    });

    return ResponseHelper.success(
      {
        student: {
          enrollmentId: enrollment.id,
          studentId: enrollment.student.studentId,
          name: enrollment.student.nameEn,
          roll: enrollment.roll,
          class: enrollment.schoolClass.name,
          section: enrollment.section.name,
          academicYear: enrollment.academicYear.name,
        },
        totalMarksRecords: marks.length,
        marks: marks.map((m) => ({
          id: m.id,
          examName: m.examSubject.exam.name,
          examType: m.examSubject.exam.examType,
          subjectName: m.examSubject.subject.name,
          officialCode: m.examSubject.subject.officialCode,
          fullMarks: Number(m.examSubject.fullMarks),
          passMarks: Number(m.examSubject.passMarks),
          writtenMarks: Number(m.writtenMarks),
          mcqMarks: Number(m.mcqMarks),
          practicalMarks: Number(m.practicalMarks),
          continuousAssessmentMarks: Number(m.continuousAssessmentMarks),
          totalMarks: Number(m.totalMarks),
          isAbsent: m.isAbsent,
          isLocked: m.isLocked,
        })),
      },
      `Marks for student '${enrollment.student.nameEn}' retrieved successfully`,
    );
  }

  /**
   * Get single mark entry details by ID
   */
  async getMarkById(id: string) {
    const mark = await this.prisma.mark.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: true,
            schoolClass: true,
            section: true,
            academicYear: true,
          },
        },
        examSubject: {
          include: {
            subject: true,
            exam: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!mark) {
      throw new NotFoundException('Mark entry record not found');
    }

    return ResponseHelper.success(
      {
        id: mark.id,
        isAbsent: mark.isAbsent,
        writtenMarks: Number(mark.writtenMarks),
        mcqMarks: Number(mark.mcqMarks),
        practicalMarks: Number(mark.practicalMarks),
        continuousAssessmentMarks: Number(mark.continuousAssessmentMarks),
        totalMarks: Number(mark.totalMarks),
        isLocked: mark.isLocked,
        enteredAt: mark.createdAt,
        updatedAt: mark.updatedAt,
        enteredBy: mark.creator,
        student: {
          enrollmentId: mark.enrollment.id,
          studentId: mark.enrollment.student.studentId,
          name: mark.enrollment.student.nameEn,
          roll: mark.enrollment.roll,
          class: mark.enrollment.schoolClass.name,
          section: mark.enrollment.section.name,
        },
        subject: {
          id: mark.examSubject.subject.id,
          name: mark.examSubject.subject.name,
          code: mark.examSubject.subject.officialCode,
          fullMarks: Number(mark.examSubject.fullMarks),
          passMarks: Number(mark.examSubject.passMarks),
        },
        exam: {
          id: mark.examSubject.exam.id,
          name: mark.examSubject.exam.name,
          examType: mark.examSubject.exam.examType,
          status: mark.examSubject.exam.status,
        },
      },
      'Mark entry details retrieved successfully',
    );
  }

  /**
   * Update mark entry with strict validation, teacher authorization, and score bounds
   */
  async updateMark(id: string, dto: UpdateMarkDto, currentUser: any) {
    const mark = await this.prisma.mark.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: true,
            section: true,
            schoolClass: true,
          },
        },
        examSubject: {
          include: {
            subject: true,
            exam: {
              include: {
                academicYear: true,
                schoolClass: true,
              },
            },
          },
        },
      },
    });

    if (!mark) {
      throw new NotFoundException('Mark entry record not found');
    }

    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    // 1. Mark lock check: If already locked, only admins can modify or unlock
    if (mark.isLocked && !isAdmin) {
      throw new BadRequestException(
        'This mark entry is locked. Only an administrator can unlock or modify it.',
      );
    }

    // 2. Lock permission check: Only admins can alter isLocked
    if (dto.isLocked !== undefined && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: Only administrators have permission to lock or unlock mark records.',
      );
    }

    const exam = mark.examSubject.exam;

    // 3. Operational status and deadline checks
    this.verifyExamOperationalStatus(exam, currentUser);

    // 4. Find curriculum classSubject
    const classSubject = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        subjectId: mark.examSubject.subjectId,
        isActive: true,
      },
    });

    if (!classSubject) {
      throw new BadRequestException(
        `Subject '${mark.examSubject.subject.name}' is not configured in this class curriculum.`,
      );
    }

    // 5. Verify teacher authorization for this section & subject
    await this.verifyTeacherPermission(
      currentUser,
      exam,
      mark.enrollment,
      classSubject,
      mark.examSubject,
    );

    // 6. Verify student subject eligibility
    this.verifyStudentSubjectEligibility(
      mark.enrollment,
      mark.examSubject,
      classSubject,
    );

    // 7. Calculate and validate component scores
    const effectiveAbsent =
      dto.isAbsent !== undefined ? dto.isAbsent : mark.isAbsent;

    let written = 0;
    let mcq = 0;
    let practical = 0;
    let ca = 0;
    let totalMarks = 0;

    if (effectiveAbsent) {
      // If student is absent, all component scores must be zero
      written = 0;
      mcq = 0;
      practical = 0;
      ca = 0;
      totalMarks = 0;
    } else {
      // Determine scores: new DTO value if specified, otherwise keep previous value
      written =
        dto.writtenMarks !== undefined
          ? Number(dto.writtenMarks)
          : Number(mark.writtenMarks);
      mcq =
        dto.mcqMarks !== undefined
          ? Number(dto.mcqMarks)
          : Number(mark.mcqMarks);
      practical =
        dto.practicalMarks !== undefined
          ? Number(dto.practicalMarks)
          : Number(mark.practicalMarks);
      ca =
        dto.continuousAssessmentMarks !== undefined
          ? Number(dto.continuousAssessmentMarks)
          : Number(mark.continuousAssessmentMarks);

      // Validate Written Component
      if (mark.examSubject.hasWritten) {
        const maxWritten = Number(mark.examSubject.writtenFullMarks || 0);
        if (written < 0 || written > maxWritten) {
          throw new BadRequestException(
            `Written marks (${written}) must be between 0 and maximum allowed (${maxWritten}).`,
          );
        }
      } else if (written > 0) {
        throw new BadRequestException(
          `Subject '${mark.examSubject.subject.name}' does not have a written component.`,
        );
      }

      // Validate MCQ Component
      if (mark.examSubject.hasMcq) {
        const maxMcq = Number(mark.examSubject.mcqFullMarks || 0);
        if (mcq < 0 || mcq > maxMcq) {
          throw new BadRequestException(
            `MCQ marks (${mcq}) must be between 0 and maximum allowed (${maxMcq}).`,
          );
        }
      } else if (mcq > 0) {
        throw new BadRequestException(
          `Subject '${mark.examSubject.subject.name}' does not have an MCQ component.`,
        );
      }

      // Validate Practical Component
      if (mark.examSubject.hasPractical) {
        const maxPractical = Number(mark.examSubject.practicalFullMarks || 0);
        if (practical < 0 || practical > maxPractical) {
          throw new BadRequestException(
            `Practical marks (${practical}) must be between 0 and maximum allowed (${maxPractical}).`,
          );
        }
      } else if (practical > 0) {
        throw new BadRequestException(
          `Subject '${mark.examSubject.subject.name}' does not have a practical component.`,
        );
      }

      // Validate Continuous Assessment Component
      if (mark.examSubject.hasContinuousAssessment) {
        const maxCA = Number(
          mark.examSubject.continuousAssessmentFullMarks || 0,
        );
        if (ca < 0 || ca > maxCA) {
          throw new BadRequestException(
            `Continuous assessment marks (${ca}) must be between 0 and maximum allowed (${maxCA}).`,
          );
        }
      } else if (ca > 0) {
        throw new BadRequestException(
          `Subject '${mark.examSubject.subject.name}' does not have continuous assessment.`,
        );
      }

      totalMarks = written + mcq + practical + ca;
      const maxSubjectTotal = Number(mark.examSubject.fullMarks);

      if (totalMarks > maxSubjectTotal) {
        throw new BadRequestException(
          `Calculated total marks (${totalMarks}) cannot exceed subject full marks (${maxSubjectTotal}).`,
        );
      }
    }

    // 8. Persist the updated mark record
    const updated = await this.prisma.mark.update({
      where: { id },
      data: {
        isAbsent: effectiveAbsent,
        writtenMarks: written,
        mcqMarks: mcq,
        practicalMarks: practical,
        continuousAssessmentMarks: ca,
        totalMarks,
        ...(dto.isLocked !== undefined && isAdmin
          ? { isLocked: dto.isLocked }
          : {}),
        enteredBy: currentUser.id,
      },
      include: {
        enrollment: {
          include: {
            student: true,
            section: true,
            schoolClass: true,
          },
        },
        examSubject: {
          include: {
            subject: true,
            exam: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return ResponseHelper.success(
      {
        id: updated.id,
        student: {
          enrollmentId: updated.enrollment.id,
          studentId: updated.enrollment.student.studentId,
          name: updated.enrollment.student.nameEn,
          roll: updated.enrollment.roll,
          section: updated.enrollment.section.name,
          class: updated.enrollment.schoolClass.name,
        },
        subject: {
          id: updated.examSubject.subject.id,
          name: updated.examSubject.subject.name,
          code: updated.examSubject.subject.officialCode,
          fullMarks: Number(updated.examSubject.fullMarks),
          passMarks: Number(updated.examSubject.passMarks),
        },
        isAbsent: updated.isAbsent,
        writtenMarks: Number(updated.writtenMarks),
        mcqMarks: Number(updated.mcqMarks),
        practicalMarks: Number(updated.practicalMarks),
        continuousAssessmentMarks: Number(updated.continuousAssessmentMarks),
        totalMarks: Number(updated.totalMarks),
        isLocked: updated.isLocked,
        updatedAt: updated.updatedAt,
        updatedBy: updated.creator?.name || 'System',
      },
      'Mark entry updated successfully',
    );
  }

  /**
   * Lock or unlock a mark entry (Admins only)
   */
  async toggleMarkLock(id: string, isLocked: boolean, currentUser: any) {
    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    if (!isAdmin) {
      throw new ForbiddenException(
        'Access denied: Only administrators can lock or unlock mark records.',
      );
    }

    const mark = await this.prisma.mark.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
        examSubject: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!mark) {
      throw new NotFoundException('Mark entry record not found');
    }

    const updated = await this.prisma.mark.update({
      where: { id },
      data: { isLocked },
    });

    return ResponseHelper.success(
      {
        id: updated.id,
        isLocked: updated.isLocked,
        studentName: mark.enrollment.student.nameEn,
        subject: mark.examSubject.subject.name,
      },
      `Mark entry ${isLocked ? 'locked' : 'unlocked'} successfully`,
    );
  }

  /**
   * Delete / Reset a mark entry (Admin only with strict safeguards)
   */
  async deleteMark(id: string, currentUser: any) {
    const roles: string[] = currentUser.roles || [];
    const isAdmin =
      roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    if (!isAdmin) {
      throw new ForbiddenException(
        'Access denied: Only administrators are permitted to delete or reset mark records.',
      );
    }

    const mark = await this.prisma.mark.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            student: true,
            section: true,
            schoolClass: true,
          },
        },
        examSubject: {
          include: {
            subject: true,
            exam: true,
          },
        },
      },
    });

    if (!mark) {
      throw new NotFoundException('Mark entry record not found');
    }

    const exam = mark.examSubject.exam;

    // 1. Published Results Guard
    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot delete mark record. Results for examination '${exam.name}' have already been published.`,
      );
    }

    // 2. Exam Locked Guard
    if (exam.isLocked) {
      throw new BadRequestException(
        `Cannot delete mark record. Examination '${exam.name}' is currently locked.`,
      );
    }

    // 3. Mark Locked Guard
    if (mark.isLocked) {
      throw new BadRequestException(
        'This mark entry is currently locked. You must explicitly unlock the mark entry before it can be deleted.',
      );
    }

    // 4. Exam Status Guard
    if (exam.status === ExamStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete marks for cancelled examination '${exam.name}'.`,
      );
    }

    // 5. Check if formal subject result was already calculated for this student & subject
    const existingSubjectResult =
      await this.prisma.studentSubjectResult.findFirst({
        where: {
          examSubjectId: mark.examSubjectId,
          studentEnrollmentId: mark.studentEnrollmentId,
        },
      });

    if (existingSubjectResult) {
      throw new BadRequestException(
        'Cannot delete mark record because formal subject results have already been generated for this student. Reset results first.',
      );
    }

    // Delete the mark record
    await this.prisma.mark.delete({
      where: { id },
    });

    return ResponseHelper.success(
      {
        id: mark.id,
        deletedAt: new Date(),
        student: {
          enrollmentId: mark.enrollment.id,
          studentId: mark.enrollment.student.studentId,
          name: mark.enrollment.student.nameEn,
          roll: mark.enrollment.roll,
          class: mark.enrollment.schoolClass.name,
          section: mark.enrollment.section.name,
        },
        subject: {
          name: mark.examSubject.subject.name,
          code: mark.examSubject.subject.officialCode,
        },
        exam: {
          id: exam.id,
          name: exam.name,
        },
        deletedScore: {
          totalMarks: Number(mark.totalMarks),
          writtenMarks: Number(mark.writtenMarks),
          mcqMarks: Number(mark.mcqMarks),
          practicalMarks: Number(mark.practicalMarks),
          continuousAssessmentMarks: Number(mark.continuousAssessmentMarks),
          isAbsent: mark.isAbsent,
        },
      },
      `Mark entry for '${mark.enrollment.student.nameEn}' in '${mark.examSubject.subject.name}' has been permanently deleted and reset.`,
    );
  }
}
