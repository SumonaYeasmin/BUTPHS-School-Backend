import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IssueTcDto } from './dto/issue-tc.dto';
import { QueryTcDto } from './dto/query-tc.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class TransferCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate sequential TC Number for the given academic year
   * Format: TC-YYYY-XXXX (e.g., TC-2026-0001)
   */
  async generateNextTcNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const count = await this.prisma.studentTransferCertificate.count({
      where: {
        issueDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });

    const nextSerial = String(count + 1).padStart(4, '0');
    return `TC-${year}-${nextSerial}`;
  }

  /**
   * Issue Transfer Certificate (TC) atomically:
   * 1. Validate student and status
   * 2. Find active enrollment
   * 3. Create TC record
   * 4. Update student status to TRANSFERRED
   * 5. Update enrollment status to TRANSFERRED
   * 6. Deactivate active RFID cards
   */
  async issue(dto: IssueTcDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            schoolClass: true,
            section: true,
            academicYear: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        parents: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    if (student.status === 'TRANSFERRED') {
      throw new ConflictException(
        'Student has already been issued a Transfer Certificate and is marked as TRANSFERRED.',
      );
    }

    if (student.status === 'GRADUATED') {
      throw new BadRequestException('Student has already graduated from the school.');
    }

    const activeEnrollment = student.enrollments[0];
    const tcNumber = await this.generateNextTcNumber();
    const leavingDate = new Date(dto.leavingDate);
    const issueDate = new Date();

    // Execute atomic transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create TC record
      const tc = await tx.studentTransferCertificate.create({
        data: {
          studentId: student.id,
          enrollmentId: activeEnrollment?.id,
          tcNumber,
          issueDate,
          leavingDate,
          reason: dto.reason,
          duesCleared: dto.duesCleared ?? true,
          conductRemarks: dto.conductRemarks ?? 'উত্তম ও সন্তোষজনক',
          leavingClass: activeEnrollment?.schoolClass.name || 'N/A',
          promotedToNextClass: dto.promotedToNextClass ?? false,
          destinationSchool: dto.destinationSchool,
          remarks: dto.remarks,
          documentUrl: dto.documentUrl,
        },
      });

      // 2. Mark student as TRANSFERRED
      await tx.student.update({
        where: { id: student.id },
        data: { status: 'TRANSFERRED' },
      });

      // 3. Mark current enrollment as TRANSFERRED
      if (activeEnrollment) {
        await tx.studentEnrollment.update({
          where: { id: activeEnrollment.id },
          data: { status: 'TRANSFERRED' },
        });
      }

      // 4. Deactivate any active RFID card
      await tx.studentRFIDcard.updateMany({
        where: { studentId: student.id, status: 'ACTIVE' },
        data: {
          status: 'BLOCKED',
          remarks: 'Deactivated due to school transfer (TC issued).',
        },
      });

      return tc;
    });

    // Fetch School Profile for complete response
    const schoolProfile = await this.prisma.schoolProfile.findFirst();

    // Find father and mother names
    const father = student.parents.find((p) => p.relationship === 'FATHER')?.parent?.name;
    const mother = student.parents.find((p) => p.relationship === 'MOTHER')?.parent?.name;

    return ResponseHelper.created(
      {
        ...result,
        student: {
          id: student.id,
          studentId: student.studentId,
          nameEn: student.nameEn,
          nameBn: student.nameBn,
          dateOfBirth: student.dateOfBirth,
          fatherName: father || null,
          motherName: mother || null,
          presentAddress: student.presentAddress,
          permanentAddress: student.permanentAddress,
        },
        academicInfo: activeEnrollment
          ? {
              academicYear: activeEnrollment.academicYear.name,
              class: activeEnrollment.schoolClass.name,
              section: activeEnrollment.section.name,
              roll: activeEnrollment.roll,
            }
          : null,
        school: schoolProfile
          ? {
              name: schoolProfile.name,
              eiin: schoolProfile.eiin,
              schoolCode: schoolProfile.schoolCode,
              address: schoolProfile.address,
              phone: schoolProfile.phone,
              email: schoolProfile.email,
              logo: schoolProfile.logo,
            }
          : null,
      },
      'Transfer Certificate (TC) issued successfully',
    );
  }

  /**
   * List all issued Transfer Certificates with pagination and search
   */
  async findAll(query: QueryTcDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentTransferCertificateWhereInput = {};

    if (query.search) {
      where.OR = [
        { tcNumber: { contains: query.search, mode: 'insensitive' } },
        { student: { nameEn: { contains: query.search, mode: 'insensitive' } } },
        { student: { nameBn: { contains: query.search, mode: 'insensitive' } } },
        { student: { studentId: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.fromDate) {
      where.issueDate = {
        ...(where.issueDate as Prisma.DateTimeFilter),
        gte: new Date(query.fromDate),
      };
    }

    if (query.toDate) {
      where.issueDate = {
        ...(where.issueDate as Prisma.DateTimeFilter),
        lte: new Date(query.toDate),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.studentTransferCertificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              nameEn: true,
              nameBn: true,
              dateOfBirth: true,
              gender: true,
              photo: true,
            },
          },
          enrollment: {
            include: {
              schoolClass: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.studentTransferCertificate.count({ where }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(items, meta, 'Transfer Certificates retrieved successfully');
  }

  /**
   * Get single TC by ID for printing or viewing
   */
  async findOne(id: string) {
    const tc = await this.prisma.studentTransferCertificate.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            parents: {
              include: { parent: true },
            },
          },
        },
        enrollment: {
          include: {
            schoolClass: true,
            section: true,
            academicYear: true,
          },
        },
      },
    });

    if (!tc) {
      throw new NotFoundException('Transfer Certificate');
    }

    const schoolProfile = await this.prisma.schoolProfile.findFirst();

    const father = tc.student.parents.find((p) => p.relationship === 'FATHER')?.parent?.name;
    const mother = tc.student.parents.find((p) => p.relationship === 'MOTHER')?.parent?.name;

    return ResponseHelper.success(
      {
        ...tc,
        fatherName: father || null,
        motherName: mother || null,
        school: schoolProfile,
      },
      'Transfer Certificate details retrieved successfully',
    );
  }

  /**
   * Public Verification Endpoint for QR Code scanning
   * Verifies authenticity without requiring login
   */
  async verifyByTcNumber(tcNumber: string) {
    const tc = await this.prisma.studentTransferCertificate.findUnique({
      where: { tcNumber },
      include: {
        student: {
          select: {
            studentId: true,
            nameEn: true,
            nameBn: true,
            dateOfBirth: true,
          },
        },
        enrollment: {
          include: {
            schoolClass: { select: { name: true } },
            academicYear: { select: { name: true } },
          },
        },
      },
    });

    if (!tc) {
      throw new NotFoundException('Transfer Certificate not found or invalid');
    }

    const schoolProfile = await this.prisma.schoolProfile.findFirst();

    return ResponseHelper.success(
      {
        isValid: true,
        tcNumber: tc.tcNumber,
        issueDate: tc.issueDate,
        leavingDate: tc.leavingDate,
        studentNameEn: tc.student.nameEn,
        studentNameBn: tc.student.nameBn,
        studentId: tc.student.studentId,
        leavingClass: tc.leavingClass,
        schoolName: schoolProfile?.name || 'School Authority',
        eiin: schoolProfile?.eiin || null,
        verificationStatus: 'GENUINE & VERIFIED',
      },
      'Transfer Certificate verified successfully',
    );
  }
}
