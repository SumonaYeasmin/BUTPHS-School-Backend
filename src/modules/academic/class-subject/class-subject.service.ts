import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/client';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { QueryClassSubjectDto } from './dto/query-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassSubjectDto) {
    // 1. Determine Academic Year (explicit or active)
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
      });
      if (!activeYear) {
        throw new BadRequestException(
          'No active academic year found. Please provide academicYearId explicitly.',
        );
      }
      academicYearId = activeYear.id;
    } else {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (!year) {
        throw new NotFoundException('AcademicYear');
      }
    }

    // 2. Validate School Class
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });
    if (!schoolClass) {
      throw new NotFoundException('SchoolClass');
    }

    // 3. Validate Subject from Master Catalog
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject');
    }

    // 4. Validate Group (if provided)
    const targetGroupId = dto.groupId || null;
    if (targetGroupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: targetGroupId },
      });
      if (!group) {
        throw new NotFoundException('AcademicGroup');
      }
    }

    // 5. Check duplicate assignment in this class for the academic year
    const existing = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        groupId: targetGroupId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Subject '${subject.name}' is already assigned to ${schoolClass.name}${targetGroupId ? ' for this academic group' : ''} in the selected academic year`,
      );
    }

    // 6. Create the ClassSubject entry
    const created = await this.prisma.classSubject.create({
      data: {
        academicYearId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        groupId: targetGroupId,
        isOptional: dto.isOptional ?? false,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        group: { select: { id: true, name: true } },
        academicYear: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    return ResponseHelper.created(
      created,
      `Subject '${subject.name}' successfully assigned to ${schoolClass.name}`,
    );
  }

  async findAll(query?: QueryClassSubjectDto) {
    const where: Prisma.ClassSubjectWhereInput = {};

    if (query?.academicYearId) {
      where.academicYearId = query.academicYearId;
    }

    if (query?.classId) {
      where.classId = query.classId;
    }

    if (query?.groupId !== undefined) {
      where.groupId = query.groupId || null;
    }

    if (query?.isOptional !== undefined) {
      where.isOptional = query.isOptional;
    }

    if (query?.search?.trim()) {
      const term = query.search.trim();
      where.subject = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where,
      orderBy: [
        { schoolClass: { numericValue: 'asc' } },
        { subject: { name: 'asc' } },
      ],
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        group: { select: { id: true, name: true } },
        academicYear: {
          select: { id: true, name: true, isActive: true },
        },
        _count: {
          select: { teacherAssignments: true },
        },
      },
    });

    return ResponseHelper.success(
      classSubjects,
      'Class subjects retrieved successfully',
    );
  }

  async findOne(id: string) {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id },
      include: {
        subject: true,
        schoolClass: true,
        group: true,
        academicYear: true,
        teacherAssignments: {
          include: {
            staff: { select: { id: true, name: true, phone: true } },
            section: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { teacherAssignments: true },
        },
      },
    });

    if (!classSubject) {
      throw new NotFoundException('ClassSubject');
    }

    return ResponseHelper.success(
      classSubject,
      'Class subject details retrieved successfully',
    );
  }

  async update(id: string, dto: UpdateClassSubjectDto) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('ClassSubject');
    }

    const targetSubjectId = dto.subjectId ?? existing.subjectId;
    let targetGroupId = existing.groupId;

    if (dto.groupId !== undefined) {
      targetGroupId = dto.groupId || null;
      if (targetGroupId) {
        const group = await this.prisma.academicGroup.findUnique({
          where: { id: targetGroupId },
        });
        if (!group) {
          throw new NotFoundException('AcademicGroup');
        }
      }
    }

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) {
        throw new NotFoundException('Subject');
      }
    }

    // Uniqueness validation if subject or group changed
    if (
      targetSubjectId !== existing.subjectId ||
      targetGroupId !== existing.groupId
    ) {
      const duplicate = await this.prisma.classSubject.findFirst({
        where: {
          id: { not: id },
          academicYearId: existing.academicYearId,
          classId: existing.classId,
          subjectId: targetSubjectId,
          groupId: targetGroupId,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'This subject is already assigned to this class and group for the specified academic year',
        );
      }
    }

    const updated = await this.prisma.classSubject.update({
      where: { id },
      data: {
        subjectId: targetSubjectId,
        groupId: targetGroupId,
        isOptional: dto.isOptional !== undefined ? dto.isOptional : undefined,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        group: { select: { id: true, name: true } },
        academicYear: {
          select: { id: true, name: true, isActive: true },
        },
        _count: {
          select: { teacherAssignments: true },
        },
      },
    });

    return ResponseHelper.success(
      updated,
      'Class subject updated successfully',
    );
  }

  async remove(id: string) {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { teacherAssignments: true },
        },
      },
    });

    if (!classSubject) {
      throw new NotFoundException('ClassSubject');
    }

    if (classSubject._count.teacherAssignments > 0) {
      throw new BadRequestException(
        `Cannot remove subject from class syllabus: ${classSubject._count.teacherAssignments} active teacher assignment(s) exist. Please reassign or remove teacher assignments first.`,
      );
    }

    await this.prisma.classSubject.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      'Subject removed from class syllabus successfully',
    );
  }
}

