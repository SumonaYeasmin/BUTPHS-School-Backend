import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryExamRoutineDto } from './dto/query-exam-routine.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class ExamRoutineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public API: Get complete routine / timetable for a specific examination
   */
  async getRoutineByExam(examId: string, sectionId?: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
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
      },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    const whereClause: Prisma.ExamRoutineWhereInput = {
      examId,
    };

    if (sectionId) {
      whereClause.OR = [{ sectionId }, { sectionId: null }];
    }

    const routines = await this.prisma.examRoutine.findMany({
      where: whereClause,
      include: {
        examSubject: {
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
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    });

    const formattedRoutines = routines.map((r) => this.formatRoutineSlot(r));

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
        totalSlots: formattedRoutines.length,
        schedule: formattedRoutines,
      },
      `Exam routine for '${exam.name}' retrieved successfully`,
    );
  }

  /**
   * Public API: Search / filter exam routines with multiple criteria
   */
  async findRoutines(query: QueryExamRoutineDto) {
    const examWhere: Prisma.ExamWhereInput = {
      isDeleted: false,
    };

    if (query.academicYearId) {
      examWhere.academicYearId = query.academicYearId;
    }

    if (query.classId) {
      examWhere.classId = query.classId;
    }

    const whereClause: Prisma.ExamRoutineWhereInput = {
      exam: examWhere,
    };

    if (query.examId) {
      whereClause.examId = query.examId;
    }

    if (query.sectionId) {
      whereClause.OR = [{ sectionId: query.sectionId }, { sectionId: null }];
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.startDate || query.endDate) {
      whereClause.examDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const routines = await this.prisma.examRoutine.findMany({
      where: whereClause,
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            status: true,
            academicYear: { select: { id: true, name: true } },
            schoolClass: { select: { id: true, name: true, numericValue: true } },
          },
        },
        examSubject: {
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
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    });

    const formatted = routines.map((r) => this.formatRoutineSlot(r));

    return ResponseHelper.success(
      {
        totalSlots: formatted.length,
        routines: formatted,
      },
      'Exam routines retrieved successfully',
    );
  }

  /**
   * Helper: Formats a routine slot with day of week, 12h time strings, and human-readable tags
   */
  private formatRoutineSlot(r: any) {
    const dateObj = new Date(r.examDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    });
    const dateString = dateObj.toISOString().split('T')[0];

    const startTimeFormatted = this.formatTime12h(r.startTime);
    const endTimeFormatted = this.formatTime12h(r.endTime);

    return {
      id: r.id,
      examId: r.examId,
      exam: r.exam ? r.exam : undefined,
      examDate: dateString,
      dayOfWeek,
      startTime: startTimeFormatted.time24,
      endTime: endTimeFormatted.time24,
      displayTime: `${startTimeFormatted.time12} - ${endTimeFormatted.time12}`,
      roomNo: r.roomNo || 'Not Assigned',
      status: r.status,
      instructions: r.instructions || null,
      section: r.section ? r.section.name : 'All Sections',
      sectionId: r.sectionId || null,
      subject: {
        id: r.examSubject.subject.id,
        name: r.examSubject.subject.name,
        code: r.examSubject.subject.officialCode || null,
        category: r.examSubject.subject.category,
        paperNumber: r.examSubject.subject.paperNumber || null,
        group: r.examSubject.group ? r.examSubject.group.name : null,
      },
      marksDistribution: {
        fullMarks: Number(r.examSubject.fullMarks),
        passMarks: Number(r.examSubject.passMarks),
        hasWritten: r.examSubject.hasWritten,
        writtenFullMarks: r.examSubject.writtenFullMarks
          ? Number(r.examSubject.writtenFullMarks)
          : null,
        hasMcq: r.examSubject.hasMcq,
        mcqFullMarks: r.examSubject.mcqFullMarks
          ? Number(r.examSubject.mcqFullMarks)
          : null,
        hasPractical: r.examSubject.hasPractical,
        practicalFullMarks: r.examSubject.practicalFullMarks
          ? Number(r.examSubject.practicalFullMarks)
          : null,
        isOptional: r.examSubject.isOptional,
      },
    };
  }

  /**
   * Helper: Converts UTC Date/Time into 12h & 24h formatted string
   */
  private formatTime12h(time: Date | string): {
    time24: string;
    time12: string;
  } {
    if (!time) {
      return { time24: '', time12: '' };
    }

    let hours: number;
    let minutes: number;

    if (time instanceof Date) {
      hours = time.getUTCHours();
      minutes = time.getUTCMinutes();
    } else {
      const parts = String(time).split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }

    const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const time12 = `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

    return { time24, time12 };
  }
}
