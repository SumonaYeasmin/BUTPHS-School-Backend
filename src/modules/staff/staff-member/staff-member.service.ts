import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { Prisma, StaffType } from '../../../../prisma/generated/client';

@Injectable()
export class StaffMemberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate sequential Employee ID based on StaffType and Year
   * Formats: T-YYYY-XXXX, OFF-YYYY-XXXX, EMP-YYYY-XXXX
   */
  async generateEmployeeId(staffType: StaffType): Promise<string> {
    const year = new Date().getFullYear();
    const prefixMap: Record<StaffType, string> = {
      [StaffType.TEACHER]: 'T',
      [StaffType.OFFICER]: 'OFF',
      [StaffType.EMPLOYEE]: 'EMP',
    };
    const prefix = prefixMap[staffType] || 'EMP';

    const count = await this.prisma.staff.count({
      where: {
        staffType,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
    });

    const nextSerial = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSerial}`;
  }

  /**
   * Create a new Staff member (Teacher, Officer, or Employee)
   */
  async create(dto: CreateStaffDto) {
    let designation = dto.designation;
    let staffType = dto.staffType;
    let departmentId = dto.departmentId;

    // 1. Validate Staff Structure (Approved Post) if provided
    if (dto.staffStructureId) {
      const structure = await this.prisma.staffStructure.findFirst({
        where: { id: dto.staffStructureId, isDeleted: false },
        include: {
          _count: {
            select: {
              staffList: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      });

      if (!structure) {
        throw new NotFoundException('Staff Structure / Approved Post');
      }

      // Check quota vacancy
      const activeCount = structure._count.staffList;
      if (activeCount >= structure.totalPositions) {
        throw new BadRequestException(
          `The approved quota for "${structure.designation}" is already full (${activeCount}/${structure.totalPositions} positions filled). Please increase the quota before appointing new staff.`,
        );
      }

      // Auto-inherit designation, staffType, and department from approved post if not explicitly passed
      if (!designation) {
        designation = structure.designation;
      }
      if (!staffType) {
        staffType = structure.staffType;
      }
      if (!departmentId && structure.departmentId) {
        departmentId = structure.departmentId;
      }
    }

    // 2. Ensure designation and staffType exist
    if (!designation) {
      throw new BadRequestException(
        'Designation is required. Please provide designation or select an approved post (staffStructureId).',
      );
    }
    if (!staffType) {
      throw new BadRequestException(
        'Staff type (TEACHER, OFFICER, EMPLOYEE) is required. Please provide staffType or select an approved post.',
      );
    }

    // 3. Validate Department if provided
    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department');
      }
    }

    // 4. Resolve or Auto-generate Employee ID
    let employeeId = dto.employeeId;
    if (employeeId) {
      const existingId = await this.prisma.staff.findUnique({
        where: { employeeId },
      });
      if (existingId) {
        throw new ConflictException(`Employee ID "${employeeId}" is already in use.`);
      }
    } else {
      employeeId = await this.generateEmployeeId(staffType);
    }

    // 5. Check NID uniqueness if provided
    if (dto.nid) {
      const existingNid = await this.prisma.staff.findUnique({
        where: { nid: dto.nid },
      });
      if (existingNid) {
        throw new ConflictException(`National ID (NID) "${dto.nid}" is already registered.`);
      }
    }

    // 6. Create Staff Profile
    const staff = await this.prisma.staff.create({
      data: {
        employeeId,
        name: dto.name,
        photo: dto.photo,
        designation,
        qualification: dto.qualification,
        staffType,
        departmentId,
        staffStructureId: dto.staffStructureId,
        employmentType: dto.employmentType,
        fatherName: dto.fatherName,
        motherName: dto.motherName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        nid: dto.nid,
        bloodGroup: dto.bloodGroup,
        religion: dto.religion,
        presentAddress: dto.presentAddress,
        permanentAddress: dto.permanentAddress,
        emergencyContact: dto.emergencyContact,
        phone: dto.phone,
        email: dto.email,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status,
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        staffStructure: {
          select: { id: true, designation: true, totalPositions: true },
        },
      },
    });

    return ResponseHelper.created(staff, 'Staff member created successfully');
  }

  /**
   * List staff with filtering, search, and pagination
   * Ordered by displayOrder ASC, joiningDate ASC
   */
  async findAll(query: QueryStaffDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {};

    if (query.staffType) {
      where.staffType = query.staffType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.staffStructureId) {
      where.staffStructureId = query.staffStructureId;
    }

    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { designation: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { joiningDate: 'asc' }],
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
          staffStructure: {
            select: { id: true, designation: true, totalPositions: true },
          },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(items, meta, 'Staff list retrieved successfully');
  }

  /**
   * Get single staff profile by ID
   */
  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        staffStructure: true,
        teacherAssignments: {
          include: {
            schoolClass: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            classSubject: {
              include: { subject: { select: { id: true, name: true } } },
            },
          },
        },
        classRoutines: {
          include: {
            section: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member');
    }

    return ResponseHelper.success(staff, 'Staff profile retrieved successfully');
  }
}
