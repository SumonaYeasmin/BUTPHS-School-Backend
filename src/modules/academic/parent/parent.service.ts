import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryParentDto } from './dto/query-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { NotFoundException } from '../../../common/exceptions/business.exception';
import { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of parents with search and count of linked children
   */
  async findAll(query: QueryParentDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ParentWhereInput = {};

    if (query.phone) {
      where.phone = { contains: query.phone.trim(), mode: 'insensitive' };
    }

    if (query.nid) {
      where.nid = { contains: query.nid.trim(), mode: 'insensitive' };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { nid: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, parents] = await Promise.all([
      this.prisma.parent.count({ where }),
      this.prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { students: true },
          },
        },
      }),
    ]);

    const formatted = parents.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      nid: p.nid,
      occupation: p.occupation,
      address: p.address,
      childrenCount: p._count.students,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const meta = ResponseHelper.buildPaginationMeta(total, page, limit);
    return ResponseHelper.paginated(
      formatted,
      meta,
      'Parents retrieved successfully',
    );
  }

  /**
   * Check if parent already exists by phone or NID with their linked enrolled children (for live admission suggestions)
   */
  async checkExisting(phone?: string, nid?: string) {
    if (!phone?.trim() && !nid?.trim()) {
      throw new BadRequestException('Either phone or nid must be provided to check existing parent');
    }

    const where: Prisma.ParentWhereInput = {};
    if (phone?.trim()) {
      where.phone = phone.trim();
    }
    if (nid?.trim()) {
      where.nid = nid.trim();
    }

    const parent = await this.prisma.parent.findFirst({
      where,
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
                gender: true,
                photo: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  take: 1,
                  select: {
                    roll: true,
                    schoolClass: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return ResponseHelper.success(null, 'No existing parent found with this phone/NID');
    }

    const children = parent.students.map((link) => {
      const activeEnrollment = link.student.enrollments[0];
      return {
        studentId: link.student.id,
        studentCustomId: link.student.studentId,
        studentName: link.student.nameEn,
        studentNameEn: link.student.nameEn,
        studentNameBn: link.student.nameBn,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        currentClass: activeEnrollment ? activeEnrollment.schoolClass.name : null,
        currentSection: activeEnrollment ? activeEnrollment.section.name : null,
        currentRoll: activeEnrollment ? activeEnrollment.roll : null,
      };
    });

    const result = {
      parent: {
        id: parent.id,
        name: parent.name,
        phone: parent.phone,
        email: parent.email,
        nid: parent.nid,
        occupation: parent.occupation,
        address: parent.address,
      },
      childrenCount: children.length,
      children,
    };

    return ResponseHelper.success(result, 'Parent found successfully');
  }

  /**
   * Get single parent details with full linked children profile
   */
  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
                gender: true,
                photo: true,
                status: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  take: 1,
                  include: {
                    schoolClass: {
                      select: { id: true, name: true, numericValue: true },
                    },
                    section: { select: { id: true, name: true } },
                    academicYear: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    const children = parent.students.map((link) => {
      const activeEnrollment = link.student.enrollments[0];
      return {
        mappingId: link.id,
        studentId: link.student.id,
        studentCustomId: link.student.studentId,
        studentName: link.student.nameEn,
        studentNameEn: link.student.nameEn,
        studentNameBn: link.student.nameBn,
        gender: link.student.gender,
        photo: link.student.photo,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        currentClass: activeEnrollment ? activeEnrollment.schoolClass.name : null,
        currentSection: activeEnrollment ? activeEnrollment.section.name : null,
        currentRoll: activeEnrollment ? activeEnrollment.roll : null,
        academicYear: activeEnrollment ? activeEnrollment.academicYear.name : null,
      };
    });

    const result = {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      nid: parent.nid,
      occupation: parent.occupation,
      address: parent.address,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      childrenCount: children.length,
      children,
    };

    return ResponseHelper.success(result, 'Parent details retrieved successfully');
  }

  /**
   * Update parent profile details
   */
  async update(id: string, dto: UpdateParentDto) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    const updated = await this.prisma.parent.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        phone: dto.phone !== undefined ? dto.phone.trim() : undefined,
        email: dto.email !== undefined ? dto.email.trim() : undefined,
        nid: dto.nid !== undefined ? dto.nid.trim() || null : undefined,
        occupation: dto.occupation !== undefined ? dto.occupation.trim() || null : undefined,
        address: dto.address !== undefined ? dto.address.trim() || null : undefined,
      },
    });

    return ResponseHelper.success(
      updated,
      `Parent '${updated.name}' updated successfully`,
    );
  }

  /**
   * Delete a parent profile from directory (only allowed if 0 linked children)
   */
  async remove(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true } },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID '${id}' not found`);
    }

    if (parent._count.students > 0) {
      throw new BadRequestException(
        `Cannot delete parent '${parent.name}'. This parent is linked to ${parent._count.students} student(s). Unlink all students before deleting.`,
      );
    }

    await this.prisma.parent.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      `Parent profile '${parent.name}' deleted successfully`,
    );
  }
}
