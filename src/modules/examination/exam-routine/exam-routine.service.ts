import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamRoutineDto } from './dto/create-exam-routine.dto';
import { QueryExamRoutineDto } from './dto/query-exam-routine.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ExamRoutineStatus,
  ExamStatus,
  Prisma,
  ResultPublicationStatus,
} from '../../../../prisma/generated/client';

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
      isDeleted: false,
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
      isDeleted: false,
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

  /**
   * Helper: Parses time string (HH:mm or HH:mm:ss) to Date relative to epoch 1970 UTC
   */
  private parseTimeToDate(timeStr: string): Date {
    const parts = timeStr.trim().split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;

    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  }

  /**
   * Helper: Converts time (Date or HH:mm string) to minutes from midnight
   */
  private timeToMinutes(time: Date | string): number {
    if (time instanceof Date) {
      return time.getUTCHours() * 60 + time.getUTCMinutes();
    }
    const parts = String(time).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  /**
   * Create / schedule a new exam routine slot with collision guards
   */
  async create(examId: string, dto: CreateExamRoutineDto) {
    // 1. Verify Exam existence and state guards
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Examination not found');
    }

    if (exam.isLocked) {
      throw new BadRequestException(
        `Examination '${exam.name}' is locked. Unlock it first before scheduling routine slots.`,
      );
    }

    if (exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot schedule routine for examination '${exam.name}' because its results have already been published.`,
      );
    }

    if (
      exam.status === ExamStatus.COMPLETED ||
      exam.status === ExamStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot schedule routine for an examination with status '${exam.status}'.`,
      );
    }

    // 2. Verify ExamSubject belongs to this examination
    const examSubject = await this.prisma.examSubject.findFirst({
      where: { id: dto.examSubjectId, examId },
      include: {
        subject: true,
      },
    });

    if (!examSubject) {
      throw new NotFoundException(
        'The specified subject does not belong to this examination',
      );
    }

    // 3. Verify Section (if specified)
    if (dto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, classId: exam.classId },
      });
      if (!section) {
        throw new NotFoundException(
          'Section not found or does not belong to this examination class',
        );
      }
    }

    // 4. Validate Exam Date within Examination boundaries
    const exStart = new Date(exam.startDate);
    const exEnd = new Date(exam.endDate);
    exStart.setHours(0, 0, 0, 0);
    exEnd.setHours(23, 59, 59, 999);

    const targetDate = new Date(dto.examDate);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < exStart || targetDate > exEnd) {
      const startStr = exam.startDate.toISOString().split('T')[0];
      const endStr = exam.endDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Exam date (${dto.examDate}) must fall within the examination schedule (${startStr} to ${endStr}).`,
      );
    }

    // 5. Time Validation
    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException(
        `Exam startTime (${dto.startTime}) must be earlier than endTime (${dto.endTime}).`,
      );
    }

    if (endMinutes - startMinutes < 15) {
      throw new BadRequestException(
        'Exam duration must be at least 15 minutes.',
      );
    }

    // 6. Routine Duplicate Guard: Check if subject is already scheduled
    const existingSubjectSlot = await this.prisma.examRoutine.findFirst({
      where: {
        examId,
        examSubjectId: dto.examSubjectId,
        isDeleted: false,
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
      },
    });

    if (existingSubjectSlot) {
      throw new ConflictException(
        `Routine slot for subject '${examSubject.subject.name}' is already scheduled in this examination.`,
      );
    }

    // 7. Student Class/Section Time Conflict Check (Double Booking Students)
    const sameDayClassRoutines = await this.prisma.examRoutine.findMany({
      where: {
        examId,
        examDate: targetDate,
        isDeleted: false,
        status: { not: ExamRoutineStatus.CANCELLED },
        OR: [
          { sectionId: null },
          ...(dto.sectionId ? [{ sectionId: dto.sectionId }] : []),
        ],
      },
      include: {
        examSubject: { include: { subject: true } },
      },
    });

    for (const r of sameDayClassRoutines) {
      const existingStart = this.timeToMinutes(r.startTime);
      const existingEnd = this.timeToMinutes(r.endTime);

      if (!(endMinutes <= existingStart || startMinutes >= existingEnd)) {
        throw new ConflictException(
          `Time conflict: Subject '${r.examSubject.subject.name}' is already scheduled on ${dto.examDate} from ${this.formatTime12h(r.startTime).time12} to ${this.formatTime12h(r.endTime).time12}.`,
        );
      }
    }

    // 8. Room Double Booking Check (Across the entire school!)
    if (dto.roomNo) {
      const normalizedRoom = dto.roomNo.trim();
      const sameDayRoomRoutines = await this.prisma.examRoutine.findMany({
        where: {
          examDate: targetDate,
          roomNo: { equals: normalizedRoom, mode: 'insensitive' },
          isDeleted: false,
          status: { not: ExamRoutineStatus.CANCELLED },
        },
        include: {
          exam: { select: { name: true } },
          examSubject: { include: { subject: true } },
        },
      });

      for (const r of sameDayRoomRoutines) {
        const existingStart = this.timeToMinutes(r.startTime);
        const existingEnd = this.timeToMinutes(r.endTime);

        if (!(endMinutes <= existingStart || startMinutes >= existingEnd)) {
          throw new ConflictException(
            `Room conflict: Room '${normalizedRoom}' is already booked on ${dto.examDate} between ${this.formatTime12h(r.startTime).time12} and ${this.formatTime12h(r.endTime).time12} for ${r.exam.name} (${r.examSubject.subject.name}).`,
          );
        }
      }
    }

    // 9. Create the routine slot
    const routine = await this.prisma.examRoutine.create({
      data: {
        examId,
        examSubjectId: dto.examSubjectId,
        sectionId: dto.sectionId || null,
        examDate: targetDate,
        startTime: this.parseTimeToDate(dto.startTime),
        endTime: this.parseTimeToDate(dto.endTime),
        roomNo: dto.roomNo?.trim() || null,
        status: dto.status ?? ExamRoutineStatus.SCHEDULED,
        instructions: dto.instructions?.trim() || null,
      },
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
    });

    const formatted = this.formatRoutineSlot(routine);

    return ResponseHelper.created(
      formatted,
      `Exam routine slot for '${examSubject.subject.name}' scheduled successfully on ${dto.examDate}`,
    );
  }

  /**
   * Soft delete an exam routine slot with strict integrity validations
   */
  async softDelete(routineId: string, examId?: string) {
    const routine = await this.prisma.examRoutine.findFirst({
      where: {
        id: routineId,
        ...(examId ? { examId } : {}),
        isDeleted: false,
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            status: true,
            resultStatus: true,
            isLocked: true,
          },
        },
        examSubject: {
          include: {
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!routine) {
      throw new NotFoundException(
        'Exam routine slot not found or has already been deleted',
      );
    }

    const subjectName = routine.examSubject.subject.name;
    const examName = routine.exam.name;

    // 1. Exam Lock Guard
    if (routine.exam.isLocked) {
      throw new BadRequestException(
        `Cannot delete routine slot: Examination '${examName}' is locked. Unlock the examination first.`,
      );
    }

    // 2. Exam Results Published Guard
    if (routine.exam.resultStatus === ResultPublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot delete routine slot: Results for examination '${examName}' have already been published. Deleting timetable slots is prohibited.`,
      );
    }

    // 3. Exam Status Completed Guard
    if (routine.exam.status === ExamStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot delete routine slot of an already completed examination '${examName}'.`,
      );
    }

    // 4. Routine Status Completed Guard
    if (routine.status === ExamRoutineStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot delete routine slot for subject '${subjectName}' because it has already been marked as COMPLETED.`,
      );
    }

    // 5. Past Date & Concluded Exam Guard (Cannot delete historical exams that already happened)
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slotDate = new Date(routine.examDate);
    slotDate.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      const formattedDate = routine.examDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Cannot delete routine slot: The exam for '${subjectName}' was scheduled for ${formattedDate}, which has already passed. Historical exam records cannot be deleted. You may mark its status as CANCELLED or POSTPONED instead.`,
      );
    }

    // If today is the exam date, check if the exam has already concluded
    if (slotDate.getTime() === today.getTime()) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const endMinutes = this.timeToMinutes(routine.endTime);
      if (currentMinutes >= endMinutes) {
        throw new BadRequestException(
          `Cannot delete routine slot: The exam for '${subjectName}' concluded earlier today at ${this.formatTime12h(routine.endTime).time12}.`,
        );
      }
    }

    // 6. Student Marks Recorded Guard (Critical Data Integrity Protection)
    const marksCount = await this.prisma.mark.count({
      where: { examSubjectId: routine.examSubjectId },
    });

    if (marksCount > 0) {
      throw new BadRequestException(
        `Cannot delete routine slot: ${marksCount} student mark(s) have already been entered for subject '${subjectName}'. Remove or reset student marks before removing the routine slot.`,
      );
    }

    // 7. Student Subject Results Processed Guard
    const resultsCount = await this.prisma.studentSubjectResult.count({
      where: { examSubjectId: routine.examSubjectId },
    });

    if (resultsCount > 0) {
      throw new BadRequestException(
        `Cannot delete routine slot: Student subject results have already been calculated and processed for '${subjectName}'.`,
      );
    }

    // 8. Execute Soft Delete
    await this.prisma.examRoutine.update({
      where: { id: routineId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: ExamRoutineStatus.CANCELLED,
      },
    });

    return ResponseHelper.success(
      null,
      `Exam routine slot for subject '${subjectName}' soft deleted successfully`,
    );
  }
}
