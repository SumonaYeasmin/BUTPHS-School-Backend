import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { QueryPermissionDto } from '../dto/query-permission.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';

export const DEFAULT_SCHOOL_PERMISSIONS = [
  // Auth & Roles
  { name: 'USER_VIEW', description: 'View system users list and profiles' },
  { name: 'USER_CREATE', description: 'Create and register new system users' },
  { name: 'USER_UPDATE', description: 'Update user profiles, statuses, and credentials' },
  { name: 'USER_DELETE', description: 'Deactivate or delete users' },
  { name: 'ROLE_MANAGE', description: 'Create, edit, assign, and delete roles' },
  { name: 'PERMISSION_MANAGE', description: 'Manage permissions and role-permission mappings' },

  // Academic Structure
  { name: 'ACADEMIC_YEAR_MANAGE', description: 'Create, activate, and manage academic years' },
  { name: 'CLASS_MANAGE', description: 'Create, update, and manage classes' },
  { name: 'SECTION_MANAGE', description: 'Manage class sections and student capacities' },
  { name: 'SUBJECT_MANAGE', description: 'Configure master subjects and codes' },
  { name: 'CLASS_SUBJECT_MANAGE', description: 'Configure curriculum class-subject mappings' },
  { name: 'TEACHER_ASSIGN_MANAGE', description: 'Assign teachers to subjects and sections' },

  // Students & Admissions
  { name: 'STUDENT_VIEW', description: 'View student directory, profiles, and records' },
  { name: 'STUDENT_CREATE', description: 'Admit and register new students' },
  { name: 'STUDENT_UPDATE', description: 'Update student bio-data and enrollments' },
  { name: 'STUDENT_DELETE', description: 'Deactivate or remove student records' },
  { name: 'STUDENT_PROMOTION_MANAGE', description: 'Promote students to next class after session' },
  { name: 'TRANSFER_CERTIFICATE_MANAGE', description: 'Issue and verify transfer certificates (TC)' },

  // Staff & HR
  { name: 'STAFF_VIEW', description: 'View staff members directory and designations' },
  { name: 'STAFF_CREATE', description: 'Add new teachers, officers, and staff members' },
  { name: 'STAFF_UPDATE', description: 'Update staff profiles, departments, and employment status' },
  { name: 'STAFF_DELETE', description: 'Terminate or archive staff profiles' },
  { name: 'DEPARTMENT_MANAGE', description: 'Manage academic and administrative departments' },

  // Attendance
  { name: 'ATTENDANCE_TAKE', description: 'Record student and staff daily attendance' },
  { name: 'ATTENDANCE_VIEW', description: 'View attendance registers and monthly reports' },

  // Examination & Results
  { name: 'EXAM_VIEW', description: 'View examinations, schedules, and routines' },
  { name: 'EXAM_CREATE', description: 'Create and configure new examinations' },
  { name: 'EXAM_UPDATE', description: 'Update exam schedules, deadlines, and status' },
  { name: 'EXAM_DELETE', description: 'Delete or archive examinations' },
  { name: 'EXAM_ROUTINE_MANAGE', description: 'Create and manage exam routine schedules' },
  { name: 'EXAM_SUBJECT_MANAGE', description: 'Configure exam subjects, full marks, and pass marks' },
  { name: 'MARKS_ENTRY', description: 'Enter, edit, and submit student component marks' },
  { name: 'MARKS_VIEW', description: 'View grade sheets and student marks' },
  { name: 'RESULTS_PROCESS', description: 'Process, calculate GPAs, and rank merit positions' },
  { name: 'RESULTS_PUBLISH', description: 'Publish examination results to student/parent portal' },
  { name: 'GRADING_SCALE_MANAGE', description: 'Configure grading scales and grade ranges' },

  // Notices & Events
  { name: 'NOTICE_VIEW', description: 'View published notices' },
  { name: 'NOTICE_CREATE', description: 'Create and draft institutional notices' },
  { name: 'NOTICE_PUBLISH', description: 'Publish, broadcast, and archive notices' },

  // Audit Logs
  { name: 'AUDIT_LOG_VIEW', description: 'Inspect system and security audit logs' },
  { name: 'AUDIT_LOG_CREATE', description: 'Record audit log entries' },
];

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new unique permission
   */
  async create(dto: CreatePermissionDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException(
        `Permission with name '${name}' already exists.`,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        name,
        description: dto.description?.trim(),
      },
    });

    return ResponseHelper.success(
      permission,
      `Permission '${permission.name}' created successfully`,
    );
  }

  /**
   * Get all permissions with pagination and search
   */
  async findAll(query: QueryPermissionDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, permissions] = await Promise.all([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: { roles: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ResponseHelper.success(
      {
        items: permissions.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          assignedRolesCount: p._count.roles,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      'Permissions list retrieved successfully',
    );
  }

  /**
   * Get single permission details with roles that have it assigned
   */
  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: { roles: true },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' was not found.`);
    }

    return ResponseHelper.success(
      {
        id: permission.id,
        name: permission.name,
        description: permission.description,
        assignedRolesCount: permission._count.roles,
        roles: permission.roles.map((rp) => rp.role),
      },
      'Permission detail retrieved successfully',
    );
  }

  /**
   * Seed standard school management permissions into the database
   */
  async seedStandardPermissions() {
    let createdCount = 0;
    let existingCount = 0;

    for (const perm of DEFAULT_SCHOOL_PERMISSIONS) {
      const existing = await this.prisma.permission.findUnique({
        where: { name: perm.name },
      });

      if (existing) {
        existingCount++;
      } else {
        await this.prisma.permission.create({
          data: {
            name: perm.name,
            description: perm.description,
          },
        });
        createdCount++;
      }
    }

    const totalPermissions = await this.prisma.permission.count();

    return ResponseHelper.success(
      {
        createdCount,
        existingCount,
        totalPermissions,
      },
      `Permissions seeded successfully: ${createdCount} created, ${existingCount} already existed. Total: ${totalPermissions}`,
    );
  }
}
