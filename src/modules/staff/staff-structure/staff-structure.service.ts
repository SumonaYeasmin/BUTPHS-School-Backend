import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStaffStructureDto } from './dto/create-staff-structure.dto';
import { UpdateStaffStructureDto } from './dto/update-staff-structure.dto';
import { QueryStaffStructureDto } from './dto/query-staff-structure.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class StaffStructureService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an approved post (Sanctioned position) in Staff Structure
   */
  async create(dto: CreateStaffStructureDto) {
    // 1. Verify Department exists if provided
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department');
      }
    }

    // 2. Check for existing designation within the same staffType
    const existing = await this.prisma.staffStructure.findUnique({
      where: {
        designation_staffType: {
          designation: dto.designation,
          staffType: dto.staffType,
        },
      },
    });

    if (existing) {
      if (existing.isDeleted) {
        // If it was soft-deleted, restore it with new parameters
        const restored = await this.prisma.staffStructure.update({
          where: { id: existing.id },
          data: {
            totalPositions: dto.totalPositions,
            departmentId: dto.departmentId,
            isActive: dto.isActive ?? true,
            isDeleted: false,
            deletedAt: null,
          },
          include: {
            department: {
              select: { id: true, name: true, code: true },
            },
          },
        });
        return ResponseHelper.created(restored, 'Approved post restored successfully');
      }

      throw new ConflictException(
        `Approved post for "${dto.designation}" (${dto.staffType}) already exists.`,
      );
    }

    // 3. Create new record
    const structure = await this.prisma.staffStructure.create({
      data: {
        designation: dto.designation,
        staffType: dto.staffType,
        totalPositions: dto.totalPositions,
        departmentId: dto.departmentId,
        isActive: dto.isActive ?? true,
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return ResponseHelper.created(structure, 'Approved post created successfully');
  }

  /**
   * List all approved posts with real-time filledPositions & vacantPositions calculation
   */
  async findAll(query: QueryStaffStructureDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffStructureWhereInput = {
      isDeleted: false,
    };

    if (query.staffType) {
      where.staffType = query.staffType;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.designation = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.staffStructure.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ staffType: 'asc' }, { designation: 'asc' }],
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              staffList: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
      this.prisma.staffStructure.count({ where }),
    ]);

    // Map dynamic live counts for filled & vacant positions
    let formattedItems = items.map((item) => {
      const activeCount = item._count.staffList;
      const vacant = Math.max(0, item.totalPositions - activeCount);

      return {
        id: item.id,
        designation: item.designation,
        staffType: item.staffType,
        totalPositions: item.totalPositions,
        filledPositions: activeCount, // 👈 Live dynamic count
        vacantPositions: vacant,      // 👈 Live dynamic count
        department: item.department,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    if (query.hasVacancy === true) {
      formattedItems = formattedItems.filter((item) => item.vacantPositions > 0);
    }

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(
      formattedItems,
      meta,
      'Staff structures retrieved successfully',
    );
  }

  /**
   * Get single approved post details with currently assigned staff list
   */
  async findOne(id: string) {
    const structure = await this.prisma.staffStructure.findFirst({
      where: { id, isDeleted: false },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        staffList: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            employeeId: true,
            name: true,
            phone: true,
            email: true,
            joiningDate: true,
            status: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!structure) {
      throw new NotFoundException('Staff Structure / Approved Post');
    }

    const activeCount = structure.staffList.length;
    const vacant = Math.max(0, structure.totalPositions - activeCount);

    return ResponseHelper.success(
      {
        ...structure,
        filledPositions: activeCount,
        vacantPositions: vacant,
      },
      'Staff structure details retrieved successfully',
    );
  }

  /**
   * Update an approved post with integrity validations:
   * 1. Cannot reduce totalPositions below currently active staff count
   * 2. Cannot create duplicate designation + staffType
   * 3. Validates department if changed
   */
  async update(id: string, dto: UpdateStaffStructureDto) {
    const existing = await this.prisma.staffStructure.findFirst({
      where: { id, isDeleted: false },
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

    if (!existing) {
      throw new NotFoundException('Staff Structure / Approved Post');
    }

    // 1. Validate department if updated
    if (dto.departmentId && dto.departmentId !== existing.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department');
      }
    }

    // 2. Validate totalPositions against active staff count
    const activeStaffCount = existing._count.staffList;
    if (dto.totalPositions !== undefined && dto.totalPositions < activeStaffCount) {
      throw new BadRequestException(
        `Cannot reduce total positions to ${dto.totalPositions} because there are currently ${activeStaffCount} active staff members assigned to this post. Please release or reassign staff first.`,
      );
    }

    // 3. Validate designation and staffType uniqueness if changed
    const newDesignation = dto.designation || existing.designation;
    const newStaffType = dto.staffType || existing.staffType;

    if (
      (dto.designation && dto.designation !== existing.designation) ||
      (dto.staffType && dto.staffType !== existing.staffType)
    ) {
      const duplicate = await this.prisma.staffStructure.findFirst({
        where: {
          id: { not: id },
          designation: newDesignation,
          staffType: newStaffType,
          isDeleted: false,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Another approved post for "${newDesignation}" (${newStaffType}) already exists.`,
        );
      }
    }

    const updated = await this.prisma.staffStructure.update({
      where: { id },
      data: dto,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const vacantPositions = Math.max(0, updated.totalPositions - activeStaffCount);

    return ResponseHelper.success(
      {
        ...updated,
        filledPositions: activeStaffCount,
        vacantPositions,
      },
      'Staff structure updated successfully',
    );
  }

  /**
   * Soft delete an approved post
   * Prevents soft-deletion if there are active staff currently assigned
   */
  async softDelete(id: string) {
    const structure = await this.prisma.staffStructure.findFirst({
      where: { id, isDeleted: false },
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

    if (structure._count.staffList > 0) {
      throw new BadRequestException(
        `Cannot delete "${structure.designation}" because there are currently ${structure._count.staffList} active staff assigned to this post. Please reassign or release them first.`,
      );
    }

    await this.prisma.staffStructure.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return ResponseHelper.success(null, 'Staff structure soft-deleted successfully');
  }
}
