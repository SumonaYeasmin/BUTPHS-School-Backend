import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PreviewPromotionDto } from './dto/preview-promotion.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { NotFoundException } from '../../../common/exceptions/business.exception';

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
}
