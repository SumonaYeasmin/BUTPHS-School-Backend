import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Department (e.g., বিজ্ঞান বিভাগ, Accounts, Office Management)
   */
  async create(dto: CreateDepartmentDto) {
    // 1. Check for existing name
    const existingByName = await this.prisma.department.findUnique({
      where: { name: dto.name },
    });
    if (existingByName) {
      throw new ConflictException(`Department with name "${dto.name}" already exists.`);
    }

    // 2. Check for existing code if provided
    if (dto.code) {
      const existingByCode = await this.prisma.department.findUnique({
        where: { code: dto.code },
      });
      if (existingByCode) {
        throw new ConflictException(`Department with code "${dto.code}" already exists.`);
      }
    }

    // 3. Create Department
    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
        status: dto.status,
      },
    });

    return ResponseHelper.created(department, 'Department created successfully');
  }

  /**
   * List all departments with search, status filtering, and pagination
   * Ordered by displayOrder ASC, name ASC
   */
  async findAll(query: QueryDepartmentDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              staffList: true,
              staffStructures: true,
            },
          },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(items, meta, 'Departments retrieved successfully');
  }

  /**
   * Get single Department details with staff and sanctioned post counts
   */
  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        staffStructures: {
          select: {
            id: true,
            designation: true,
            staffType: true,
            totalPositions: true,
            filledPositions: true,
          },
        },
        _count: {
          select: {
            staffList: true,
            staffStructures: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department');
    }

    return ResponseHelper.success(department, 'Department details retrieved successfully');
  }
}
