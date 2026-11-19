import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessResultDto } from './dto/process-result.dto';
import { QueryTabulationSheetDto } from './dto/query-tabulation-sheet.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  EnrollmentStatus,
  ExamStatus,
  ResultPublicationStatus,
  ResultStatus,
} from '@prisma/client';

@Injectable()
export class ResultProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process and generate StudentSubjectResult and ResultSummary for an entire examination
   */
  async processExamResults(
    examId: string,
    dto: ProcessResultDto,
    currentUser: any,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        gradingScale: {
          include: {
            gradeRanges: {
              where: { isDeleted: false },
              orderBy: { minPercentage: 'desc' },
            },
          },
        },
        academicYear: true,
        schoolClass: true,
        examSubjects: {
          include: {
            subject: true,
            group: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!exam || exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    if (exam.status === ExamStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot process results for cancelled examination '${exam.name}'.`,
      );
    }

    if (
      exam.resultStatus === ResultPublicationStatus.PUBLISHED &&
      !dto.forceRecalculate
    ) {
      throw new BadRequestException(
        `Results for '${exam.name}' have already been published. To re-process, enable forceRecalculate or withhold the examination first.`,
      );
    }

    const gradeRanges = exam.gradingScale?.gradeRanges || [];
    if (gradeRanges.length === 0) {
      throw new BadRequestException(
        `The grading scale '${exam.gradingScale?.name || 'Assigned'}' does not have any active grade ranges configured.`,
      );
    }

    // 1. Fetch active student enrollments for this class and academic year
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        status: EnrollmentStatus.ACTIVE,
      },
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

    if (enrollments.length === 0) {
      throw new BadRequestException(
        `No active student enrollments found in class '${exam.schoolClass.name}' for academic year '${exam.academicYear.name}'.`,
      );
    }

    // 2. Fetch curriculum subjects for optional 4th subject mapping
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        academicYearId: exam.academicYearId,
        classId: exam.classId,
        isActive: true,
      },
    });

    const classSubjectMap = new Map<string, any>();
    for (const cs of classSubjects) {
      classSubjectMap.set(cs.subjectId, cs);
    }

    // 3. Fetch all marks entered for this exam
    const examSubjectIds = exam.examSubjects.map((s) => s.id);
    const enrollmentIds = enrollments.map((e) => e.id);

    const enteredMarks = await this.prisma.mark.findMany({
      where: {
        examSubjectId: { in: examSubjectIds },
        studentEnrollmentId: { in: enrollmentIds },
      },
    });

    const marksMap = new Map<string, any>();
    for (const m of enteredMarks) {
      marksMap.set(`${m.studentEnrollmentId}_${m.examSubjectId}`, m);
    }

    // Helper: Determine letter grade & grade point from percentage score
    const evaluateGrade = (pct: number) => {
      for (const range of gradeRanges) {
        const min = Number(range.minPercentage);
        const max = Number(range.maxPercentage);
        if (pct >= min && pct <= max) {
          return {
            letterGrade: range.letterGrade,
            gradePoint: Number(range.gradePoint),
            isFailGrade: range.isFailGrade,
          };
        }
      }
      // If below lowest minimum, return lowest range
      const lowest = gradeRanges[gradeRanges.length - 1];
      return {
        letterGrade: lowest.letterGrade,
        gradePoint: Number(lowest.gradePoint),
        isFailGrade: true,
      };
    };

    // Helper: Map an overall GPA to letter grade
    const mapGpaToLetterGrade = (gpa: number) => {
      for (const range of gradeRanges) {
        if (gpa >= Number(range.gradePoint)) {
          return range.letterGrade;
        }
      }
      return gradeRanges[gradeRanges.length - 1].letterGrade;
    };

    // 4. Calculate subject results and summary per student
    const subjectResultInserts: any[] = [];
    const studentSummaryList: any[] = [];

    for (const enrollment of enrollments) {
      let totalFullMarks = 0;
      let totalObtainedMarks = 0;
      let failedSubjectCount = 0;
      let coreGradePointsSum = 0;
      let coreSubjectsCount = 0;
      let bonusGradePointTotal = 0;

      for (const examSubject of exam.examSubjects) {
        // Group check: student must belong to the subject's group if specified
        if (
          examSubject.groupId &&
          enrollment.groupId !== examSubject.groupId
        ) {
          continue;
        }

        const classSubject = classSubjectMap.get(examSubject.subjectId);

        // Determine if this subject is the student's 4th/Optional subject
        const isOptional =
          (examSubject.isOptional || classSubject?.isOptional) &&
          enrollment.optionalClassSubjectId === classSubject?.id;

        const mark = marksMap.get(`${enrollment.id}_${examSubject.id}`);
        const subjectFullMarks = Number(examSubject.fullMarks);
        totalFullMarks += subjectFullMarks;

        let totalMarks = 0;
        let isAbsent = true;
        let isPassed = false;
        let letterGrade = 'F';
        let gradePoint = 0.0;
        let bonusGradePoint = 0.0;

        if (mark) {
          isAbsent = mark.isAbsent;
          totalMarks = Number(mark.totalMarks);

          if (!isAbsent) {
            // Check individual component pass thresholds
            let componentFailed = false;

            if (
              examSubject.hasWritten &&
              examSubject.writtenPassMarks &&
              Number(mark.writtenMarks) < Number(examSubject.writtenPassMarks)
            ) {
              componentFailed = true;
            }

            if (
              examSubject.hasMcq &&
              examSubject.mcqPassMarks &&
              Number(mark.mcqMarks) < Number(examSubject.mcqPassMarks)
            ) {
              componentFailed = true;
            }

            if (
              examSubject.hasPractical &&
              examSubject.practicalPassMarks &&
              Number(mark.practicalMarks) <
                Number(examSubject.practicalPassMarks)
            ) {
              componentFailed = true;
            }

            if (
              examSubject.hasContinuousAssessment &&
              examSubject.continuousAssessmentPassMarks &&
              Number(mark.continuousAssessmentMarks) <
                Number(examSubject.continuousAssessmentPassMarks)
            ) {
              componentFailed = true;
            }

            if (totalMarks < Number(examSubject.passMarks)) {
              componentFailed = true;
            }

            if (componentFailed) {
              isPassed = false;
              gradePoint = 0.0;
              letterGrade = 'F';
            } else {
              const percentage = (totalMarks / subjectFullMarks) * 100;
              const evalResult = evaluateGrade(percentage);
              isPassed = !evalResult.isFailGrade;
              letterGrade = evalResult.letterGrade;
              gradePoint = evalResult.gradePoint;
            }

            // Optional 4th Subject Bonus (Points earned above 2.00)
            if (isOptional) {
              bonusGradePoint = gradePoint > 2.0 ? gradePoint - 2.0 : 0.0;
            }
          }
        }

        totalObtainedMarks += totalMarks;

        if (isOptional) {
          bonusGradePointTotal += bonusGradePoint;
        } else {
          coreSubjectsCount++;
          coreGradePointsSum += gradePoint;
          if (!isPassed) {
            failedSubjectCount++;
          }
        }

        subjectResultInserts.push({
          studentEnrollmentId: enrollment.id,
          examId: exam.id,
          examSubjectId: examSubject.id,
          totalMarks,
          letterGrade,
          gradePoint,
          isPassed,
          isOptional,
          bonusGradePoint,
          isAbsent,
          calculatedAt: new Date(),
        });
      }

      // Compute overall GPA & Result Status
      const coreCount = coreSubjectsCount || 1;
      const gpaWithoutOptional = Number(
        (coreGradePointsSum / coreCount).toFixed(2),
      );
      const maxGpa = Number(exam.gradingScale.maxGpa || 5.0);

      let finalGpa = 0.0;
      let overallGrade = 'F';
      let resultStatus: ResultStatus = ResultStatus.FAIL;

      if (failedSubjectCount === 0) {
        const calculatedGpaWithBonus = Number(
          ((coreGradePointsSum + bonusGradePointTotal) / coreCount).toFixed(2),
        );
        finalGpa = Math.min(calculatedGpaWithBonus, maxGpa);
        overallGrade = mapGpaToLetterGrade(finalGpa);
        resultStatus = ResultStatus.PASS;
      }

      studentSummaryList.push({
        studentEnrollmentId: enrollment.id,
        examId: exam.id,
        sectionId: enrollment.sectionId,
        roll: enrollment.roll,
        totalFullMarks,
        totalMarks: totalObtainedMarks,
        gpa: finalGpa,
        gpaWithoutOptional,
        letterGrade: overallGrade,
        failedSubjectCount,
        resultStatus,
        meritPosition: null,
        sectionMeritPosition: null,
      });
    }

    // 5. Rank merit positions: Passed students first by GPA desc, then totalMarks desc
    const passedStudents = studentSummaryList.filter(
      (s) => s.resultStatus === ResultStatus.PASS,
    );
    const failedStudents = studentSummaryList.filter(
      (s) => s.resultStatus === ResultStatus.FAIL,
    );

    const sortFn = (a: any, b: any) => {
      if (b.gpa !== a.gpa) {
        return b.gpa - a.gpa;
      }
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }
      return a.roll - b.roll;
    };

    passedStudents.sort(sortFn);
    failedStudents.sort((a, b) => {
      if (b.totalMarks !== a.totalMarks) {
        return b.totalMarks - a.totalMarks;
      }
      return a.roll - b.roll;
    });

    // Assign Class Merit Positions
    let classRank = 1;
    for (const student of passedStudents) {
      student.meritPosition = classRank++;
    }
    for (const student of failedStudents) {
      student.meritPosition = classRank++;
    }

    // Assign Section Merit Positions
    const sectionGroups = new Map<string, any[]>();
    for (const student of [...passedStudents, ...failedStudents]) {
      const secId = student.sectionId;
      if (!sectionGroups.has(secId)) {
        sectionGroups.set(secId, []);
      }
      sectionGroups.get(secId)!.push(student);
    }

    for (const [, secList] of sectionGroups.entries()) {
      let secRank = 1;
      for (const student of secList) {
        student.sectionMeritPosition = secRank++;
      }
    }

    // 6. Execute atomic persistence in a Prisma Transaction
    const allSummaries = [...passedStudents, ...failedStudents];

    await this.prisma.$transaction(async (tx) => {
      // Clean existing calculated subject results for this exam
      await tx.studentSubjectResult.deleteMany({
        where: { examId: exam.id },
      });

      // Insert all calculated subject results in batches
      await tx.studentSubjectResult.createMany({
        data: subjectResultInserts,
      });

      // Upsert result summaries
      for (const summary of allSummaries) {
        await tx.resultSummary.upsert({
          where: {
            studentEnrollmentId_examId: {
              studentEnrollmentId: summary.studentEnrollmentId,
              examId: summary.examId,
            },
          },
          create: {
            studentEnrollmentId: summary.studentEnrollmentId,
            examId: summary.examId,
            totalFullMarks: summary.totalFullMarks,
            totalMarks: summary.totalMarks,
            gpa: summary.gpa,
            gpaWithoutOptional: summary.gpaWithoutOptional,
            letterGrade: summary.letterGrade,
            meritPosition: summary.meritPosition,
            sectionMeritPosition: summary.sectionMeritPosition,
            failedSubjectCount: summary.failedSubjectCount,
            resultStatus: summary.resultStatus,
          },
          update: {
            totalFullMarks: summary.totalFullMarks,
            totalMarks: summary.totalMarks,
            gpa: summary.gpa,
            gpaWithoutOptional: summary.gpaWithoutOptional,
            letterGrade: summary.letterGrade,
            meritPosition: summary.meritPosition,
            sectionMeritPosition: summary.sectionMeritPosition,
            failedSubjectCount: summary.failedSubjectCount,
            resultStatus: summary.resultStatus,
          },
        });
      }

      // Update exam operational locks if requested
      if (dto.lockExamOnProcess) {
        await tx.exam.update({
          where: { id: exam.id },
          data: { isLocked: true },
        });
      }
    });

    const passRate =
      enrollments.length > 0
        ? Number(((passedStudents.length / enrollments.length) * 100).toFixed(2))
        : 0;

    const gpa5Count = passedStudents.filter(
      (s) => Number(s.gpa) >= Number(exam.gradingScale.maxGpa || 5.0),
    ).length;

    return ResponseHelper.success(
      {
        examination: {
          id: exam.id,
          name: exam.name,
          class: exam.schoolClass.name,
          academicYear: exam.academicYear.name,
          resultStatus: exam.resultStatus,
          isLocked: dto.lockExamOnProcess ? true : exam.isLocked,
        },
        statistics: {
          totalStudents: enrollments.length,
          passedCount: passedStudents.length,
          failedCount: failedStudents.length,
          passRatePercentage: passRate,
          gpaFiveCount: gpa5Count,
          totalSubjectResultsGenerated: subjectResultInserts.length,
        },
      },
      `Results for examination '${exam.name}' have been processed and tabulated successfully`,
    );
  }

  /**
   * Retrieve full Tabulation Sheet (Master Result Sheet) for teachers and admins
   */
  async getTabulationSheet(examId: string, query: QueryTabulationSheetDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        academicYear: true,
        schoolClass: true,
        gradingScale: true,
        examSubjects: {
          include: { subject: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!exam || exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    const whereClause: any = {
      examId,
    };

    if (query.resultStatus) {
      whereClause.resultStatus = query.resultStatus;
    }

    if (query.sectionId) {
      whereClause.enrollment = { sectionId: query.sectionId };
    }

    const summaries = await this.prisma.resultSummary.findMany({
      where: whereClause,
      include: {
        enrollment: {
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
          },
        },
      },
      orderBy: [{ meritPosition: 'asc' }],
    });

    // Fetch student subject results for these students
    const enrollmentIds = summaries.map((s) => s.studentEnrollmentId);
    const subjectResults = await this.prisma.studentSubjectResult.findMany({
      where: {
        examId,
        studentEnrollmentId: { in: enrollmentIds },
      },
      include: {
        examSubject: {
          include: { subject: true },
        },
      },
      orderBy: [{ examSubject: { displayOrder: 'asc' } }],
    });

    const subjectResultsMap = new Map<string, any[]>();
    for (const sr of subjectResults) {
      if (!subjectResultsMap.has(sr.studentEnrollmentId)) {
        subjectResultsMap.set(sr.studentEnrollmentId, []);
      }
      subjectResultsMap.get(sr.studentEnrollmentId)!.push(sr);
    }

    // Build tabulation rows
    const rows = summaries.map((summary) => {
      const sResults = subjectResultsMap.get(summary.studentEnrollmentId) || [];

      const subjects = sResults.map((sr) => ({
        examSubjectId: sr.examSubjectId,
        subjectName: sr.examSubject.subject.name,
        code: sr.examSubject.subject.officialCode,
        totalMarks: Number(sr.totalMarks),
        letterGrade: sr.letterGrade,
        gradePoint: Number(sr.gradePoint),
        isPassed: sr.isPassed,
        isOptional: sr.isOptional,
        isAbsent: sr.isAbsent,
      }));

      return {
        enrollmentId: summary.studentEnrollmentId,
        studentId: summary.enrollment.student.studentId,
        roll: summary.enrollment.roll,
        name: summary.enrollment.student.nameEn,
        nameBn: summary.enrollment.student.nameBn,
        section: summary.enrollment.section.name,
        subjects,
        totalMarks: Number(summary.totalMarks),
        totalFullMarks: Number(summary.totalFullMarks),
        gpa: Number(summary.gpa),
        gpaWithoutOptional: Number(summary.gpaWithoutOptional),
        letterGrade: summary.letterGrade,
        meritPosition: summary.meritPosition,
        sectionMeritPosition: summary.sectionMeritPosition,
        failedSubjectCount: summary.failedSubjectCount,
        resultStatus: summary.resultStatus,
      };
    });

    const totalStudents = summaries.length;
    const passedCount = summaries.filter(
      (s) => s.resultStatus === ResultStatus.PASS,
    ).length;
    const failedCount = totalStudents - passedCount;
    const passPercentage =
      totalStudents > 0
        ? Number(((passedCount / totalStudents) * 100).toFixed(2))
        : 0;

    return ResponseHelper.success(
      {
        examination: {
          id: exam.id,
          name: exam.name,
          examType: exam.examType,
          class: exam.schoolClass.name,
          academicYear: exam.academicYear.name,
          resultStatus: exam.resultStatus,
          publishedAt: exam.publishedAt,
          gradingScale: exam.gradingScale.name,
          maxGpa: Number(exam.gradingScale.maxGpa),
        },
        subjectsList: exam.examSubjects.map((es) => ({
          id: es.id,
          name: es.subject.name,
          code: es.subject.officialCode,
          fullMarks: Number(es.fullMarks),
          passMarks: Number(es.passMarks),
          isOptional: es.isOptional,
        })),
        summary: {
          totalStudents,
          passedCount,
          failedCount,
          passPercentage,
        },
        tabulation: rows,
      },
      `Tabulation sheet for '${exam.name}' retrieved successfully`,
    );
  }

  /**
   * Retrieve Academic Transcript / Marksheet for a single student
   */
  async getStudentTranscript(enrollmentId: string, examId: string) {
    const summary = await this.prisma.resultSummary.findUnique({
      where: {
        studentEnrollmentId_examId: {
          studentEnrollmentId: enrollmentId,
          examId,
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            schoolClass: true,
            section: true,
            academicYear: true,
          },
        },
        exam: {
          include: {
            gradingScale: {
              include: {
                gradeRanges: {
                  where: { isDeleted: false },
                  orderBy: { minPercentage: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundException(
        'Result summary for this student and examination not found. Has the result been processed?',
      );
    }

    const subjectResults = await this.prisma.studentSubjectResult.findMany({
      where: {
        examId,
        studentEnrollmentId: enrollmentId,
      },
      include: {
        examSubject: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [{ examSubject: { displayOrder: 'asc' } }],
    });

    return ResponseHelper.success(
      {
        student: {
          enrollmentId: summary.studentEnrollmentId,
          studentId: summary.enrollment.student.studentId,
          name: summary.enrollment.student.nameEn,
          nameBn: summary.enrollment.student.nameBn,
          roll: summary.enrollment.roll,
          class: summary.enrollment.schoolClass.name,
          section: summary.enrollment.section.name,
          academicYear: summary.enrollment.academicYear.name,
        },
        examination: {
          id: summary.exam.id,
          name: summary.exam.name,
          examType: summary.exam.examType,
          resultStatus: summary.exam.resultStatus,
          publishedAt: summary.exam.publishedAt,
        },
        subjects: subjectResults.map((sr) => ({
          subjectName: sr.examSubject.subject.name,
          officialCode: sr.examSubject.subject.officialCode,
          fullMarks: Number(sr.examSubject.fullMarks),
          passMarks: Number(sr.examSubject.passMarks),
          obtainedMarks: Number(sr.totalMarks),
          letterGrade: sr.letterGrade,
          gradePoint: Number(sr.gradePoint),
          isPassed: sr.isPassed,
          isOptional: sr.isOptional,
          bonusGradePoint: Number(sr.bonusGradePoint),
          isAbsent: sr.isAbsent,
        })),
        resultSummary: {
          totalMarks: Number(summary.totalMarks),
          totalFullMarks: Number(summary.totalFullMarks),
          gpa: Number(summary.gpa),
          gpaWithoutOptional: Number(summary.gpaWithoutOptional),
          letterGrade: summary.letterGrade,
          meritPosition: summary.meritPosition,
          sectionMeritPosition: summary.sectionMeritPosition,
          failedSubjectCount: summary.failedSubjectCount,
          resultStatus: summary.resultStatus,
          publishedAt: summary.publishedAt,
        },
        gradingScale: {
          name: summary.exam.gradingScale.name,
          maxGpa: Number(summary.exam.gradingScale.maxGpa),
          ranges: summary.exam.gradingScale.gradeRanges.map((gr) => ({
            minPercentage: Number(gr.minPercentage),
            maxPercentage: Number(gr.maxPercentage),
            letterGrade: gr.letterGrade,
            gradePoint: Number(gr.gradePoint),
            remarks: gr.remarks,
          })),
        },
      },
      'Academic transcript retrieved successfully',
    );
  }

  /**
   * Publish results for an entire examination (Admins only)
   */
  async publishResults(examId: string, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam || exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    const summaryCount = await this.prisma.resultSummary.count({
      where: { examId },
    });

    if (summaryCount === 0) {
      throw new BadRequestException(
        `Cannot publish results. Results for '${exam.name}' have not been processed yet. Process results first.`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.exam.update({
        where: { id: examId },
        data: {
          resultStatus: ResultPublicationStatus.PUBLISHED,
          publishedAt: now,
          isLocked: true,
        },
      }),
      this.prisma.resultSummary.updateMany({
        where: { examId },
        data: { publishedAt: now },
      }),
      this.prisma.mark.updateMany({
        where: {
          examSubject: { examId },
        },
        data: { isLocked: true },
      }),
    ]);

    return ResponseHelper.success(
      {
        examId,
        name: exam.name,
        resultStatus: ResultPublicationStatus.PUBLISHED,
        publishedAt: now,
        isLocked: true,
      },
      `Results for examination '${exam.name}' have been officially published and marks are now sealed.`,
    );
  }

  /**
   * Withhold results (Temporarily withdraw or suspend publication)
   */
  async withholdResults(examId: string, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam || exam.isDeleted) {
      throw new NotFoundException('Examination not found');
    }

    await this.prisma.exam.update({
      where: { id: examId },
      data: {
        resultStatus: ResultPublicationStatus.WITHHELD,
      },
    });

    return ResponseHelper.success(
      {
        examId,
        name: exam.name,
        resultStatus: ResultPublicationStatus.WITHHELD,
      },
      `Results for examination '${exam.name}' have been placed on WITHHELD status.`,
    );
  }
}
