import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { Prisma, StaffStatus, StaffType } from '../../../../prisma/generated/client';

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

  async findAll(query: QueryStaffDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {};

    // 1. Staff Type Filter
    if (query.staffType) {
      where.staffType = query.staffType;
    }

    // 2. Status / Former Staff Filter
    if (query.status) {
      where.status = query.status;
    } else if (query.isFormer === true) {
      where.status = { in: [StaffStatus.RETIRED, StaffStatus.RESIGNED] };
    } else if (query.isFormer === false) {
      where.status = StaffStatus.ACTIVE;
    }

    // 3. Department & Structure Filter
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.staffStructureId) {
      where.staffStructureId = query.staffStructureId;
    }

    // 4. Employment & Demographic Filters
    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    // 5. Multi-field Search
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { nid: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 6. Dynamic Sorting
    const sortBy = query.sortBy || 'displayOrder';
    const sortOrder = query.sortOrder || 'asc';
    const orderBy: Prisma.StaffOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { displayOrder: 'asc' },
    ];

    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
          staffStructure: {
            select: { id: true, designation: true, totalPositions: true },
          },
          _count: {
            select: {
              teacherAssignments: true,
              classRoutines: true,
              sectionClassTeachers: true,
            },
          },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(items, meta, 'Staff list retrieved successfully');
  }

  // Get single staff profile by ID with full details (assignments, routines, department, structure)
   
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
              include: { subject: { select: { id: true, name: true, officialCode: true } } },
            },
          },
        },
        sectionClassTeachers: {
          include: {
            section: {
              include: {
                schoolClass: { select: { id: true, name: true } },
              },
            },
            academicYear: { select: { id: true, name: true } },
          },
        },
        classRoutines: {
          include: {
            section: { select: { id: true, name: true } },
            teacherAssignment: {
              include: {
                schoolClass: { select: { id: true, name: true } },
                classSubject: {
                  include: { subject: { select: { id: true, name: true, officialCode: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member');
    }

    return ResponseHelper.success(staff, 'Staff profile retrieved successfully');
  }

  /**
   * Get staff profile by unique Employee ID (e.g. T-2026-0001)
   */
  async findByEmployeeId(employeeId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { employeeId },
      include: {
        department: true,
        staffStructure: true,
        teacherAssignments: {
          include: {
            schoolClass: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            classSubject: {
              include: { subject: { select: { id: true, name: true, officialCode: true } } },
            },
          },
        },
        sectionClassTeachers: {
          include: {
            section: {
              include: {
                schoolClass: { select: { id: true, name: true } },
              },
            },
            academicYear: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with Employee ID "${employeeId}"`);
    }

    return ResponseHelper.success(staff, 'Staff profile retrieved successfully');
  }

  /**
   * Get HR / Staff aggregate statistics for admin dashboard
   */
  async getStatistics() {
    const [
      totalStaff,
      activeTeachers,
      activeOfficers,
      activeEmployees,
      formerStaff,
      permanentStaff,
      contractualStaff,
    ] = await Promise.all([
      this.prisma.staff.count(),
      this.prisma.staff.count({
        where: { staffType: StaffType.TEACHER, status: StaffStatus.ACTIVE },
      }),
      this.prisma.staff.count({
        where: { staffType: StaffType.OFFICER, status: StaffStatus.ACTIVE },
      }),
      this.prisma.staff.count({
        where: { staffType: StaffType.EMPLOYEE, status: StaffStatus.ACTIVE },
      }),
      this.prisma.staff.count({
        where: { status: { in: [StaffStatus.RETIRED, StaffStatus.RESIGNED] } },
      }),
      this.prisma.staff.count({
        where: { employmentType: 'PERMANENT', status: StaffStatus.ACTIVE },
      }),
      this.prisma.staff.count({
        where: { employmentType: 'CONTRACTUAL', status: StaffStatus.ACTIVE },
      }),
    ]);

    return ResponseHelper.success(
      {
        totalStaff,
        activeTeachers,
        activeOfficers,
        activeEmployees,
        formerStaff,
        employmentBreakdown: {
          permanent: permanentStaff,
          contractual: contractualStaff,
        },
      },
      'Staff statistics retrieved successfully',
    );
  }


  async update(id: string, dto: UpdateStaffDto) {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        staffStructure: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Staff member');
    }

    // 1. Employee ID Uniqueness Check (excluding self)
    if (dto.employeeId && dto.employeeId !== existing.employeeId) {
      const idConflict = await this.prisma.staff.findUnique({
        where: { employeeId: dto.employeeId },
      });
      if (idConflict) {
        throw new ConflictException(
          `Employee ID "${dto.employeeId}" is already assigned to another staff member.`,
        );
      }
    }

    // 2. NID Uniqueness Check (excluding self)
    if (dto.nid && dto.nid !== existing.nid) {
      const nidConflict = await this.prisma.staff.findUnique({
        where: { nid: dto.nid },
      });
      if (nidConflict) {
        throw new ConflictException(
          `National ID (NID) "${dto.nid}" is already registered to another staff member.`,
        );
      }
    }

    // 3. Department Validation
    if (dto.departmentId && dto.departmentId !== existing.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department');
      }
    }

    let designation = dto.designation;
    let staffType = dto.staffType;
    let departmentId = dto.departmentId;

    // 4. Staff Structure (Approved Post) Transfer / Promotion Validation
    if (dto.staffStructureId && dto.staffStructureId !== existing.staffStructureId) {
      const targetStructure = await this.prisma.staffStructure.findFirst({
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

      if (!targetStructure) {
        throw new NotFoundException('Staff Structure / Approved Post');
      }

      // Check quota vacancy
      const activeCount = targetStructure._count.staffList;
      if (activeCount >= targetStructure.totalPositions) {
        throw new BadRequestException(
          `Cannot transfer staff to "${targetStructure.designation}". The approved quota is already full (${activeCount}/${targetStructure.totalPositions} positions filled).`,
        );
      }

      // Auto-inherit designation, staffType, and department from target structure if not explicitly provided
      if (!designation) {
        designation = targetStructure.designation;
      }
      if (!staffType) {
        staffType = targetStructure.staffType;
      }
      if (!departmentId && targetStructure.departmentId) {
        departmentId = targetStructure.departmentId;
      }
    } else if (
      // If reactivating back to ACTIVE under same structure, check quota
      dto.status === StaffStatus.ACTIVE &&
      existing.status !== StaffStatus.ACTIVE &&
      existing.staffStructureId
    ) {
      const currentStructure = await this.prisma.staffStructure.findFirst({
        where: { id: existing.staffStructureId, isDeleted: false },
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

      if (
        currentStructure &&
        currentStructure._count.staffList >= currentStructure.totalPositions
      ) {
        throw new BadRequestException(
          `Cannot reactivate staff under "${currentStructure.designation}". Quota is currently full (${currentStructure._count.staffList}/${currentStructure.totalPositions}). Please increase quota first.`,
        );
      }
    }

    // 5. Leaving Date logic based on Status
    let leavingDate: Date | null | undefined = undefined;
    if (dto.leavingDate !== undefined) {
      leavingDate = dto.leavingDate ? new Date(dto.leavingDate) : null;
    } else if (dto.status) {
      if (
        dto.status === StaffStatus.RETIRED ||
        dto.status === StaffStatus.RESIGNED ||
        dto.status === StaffStatus.TERMINATED
      ) {
        // Automatically set leaving date if not already recorded
        leavingDate = existing.leavingDate || new Date();
      } else if (dto.status === StaffStatus.ACTIVE) {
        // Clear leaving date if reactivated
        leavingDate = null;
      }
    }

    // 6. Execute Update
    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.photo !== undefined && { photo: dto.photo }),
        ...(designation !== undefined && { designation }),
        ...(dto.qualification !== undefined && { qualification: dto.qualification }),
        ...(staffType !== undefined && { staffType }),
        ...(departmentId !== undefined && { departmentId }),
        ...(dto.staffStructureId !== undefined && { staffStructureId: dto.staffStructureId }),
        ...(dto.employmentType !== undefined && { employmentType: dto.employmentType }),
        ...(dto.fatherName !== undefined && { fatherName: dto.fatherName }),
        ...(dto.motherName !== undefined && { motherName: dto.motherName }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
        ...(dto.nid !== undefined && { nid: dto.nid }),
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.religion !== undefined && { religion: dto.religion }),
        ...(dto.presentAddress !== undefined && { presentAddress: dto.presentAddress }),
        ...(dto.permanentAddress !== undefined && { permanentAddress: dto.permanentAddress }),
        ...(dto.emergencyContact !== undefined && { emergencyContact: dto.emergencyContact }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.joiningDate !== undefined && {
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        }),
        ...(leavingDate !== undefined && { leavingDate }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.status !== undefined && { status: dto.status }),
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

    return ResponseHelper.success(updated, 'Staff profile updated successfully');
  }

  async remove(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teacherAssignments: true,
            classRoutines: true,
            sectionClassTeachers: true,
          },
        },
        administrator: {
          select: { id: true, designation: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member');
    }

    const { teacherAssignments, classRoutines, sectionClassTeachers } = staff._count;
    const hasAdminRole = !!staff.administrator;

    if (
      teacherAssignments > 0 ||
      classRoutines > 0 ||
      sectionClassTeachers > 0 ||
      hasAdminRole
    ) {
      const reasons: string[] = [];
      if (teacherAssignments > 0) reasons.push(`${teacherAssignments} assigned subject(s)`);
      if (classRoutines > 0) reasons.push(`${classRoutines} class routine(s)`);
      if (sectionClassTeachers > 0) reasons.push('class teacher assignment(s)');
      if (hasAdminRole) {
        reasons.push(
          `administrative leadership position (${staff.administrator?.designation})`,
        );
      }

      throw new BadRequestException(
        `Cannot delete "${staff.name}". This staff member has active institutional records: ${reasons.join(', ')}. To preserve academic and institutional history, please update their status to "RETIRED" or "RESIGNED" instead.`,
      );
    }

    await this.prisma.staff.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      `Staff member "${staff.name}" (${staff.employeeId || id}) has been successfully deleted.`,
    );
  }
}
