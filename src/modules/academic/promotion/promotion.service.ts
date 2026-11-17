import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PreviewPromotionDto } from './dto/preview-promotion.dto';
import { BulkPromotionDto } from './dto/bulk-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import { GraduateBatchDto } from './dto/graduate-batch.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { Prisma } from '../../../../prisma/generated/client';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Preview promotion eligibility and suggested roll/class assignments
   * for students in an academic year, class, and optional section.
   */
  async previewPromotion(dto: PreviewPromotionDto) {
    // 1. Verify source academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });
    if (!academicYear) {
      throw new NotFoundException(
        `Academic Year with ID '${dto.academicYearId}' not found`,
      );
    }

    // 2. Verify source class exists
    const sourceClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
      select: { id: true, name: true, numericValue: true },
    });
    if (!sourceClass) {
      throw new NotFoundException(`Class with ID '${dto.classId}' not found`);
    }

    // 3. Verify section if provided
    let sourceSection: { id: string; name: string } | null = null;
    if (dto.sectionId) {
      sourceSection = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, classId: dto.classId },
        select: { id: true, name: true },
      });
      if (!sourceSection) {
        throw new BadRequestException(
          `Section with ID '${dto.sectionId}' does not belong to Class '${sourceClass.name}'`,
        );
      }
    }

    // 4. Find the next sequential class (numericValue + 1)
    const nextClass = await this.prisma.schoolClass.findUnique({
      where: { numericValue: sourceClass.numericValue + 1 },
      select: { id: true, name: true, numericValue: true },
    });

    const isGraduatingClass = !nextClass;
    const requiresGroupSelection = nextClass ? nextClass.numericValue >= 9 : false;

    // 5. Find next chronological academic year (starting after current one)
    const nextAcademicYear = await this.prisma.academicYear.findFirst({
      where: {
        startDate: {
          gt: academicYear.startDate,
        },
      },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    // 6. Resolve final/annual exam (specified or auto-detected published ANNUAL exam)
    let exam: {
      id: string;
      name: string;
      examType: string;
      resultStatus: string;
      publishedAt: Date | null;
    } | null = null;

    if (dto.examId) {
      exam = await this.prisma.exam.findFirst({
        where: {
          id: dto.examId,
          academicYearId: dto.academicYearId,
          classId: dto.classId,
        },
        select: {
          id: true,
          name: true,
          examType: true,
          resultStatus: true,
          publishedAt: true,
        },
      });
      if (!exam) {
        throw new NotFoundException(
          `Exam with ID '${dto.examId}' not found for this class and academic year`,
        );
      }
    } else {
      // Auto-detect published ANNUAL exam
      exam = await this.prisma.exam.findFirst({
        where: {
          academicYearId: dto.academicYearId,
          classId: dto.classId,
          examType: 'ANNUAL',
          resultStatus: 'PUBLISHED',
        },
        select: {
          id: true,
          name: true,
          examType: true,
          resultStatus: true,
          publishedAt: true,
        },
      });
    }

    // 7. Query active enrollments for this class/section
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            gender: true,
            photo: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        resultSummaries: exam
          ? {
              where: { examId: exam.id },
              select: {
                id: true,
                totalMarks: true,
                gpa: true,
                letterGrade: true,
                meritPosition: true,
                sectionMeritPosition: true,
                failedSubjectCount: true,
                resultStatus: true,
              },
            }
          : false,
      },
      orderBy: [{ roll: 'asc' }],
    });

    // 8. Process each student and determine eligibility
    let passedCount = 0;
    let failedCount = 0;
    let eligibleForPromotion = 0;
    let mustRepeat = 0;

    const studentList = enrollments.map((enr) => {
      const summary = enr.resultSummaries && enr.resultSummaries.length > 0
        ? enr.resultSummaries[0]
        : null;

      let status = 'ELIGIBLE';
      let suggestedAction: 'PROMOTE' | 'REPEAT' | 'COMPLETE' | 'MANUAL_REVIEW' = 'PROMOTE';
      let suggestedRoll = enr.roll;
      let reason = 'Ready for promotion';

      if (summary) {
        if (summary.resultStatus === 'PASS') {
          passedCount++;
          eligibleForPromotion++;
          if (isGraduatingClass) {
            suggestedAction = 'COMPLETE';
            reason = `Graduated with GPA ${summary.gpa?.toString() || 'N/A'} (${summary.letterGrade || 'Pass'})`;
          } else {
            suggestedAction = 'PROMOTE';
            reason = `Passed with GPA ${summary.gpa?.toString() || 'N/A'} (${summary.letterGrade || 'Pass'})`;
          }

          // Suggest new roll based on merit if available
          if (dto.sectionId && summary.sectionMeritPosition) {
            suggestedRoll = summary.sectionMeritPosition;
          } else if (summary.meritPosition) {
            suggestedRoll = summary.meritPosition;
          }
        } else if (summary.resultStatus === 'FAIL') {
          failedCount++;
          mustRepeat++;
          status = 'NOT_ELIGIBLE';
          suggestedAction = 'REPEAT';
          reason = `Failed in ${summary.failedSubjectCount} subject(s)`;
        } else {
          status = 'PENDING';
          suggestedAction = 'MANUAL_REVIEW';
          reason = 'Annual result incomplete or under review';
        }
      } else {
        // No exam summary available
        if (isGraduatingClass) {
          suggestedAction = 'COMPLETE';
          reason = 'Class 10 completed; ready for graduation';
        } else {
          eligibleForPromotion++;
          reason = 'No annual exam attached; manual promotion preview';
        }
      }

      return {
        enrollmentId: enr.id,
        studentId: enr.student.id,
        studentCustomId: enr.student.studentId,
        studentName: enr.student.name,
        gender: enr.student.gender,
        photo: enr.student.photo,
        currentSection: enr.section,
        currentGroup: enr.group,
        currentRoll: enr.roll,
        isRepeater: enr.isRepeater,
        examResult: summary
          ? {
              resultSummaryId: summary.id,
              totalMarks: Number(summary.totalMarks),
              gpa: summary.gpa ? Number(summary.gpa) : null,
              letterGrade: summary.letterGrade,
              meritPosition: summary.meritPosition,
              sectionMeritPosition: summary.sectionMeritPosition,
              failedSubjectCount: summary.failedSubjectCount,
              resultStatus: summary.resultStatus,
            }
          : null,
        promotionEligibility: {
          status,
          suggestedAction,
          suggestedRoll,
          reason,
        },
      };
    });

    // Sort students: Passed/Eligible by suggestedRoll, then Repeaters/Incomplete
    studentList.sort((a, b) => {
      const orderMap: Record<string, number> = {
        PROMOTE: 1,
        COMPLETE: 1,
        MANUAL_REVIEW: 2,
        REPEAT: 3,
      };
      const orderA = orderMap[a.promotionEligibility.suggestedAction] || 4;
      const orderB = orderMap[b.promotionEligibility.suggestedAction] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return a.promotionEligibility.suggestedRoll - b.promotionEligibility.suggestedRoll;
    });

    const result = {
      source: {
        academicYear,
        class: sourceClass,
        section: sourceSection,
      },
      target: {
        nextAcademicYear,
        nextClass,
        isGraduatingClass,
        requiresGroupSelection,
      },
      exam: exam
        ? {
            id: exam.id,
            name: exam.name,
            examType: exam.examType,
            resultStatus: exam.resultStatus,
            publishedAt: exam.publishedAt,
          }
        : null,
      summary: {
        totalStudents: enrollments.length,
        passedCount,
        failedCount,
        eligibleForPromotion,
        mustRepeat,
      },
      students: studentList,
    };

    return ResponseHelper.success(
      result,
      'Promotion preview generated successfully',
    );
  }

  /**
   * Promote an entire section of students in bulk using published Annual Exam ResultSummaries
   * within an atomic database transaction.
   *
   * - Passed students are promoted to target class & section with sequential merit rolls (1, 2, 3...)
   * - Failed students are enrolled in the target year as repeaters in the source class & section
   * - All source enrollments are marked as PROMOTED
   * - StudentPromotion audit entries are generated for every student
   */
  async promoteBulkStudents(dto: BulkPromotionDto) {
    // 1. Validate Academic Years
    if (dto.sourceAcademicYearId === dto.targetAcademicYearId) {
      throw new BadRequestException(
        'Source and Target Academic Years must be different for year-end promotion',
      );
    }

    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.academicYear.findUnique({
        where: { id: dto.sourceAcademicYearId },
        select: { id: true, name: true, startDate: true },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: dto.targetAcademicYearId },
        select: { id: true, name: true, startDate: true },
      }),
    ]);

    if (!sourceYear) {
      throw new NotFoundException(
        `Source Academic Year with ID '${dto.sourceAcademicYearId}' not found`,
      );
    }
    if (!targetYear) {
      throw new NotFoundException(
        `Target Academic Year with ID '${dto.targetAcademicYearId}' not found`,
      );
    }

    // 2. Validate Classes
    const [sourceClass, targetClass] = await Promise.all([
      this.prisma.schoolClass.findUnique({
        where: { id: dto.sourceClassId },
        select: { id: true, name: true, numericValue: true },
      }),
      this.prisma.schoolClass.findUnique({
        where: { id: dto.targetClassId },
        select: { id: true, name: true, numericValue: true },
      }),
    ]);

    if (!sourceClass) {
      throw new NotFoundException(
        `Source Class with ID '${dto.sourceClassId}' not found`,
      );
    }
    if (!targetClass) {
      throw new NotFoundException(
        `Target Class with ID '${dto.targetClassId}' not found`,
      );
    }

    if (targetClass.numericValue !== sourceClass.numericValue + 1) {
      throw new BadRequestException(
        `Target Class '${targetClass.name}' must be exactly the next level after Source Class '${sourceClass.name}'`,
      );
    }

    // 3. Validate Sections
    const [sourceSection, targetSection] = await Promise.all([
      this.prisma.section.findFirst({
        where: { id: dto.sourceSectionId, classId: dto.sourceClassId },
        select: { id: true, name: true },
      }),
      this.prisma.section.findFirst({
        where: { id: dto.targetSectionId, classId: dto.targetClassId },
        select: { id: true, name: true },
      }),
    ]);

    if (!sourceSection) {
      throw new BadRequestException(
        `Source Section does not belong to Source Class '${sourceClass.name}'`,
      );
    }
    if (!targetSection) {
      throw new BadRequestException(
        `Target Section does not belong to Target Class '${targetClass.name}'`,
      );
    }

    // 4. Resolve Annual Exam with published results
    let exam: { id: string; name: string } | null = null;
    if (dto.examId) {
      exam = await this.prisma.exam.findFirst({
        where: {
          id: dto.examId,
          academicYearId: dto.sourceAcademicYearId,
          classId: dto.sourceClassId,
          resultStatus: 'PUBLISHED',
        },
        select: { id: true, name: true },
      });
      if (!exam) {
        throw new NotFoundException(
          `Published Exam with ID '${dto.examId}' not found for source class and academic year`,
        );
      }
    } else {
      exam = await this.prisma.exam.findFirst({
        where: {
          academicYearId: dto.sourceAcademicYearId,
          classId: dto.sourceClassId,
          examType: 'ANNUAL',
          resultStatus: 'PUBLISHED',
        },
        select: { id: true, name: true },
      });
      if (!exam) {
        throw new BadRequestException(
          `No published ANNUAL examination found for '${sourceClass.name}' in academic year '${sourceYear.name}'. Published exam results are required for automated bulk promotion.`,
        );
      }
    }

    // 5. Fetch Active Enrollments with their ResultSummary for this exam
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: dto.sourceAcademicYearId,
        classId: dto.sourceClassId,
        sectionId: dto.sourceSectionId,
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            gender: true,
          },
        },
        resultSummaries: {
          where: { examId: exam.id },
          select: {
            id: true,
            totalMarks: true,
            gpa: true,
            letterGrade: true,
            meritPosition: true,
            sectionMeritPosition: true,
            failedSubjectCount: true,
            resultStatus: true,
          },
        },
      },
      orderBy: { roll: 'asc' },
    });

    if (enrollments.length === 0) {
      throw new NotFoundException(
        `No active students found in '${sourceClass.name} - ${sourceSection.name}' for academic year '${sourceYear.name}'`,
      );
    }

    // 6. Check if any student is already enrolled in the target academic year
    const studentIds = enrollments.map((e) => e.studentId);
    const existingTargetEnrollments =
      await this.prisma.studentEnrollment.findMany({
        where: {
          academicYearId: dto.targetAcademicYearId,
          studentId: { in: studentIds },
        },
        include: {
          student: { select: { name: true, studentId: true } },
        },
      });

    if (existingTargetEnrollments.length > 0) {
      const conflictNames = existingTargetEnrollments
        .map((e) => `${e.student.name} (${e.student.studentId})`)
        .join(', ');
      throw new ConflictException(
        `The following students already have an enrollment in target academic year '${targetYear.name}': ${conflictNames}`,
      );
    }

    // 7. Check if any of these enrollments was already promoted
    const fromEnrollmentIds = enrollments.map((e) => e.id);
    const existingPromotions = await this.prisma.studentPromotion.findMany({
      where: { fromEnrollmentId: { in: fromEnrollmentIds } },
      include: { student: { select: { name: true } } },
    });
    if (existingPromotions.length > 0) {
      const alreadyPromotedNames = existingPromotions
        .map((p) => p.student.name)
        .join(', ');
      throw new ConflictException(
        `The following students have already been promoted from this section: ${alreadyPromotedNames}`,
      );
    }

    // 8. Partition students into PASSED (Promoted) and FAILED (Repeater)
    type EnrollmentItem = (typeof enrollments)[number];
    const passedList: EnrollmentItem[] = [];
    const failedList: EnrollmentItem[] = [];

    for (const enr of enrollments) {
      const summary = enr.resultSummaries && enr.resultSummaries.length > 0
        ? enr.resultSummaries[0]
        : null;

      if (!summary) {
        throw new BadRequestException(
          `Student '${enr.student.name}' (Roll ${enr.roll}) has no result summary for exam '${exam.name}'. All students must have results before bulk promotion.`,
        );
      }

      if (summary.resultStatus === 'PASS') {
        passedList.push(enr);
      } else if (summary.resultStatus === 'FAIL') {
        failedList.push(enr);
      } else {
        throw new BadRequestException(
          `Student '${enr.student.name}' (Roll ${enr.roll}) has an incomplete result status (${summary.resultStatus}). Please resolve results before bulk promotion.`,
        );
      }
    }

    // 9. Sort passed students by merit position to assign new sequential rolls (1, 2, 3...)
    passedList.sort((a, b) => {
      const summaryA = a.resultSummaries[0];
      const summaryB = b.resultSummaries[0];
      const posA = summaryA.sectionMeritPosition || summaryA.meritPosition || a.roll;
      const posB = summaryB.sectionMeritPosition || summaryB.meritPosition || b.roll;
      return posA - posB;
    });

    // 10. Check Target Section for roll conflicts (rolls 1 to passedList.length)
    const currentTargetSectionEnrollments =
      await this.prisma.studentEnrollment.findMany({
        where: {
          academicYearId: dto.targetAcademicYearId,
          classId: dto.targetClassId,
          sectionId: dto.targetSectionId,
        },
        select: { roll: true },
      });

    const takenRollsInTargetSection = new Set(
      currentTargetSectionEnrollments.map((e) => e.roll),
    );

    for (let r = 1; r <= passedList.length; r++) {
      if (takenRollsInTargetSection.has(r)) {
        throw new ConflictException(
          `Target section '${targetClass.name} - ${targetSection.name}' already has a student with Roll ${r} in '${targetYear.name}'. Clear or adjust existing section rolls first.`,
        );
      }
    }

    // 11. Calculate starting roll for repeaters in source section in the target year
    let startRepeaterRoll = 1;
    const currentSourceSectionInTargetYear =
      await this.prisma.studentEnrollment.findMany({
        where: {
          academicYearId: dto.targetAcademicYearId,
          classId: dto.sourceClassId,
          sectionId: dto.sourceSectionId,
        },
        select: { roll: true },
        orderBy: { roll: 'desc' },
      });

    if (currentSourceSectionInTargetYear.length > 0) {
      startRepeaterRoll = currentSourceSectionInTargetYear[0].roll + 1;
    }

    // 12. Build Group Override Map for Class 9/10
    const overrideMap = new Map<
      string,
      { groupId: string; optionalSubjectId?: string }
    >();
    if (dto.groupOverrides) {
      for (const ov of dto.groupOverrides) {
        overrideMap.set(ov.studentId, {
          groupId: ov.groupId,
          optionalSubjectId: ov.optionalSubjectId,
        });
      }
    }

    // 13. Execute Atomic Database Transaction
    const promoDate = dto.promotionDate
      ? new Date(dto.promotionDate)
      : new Date();

    const batchResult = await this.prisma.$transaction(async (tx) => {
      const promotedRecords = [];
      const repeaterRecords = [];

      // A. Process Promoted Students
      for (let i = 0; i < passedList.length; i++) {
        const item = passedList[i];
        const newRoll = i + 1;
        const studentOverride = overrideMap.get(item.studentId);
        const assignedGroupId =
          studentOverride?.groupId || dto.defaultGroupId || null;
        const assignedOptionalSubjectId =
          studentOverride?.optionalSubjectId || null;

        // 1. Mark source enrollment as PROMOTED
        await tx.studentEnrollment.update({
          where: { id: item.id },
          data: { status: 'PROMOTED' },
        });

        // 2. Create new target enrollment
        const newEnrollment = await tx.studentEnrollment.create({
          data: {
            studentId: item.studentId,
            academicYearId: dto.targetAcademicYearId,
            classId: dto.targetClassId,
            sectionId: dto.targetSectionId,
            groupId: assignedGroupId,
            optionalSubjectId: assignedOptionalSubjectId,
            roll: newRoll,
            enrollmentDate: promoDate,
            isRepeater: false,
            status: 'ACTIVE',
          },
        });

        // 3. Create StudentPromotion record
        const summary = item.resultSummaries[0];
        const meritDisplay =
          summary.sectionMeritPosition || summary.meritPosition || newRoll;
        await tx.studentPromotion.create({
          data: {
            studentId: item.studentId,
            fromEnrollmentId: item.id,
            toEnrollmentId: newEnrollment.id,
            resultSummaryId: summary.id,
            promotionDate: promoDate,
            remarks:
              dto.remarks ||
              `Automated promotion to ${targetClass.name} based on Merit Position ${meritDisplay} (GPA: ${summary.gpa?.toString() || 'Pass'})`,
          },
        });

        promotedRecords.push({
          studentId: item.student.id,
          studentCustomId: item.student.studentId,
          name: item.student.name,
          oldRoll: item.roll,
          newRoll,
          gpa: summary.gpa ? Number(summary.gpa) : null,
          letterGrade: summary.letterGrade,
          meritPosition: meritDisplay,
        });
      }

      // B. Process Repeaters (Failed Students)
      for (let j = 0; j < failedList.length; j++) {
        const item = failedList[j];
        const repeaterRoll = startRepeaterRoll + j;

        // 1. Mark source enrollment as PROMOTED (archived from previous year)
        await tx.studentEnrollment.update({
          where: { id: item.id },
          data: { status: 'PROMOTED' },
        });

        // 2. Create repeater enrollment in the same class in target year
        const newEnrollment = await tx.studentEnrollment.create({
          data: {
            studentId: item.studentId,
            academicYearId: dto.targetAcademicYearId,
            classId: dto.sourceClassId,
            sectionId: dto.sourceSectionId,
            groupId: item.groupId,
            optionalSubjectId: item.optionalSubjectId,
            roll: repeaterRoll,
            enrollmentDate: promoDate,
            isRepeater: true,
            status: 'ACTIVE',
          },
        });

        // 3. Create StudentPromotion record indicating repetition
        const summary = item.resultSummaries[0];
        await tx.studentPromotion.create({
          data: {
            studentId: item.studentId,
            fromEnrollmentId: item.id,
            toEnrollmentId: newEnrollment.id,
            resultSummaryId: summary.id,
            promotionDate: promoDate,
            remarks: `Re-enrolled as repeater in ${sourceClass.name} due to failing ${summary.failedSubjectCount} subject(s)`,
          },
        });

        repeaterRecords.push({
          studentId: item.student.id,
          studentCustomId: item.student.studentId,
          name: item.student.name,
          oldRoll: item.roll,
          newRoll: repeaterRoll,
          failedSubjectCount: summary.failedSubjectCount,
        });
      }

      return {
        promotedRecords,
        repeaterRecords,
      };
    });

    const responseData = {
      source: {
        academicYear: sourceYear.name,
        class: sourceClass.name,
        section: sourceSection.name,
      },
      target: {
        academicYear: targetYear.name,
        class: targetClass.name,
        section: targetSection.name,
      },
      exam: {
        id: exam.id,
        name: exam.name,
      },
      summary: {
        totalProcessed: enrollments.length,
        promotedCount: batchResult.promotedRecords.length,
        repeaterCount: batchResult.repeaterRecords.length,
      },
      promotedStudents: batchResult.promotedRecords,
      repeaters: batchResult.repeaterRecords,
    };

    return ResponseHelper.created(
      responseData,
      `Successfully processed bulk promotion for ${enrollments.length} student(s): ${batchResult.promotedRecords.length} promoted to ${targetClass.name}, ${batchResult.repeaterRecords.length} repeating in ${sourceClass.name}`,
    );
  }

  /**
   * Get paginated promotion records with filtering by year, class, section, or student search
   */
  async getPromotionHistory(query: QueryPromotionDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentPromotionWhereInput = {};

    if (query.sourceAcademicYearId) {
      where.fromEnrollment = {
        ...(where.fromEnrollment as Prisma.StudentEnrollmentWhereInput),
        academicYearId: query.sourceAcademicYearId,
      };
    }

    if (query.targetAcademicYearId) {
      where.toEnrollment = {
        ...(where.toEnrollment as Prisma.StudentEnrollmentWhereInput),
        academicYearId: query.targetAcademicYearId,
      };
    }

    if (query.sourceClassId) {
      where.fromEnrollment = {
        ...(where.fromEnrollment as Prisma.StudentEnrollmentWhereInput),
        classId: query.sourceClassId,
      };
    }

    if (query.targetClassId) {
      where.toEnrollment = {
        ...(where.toEnrollment as Prisma.StudentEnrollmentWhereInput),
        classId: query.targetClassId,
      };
    }

    if (query.sectionId) {
      where.OR = [
        { fromEnrollment: { sectionId: query.sectionId } },
        { toEnrollment: { sectionId: query.sectionId } },
      ];
    }

    if (query.search) {
      where.student = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { studentId: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, records] = await Promise.all([
      this.prisma.studentPromotion.count({ where }),
      this.prisma.studentPromotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ promotionDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              name: true,
              gender: true,
              photo: true,
            },
          },
          fromEnrollment: {
            include: {
              academicYear: { select: { id: true, name: true } },
              schoolClass: { select: { id: true, name: true, numericValue: true } },
              section: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
          toEnrollment: {
            include: {
              academicYear: { select: { id: true, name: true } },
              schoolClass: { select: { id: true, name: true, numericValue: true } },
              section: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
          resultSummary: {
            include: {
              exam: { select: { id: true, name: true, examType: true } },
            },
          },
        },
      }),
    ]);

    const formatted = records.map((rec) => ({
      id: rec.id,
      promotionDate: rec.promotionDate,
      remarks: rec.remarks,
      student: rec.student,
      from: {
        enrollmentId: rec.fromEnrollment.id,
        academicYear: rec.fromEnrollment.academicYear.name,
        class: rec.fromEnrollment.schoolClass.name,
        section: rec.fromEnrollment.section.name,
        group: rec.fromEnrollment.group?.name || null,
        roll: rec.fromEnrollment.roll,
      },
      to: {
        enrollmentId: rec.toEnrollment.id,
        academicYear: rec.toEnrollment.academicYear.name,
        class: rec.toEnrollment.schoolClass.name,
        section: rec.toEnrollment.section.name,
        group: rec.toEnrollment.group?.name || null,
        roll: rec.toEnrollment.roll,
        isRepeater: rec.toEnrollment.isRepeater,
      },
      result: rec.resultSummary
        ? {
            examName: rec.resultSummary.exam.name,
            totalMarks: Number(rec.resultSummary.totalMarks),
            gpa: rec.resultSummary.gpa ? Number(rec.resultSummary.gpa) : null,
            letterGrade: rec.resultSummary.letterGrade,
            meritPosition:
              rec.resultSummary.sectionMeritPosition ||
              rec.resultSummary.meritPosition,
            resultStatus: rec.resultSummary.resultStatus,
          }
        : null,
      createdAt: rec.createdAt,
    }));

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(
      formatted,
      meta,
      'Promotion history retrieved successfully',
    );
  }

  /**
   * Get the complete academic promotion journey/timeline of a single student
   */
  async getStudentPromotionHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentId: true,
        name: true,
        gender: true,
        photo: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID '${studentId}' not found`);
    }

    const records = await this.prisma.studentPromotion.findMany({
      where: { studentId },
      orderBy: { promotionDate: 'asc' },
      include: {
        fromEnrollment: {
          include: {
            academicYear: { select: { id: true, name: true } },
            schoolClass: { select: { id: true, name: true, numericValue: true } },
            section: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
        toEnrollment: {
          include: {
            academicYear: { select: { id: true, name: true } },
            schoolClass: { select: { id: true, name: true, numericValue: true } },
            section: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
        resultSummary: {
          include: {
            exam: { select: { id: true, name: true, examType: true } },
          },
        },
      },
    });

    const timeline = records.map((rec, index) => ({
      step: index + 1,
      promotionId: rec.id,
      promotionDate: rec.promotionDate,
      remarks: rec.remarks,
      from: {
        academicYear: rec.fromEnrollment.academicYear.name,
        class: rec.fromEnrollment.schoolClass.name,
        section: rec.fromEnrollment.section.name,
        group: rec.fromEnrollment.group?.name || null,
        roll: rec.fromEnrollment.roll,
      },
      to: {
        academicYear: rec.toEnrollment.academicYear.name,
        class: rec.toEnrollment.schoolClass.name,
        section: rec.toEnrollment.section.name,
        group: rec.toEnrollment.group?.name || null,
        roll: rec.toEnrollment.roll,
        isRepeater: rec.toEnrollment.isRepeater,
      },
      result: rec.resultSummary
        ? {
            examName: rec.resultSummary.exam.name,
            gpa: rec.resultSummary.gpa ? Number(rec.resultSummary.gpa) : null,
            letterGrade: rec.resultSummary.letterGrade,
            meritPosition:
              rec.resultSummary.sectionMeritPosition ||
              rec.resultSummary.meritPosition,
            resultStatus: rec.resultSummary.resultStatus,
          }
        : null,
    }));

    return ResponseHelper.success(
      {
        student,
        totalPromotions: records.length,
        timeline,
      },
      `Promotion history for student '${student.name}' retrieved successfully`,
    );
  }

  /**
   * Graduate/Complete an entire batch of Class 10 students atomically.
   *
   * - Validates that the class is the terminal graduating class (no higher class)
   * - Marks their StudentEnrollment status as COMPLETED
   * - Marks their permanent Student profile status as GRADUATED
   */
  async graduateBatch(dto: GraduateBatchDto) {
    // 1. Verify Academic Year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
      select: { id: true, name: true },
    });
    if (!academicYear) {
      throw new NotFoundException(
        `Academic Year with ID '${dto.academicYearId}' not found`,
      );
    }

    // 2. Verify Class exists and is terminal (Class 10 / highest class)
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
      select: { id: true, name: true, numericValue: true },
    });
    if (!schoolClass) {
      throw new NotFoundException(`Class with ID '${dto.classId}' not found`);
    }

    // Check if there is any higher class in the school
    const higherClass = await this.prisma.schoolClass.findFirst({
      where: { numericValue: { gt: schoolClass.numericValue } },
      select: { id: true, name: true },
    });

    if (higherClass) {
      throw new BadRequestException(
        `Class '${schoolClass.name}' is not a graduating terminal class. Higher class '${higherClass.name}' exists. Use promotion instead.`,
      );
    }

    // 3. Verify section if provided
    let section: { id: string; name: string } | null = null;
    if (dto.sectionId) {
      section = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, classId: dto.classId },
        select: { id: true, name: true },
      });
      if (!section) {
        throw new BadRequestException(
          `Section with ID '${dto.sectionId}' does not belong to Class '${schoolClass.name}'`,
        );
      }
    }

    // 4. Find all active enrollments in this class/section
    const activeEnrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
        status: 'ACTIVE',
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            gender: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ section: { name: 'asc' } }, { roll: 'asc' }],
    });

    if (activeEnrollments.length === 0) {
      throw new NotFoundException(
        `No active students found in Class '${schoolClass.name}'${
          section ? ` (Section ${section.name})` : ''
        } for academic year '${academicYear.name}'`,
      );
    }

    const enrollmentIds = activeEnrollments.map((e) => e.id);
    const studentIds = activeEnrollments.map((e) => e.studentId);

    // 5. Execute Atomic Database Transaction
    await this.prisma.$transaction(async (tx) => {
      // a. Mark all active enrollments as COMPLETED
      await tx.studentEnrollment.updateMany({
        where: { id: { in: enrollmentIds } },
        data: { status: 'COMPLETED' },
      });

      // b. Mark all permanent student profiles as GRADUATED
      await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: { status: 'GRADUATED' },
      });
    });

    const studentList = activeEnrollments.map((enr) => ({
      studentId: enr.student.id,
      studentCustomId: enr.student.studentId,
      name: enr.student.name,
      gender: enr.student.gender,
      section: enr.section.name,
      roll: enr.roll,
      enrollmentStatus: 'COMPLETED',
      studentStatus: 'GRADUATED',
    }));

    const responseData = {
      academicYear: academicYear.name,
      class: schoolClass.name,
      section: section ? section.name : 'All Sections',
      totalGraduated: activeEnrollments.length,
      completionDate:
        dto.completionDate || new Date().toISOString().split('T')[0],
      remarks:
        dto.remarks ||
        `${schoolClass.name} batch graduated successfully from high school`,
      students: studentList,
    };

    return ResponseHelper.success(
      responseData,
      `Successfully graduated ${activeEnrollments.length} student(s) from ${schoolClass.name}`,
    );
  }
}
