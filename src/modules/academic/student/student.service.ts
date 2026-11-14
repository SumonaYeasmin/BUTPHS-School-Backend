import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    // 1. Resolve Academic Year
    let academicYearId = dto.academicYearId;
    let academicYearName = '';

    if (academicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (!year) {
        throw new NotFoundException('Academic year');
      }
      academicYearName = year.name;
    } else {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
      });
      if (!activeYear) {
        throw new BadRequestException(
          'No active academic year found. Please specify academicYearId or set an active academic year.',
        );
      }
      academicYearId = activeYear.id;
      academicYearName = activeYear.name;
    }

    // 2. Verify School Class exists
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });
    if (!schoolClass) {
      throw new NotFoundException('Class');
    }

    // 3. Verify Section exists and belongs to this Class
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
    });
    if (!section) {
      throw new NotFoundException('Section');
    }
    if (section.classId !== dto.classId) {
      throw new BadRequestException(
        `Section '${section.name}' does not belong to class '${schoolClass.name}'`,
      );
    }

    // 4. Verify Academic Group exists (if provided)
    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException('Academic group');
      }
    }

    // 5. Verify Roll Number uniqueness in (academicYearId, classId, sectionId, roll)
    const existingRoll = await this.prisma.studentEnrollment.findUnique({
      where: {
        academicYearId_classId_sectionId_roll: {
          academicYearId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          roll: dto.roll,
        },
      },
    });

    if (existingRoll) {
      throw new ConflictException(
        `Roll number ${dto.roll} is already assigned in ${schoolClass.name} (Section: ${section.name}) for this academic year`,
      );
    }

    // 6. Handle Unique Student Identifiers
    let finalStudentId = dto.studentId?.trim();
    if (finalStudentId) {
      const existingStudentId = await this.prisma.student.findUnique({
        where: { studentId: finalStudentId },
      });
      if (existingStudentId) {
        throw new ConflictException(
          `Student with ID '${finalStudentId}' already exists`,
        );
      }
    } else {
      const yearPrefix =
        academicYearName.match(/\d{4}/)?.[0] ||
        new Date().getFullYear().toString();
      const count = await this.prisma.student.count();
      finalStudentId = `STU${yearPrefix}${String(count + 1).padStart(4, '0')}`;
    }

    if (dto.birthCertificateNo?.trim()) {
      const existingBCN = await this.prisma.student.findUnique({
        where: { birthCertificateNo: dto.birthCertificateNo.trim() },
      });
      if (existingBCN) {
        throw new ConflictException(
          `Student with birth certificate number '${dto.birthCertificateNo.trim()}' already exists`,
        );
      }
    }

    if (dto.rfidCardNo?.trim()) {
      const existingRFID = await this.prisma.student.findUnique({
        where: { rfidCardNo: dto.rfidCardNo.trim() },
      });
      if (existingRFID) {
        throw new ConflictException(
          `Student with RFID card number '${dto.rfidCardNo.trim()}' already exists`,
        );
      }
    }

    // 7. Atomic Transaction: Create Student Profile + Initial Enrollment
    const admissionDate = dto.admissionDate
      ? new Date(dto.admissionDate)
      : new Date();
    const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          studentId: finalStudentId,
          name: dto.name.trim(),
          gender: dto.gender,
          dateOfBirth,
          bloodGroup: dto.bloodGroup?.trim() || null,
          religion: dto.religion?.trim() || null,
          birthCertificateNo: dto.birthCertificateNo?.trim() || null,
          rfidCardNo: dto.rfidCardNo?.trim() || null,
          photo: dto.photo?.trim() || null,
          presentAddress: dto.presentAddress?.trim() || null,
          permanentAddress: dto.permanentAddress?.trim() || null,
          admissionDate,
          status: 'ACTIVE',
        },
      });

      const enrollment = await tx.studentEnrollment.create({
        data: {
          studentId: student.id,
          academicYearId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          groupId: dto.groupId || null,
          roll: dto.roll,
          enrollmentDate: admissionDate,
          status: 'ACTIVE',
        },
        include: {
          academicYear: { select: { id: true, name: true } },
          schoolClass: {
            select: { id: true, name: true, numericValue: true },
          },
          section: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
        },
      });

      return {
        ...student,
        currentEnrollment: enrollment,
      };
    });

    return ResponseHelper.created(
      result,
      `Student '${result.name}' (${result.studentId}) admitted and enrolled successfully in ${schoolClass.name} (Section: ${section.name})`,
    );
  }

  async findAll(query: QueryStudentDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { studentId: { contains: term, mode: 'insensitive' } },
        { birthCertificateNo: { contains: term, mode: 'insensitive' } },
        { rfidCardNo: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.academicYearId || query.classId || query.sectionId) {
      const enrollmentFilter: Prisma.StudentEnrollmentWhereInput = {};
      if (query.academicYearId)
        enrollmentFilter.academicYearId = query.academicYearId;
      if (query.classId) enrollmentFilter.classId = query.classId;
      if (query.sectionId) enrollmentFilter.sectionId = query.sectionId;

      where.enrollments = {
        some: enrollmentFilter,
      };
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrollments: {
            where: query.academicYearId
              ? { academicYearId: query.academicYearId }
              : undefined,
            orderBy: { enrollmentDate: 'desc' },
            take: 1,
            include: {
              academicYear: {
                select: { id: true, name: true, isActive: true },
              },
              schoolClass: {
                select: { id: true, name: true, numericValue: true },
              },
              section: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
          parents: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  occupation: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(
      students,
      meta,
      'Students retrieved successfully',
    );
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { enrollmentDate: 'desc' },
          include: {
            academicYear: {
              select: { id: true, name: true, isActive: true },
            },
            schoolClass: {
              select: { id: true, name: true, numericValue: true },
            },
            section: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
        parents: {
          include: {
            parent: true,
          },
        },
        promotions: {
          include: {
            fromEnrollment: {
              include: {
                schoolClass: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
            toEnrollment: {
              include: {
                schoolClass: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    return ResponseHelper.success(
      student,
      'Student details retrieved successfully',
    );
  }
}
