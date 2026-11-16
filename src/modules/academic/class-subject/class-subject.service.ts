import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, SubjectCategory } from '../../../../prisma/generated/client';
import { AssignClassSubjectDto } from './dto/assign-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { RolloverClassSubjectDto } from './dto/rollover-class-subject.dto';
import { QueryClassSubjectDto } from './dto/query-class-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Assign a master subject to a specific class & academic year
   */
  async assign(dto: AssignClassSubjectDto) {
    // Validate Academic Year
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic Year');

    // Validate School Class
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });
    if (!schoolClass) throw new NotFoundException('School Class');

    // Validate Subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject');

    // Validate Group (if provided)
    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) throw new NotFoundException('Academic Group');
    }

    // Business check for Nullable GroupId duplicate prevention
    const existing = await this.prisma.classSubject.findFirst({
      where: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        groupId: dto.groupId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Subject '${subject.name}' is already assigned to ${schoolClass.name} for this academic year`,
      );
    }

    const classSubject = await this.prisma.classSubject.create({
      data: {
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        groupId: dto.groupId ?? null,
        isOptional: dto.isOptional ?? false,
        displayOrder: dto.displayOrder ?? 0,
        isActive: true,
      },
      include: {
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: { select: { id: true, name: true, officialCode: true, category: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return ResponseHelper.created(
      classSubject,
      `Subject '${subject.name}' assigned to ${schoolClass.name} successfully`,
    );
  }

  /**
   * 2. Find all class subjects with filters
   */
  async findAll(query?: QueryClassSubjectDto) {
    const where: Prisma.ClassSubjectWhereInput = {};

    if (query?.academicYearId) where.academicYearId = query.academicYearId;
    if (query?.classId) where.classId = query.classId;
    if (query?.groupId) where.groupId = query.groupId;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    const classSubjects = await this.prisma.classSubject.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true, isActive: true } },
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
            displayOrder: true,
          },
        },
        group: { select: { id: true, name: true } },
      },
      orderBy: [
        { schoolClass: { numericValue: 'asc' } },
        { displayOrder: 'asc' },
      ],
    });

    return ResponseHelper.success(
      classSubjects,
      'Class subjects retrieved successfully',
    );
  }

  /**
   * 3. Toggle active status of a class subject
   */
  async toggleActive(id: string, isActive: boolean) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Class Subject');

    const updated = await this.prisma.classSubject.update({
      where: { id },
      data: { isActive },
      include: {
        subject: { select: { name: true } },
        schoolClass: { select: { name: true } },
      },
    });

    const statusLabel = isActive ? 'activated' : 'deactivated';
    return ResponseHelper.success(
      updated,
      `Subject '${updated.subject.name}' for ${updated.schoolClass.name} has been ${statusLabel}`,
    );
  }

  /**
   * 4. Get class subject details by ID
   */
  async findOne(id: string) {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id },
      include: {
        academicYear: true,
        schoolClass: true,
        subject: true,
        group: true,
        teacherAssignments: {
          include: {
            staff: { select: { id: true, name: true, designation: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!classSubject) throw new NotFoundException('Class Subject');

    return ResponseHelper.success(
      classSubject,
      'Class subject details retrieved successfully',
    );
  }

  /**
   * 5. Update class subject (group, optional status, or displayOrder)
   */
  async update(id: string, dto: UpdateClassSubjectDto) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Class Subject');

    const updateData: Prisma.ClassSubjectUpdateInput = {};

    if (dto.groupId !== undefined) {
      if (dto.groupId) {
        const group = await this.prisma.academicGroup.findUnique({
          where: { id: dto.groupId },
        });
        if (!group) throw new NotFoundException('Academic Group');
      }

      // Check if moving to this group creates a duplicate
      const duplicate = await this.prisma.classSubject.findFirst({
        where: {
          academicYearId: existing.academicYearId,
          classId: existing.classId,
          subjectId: existing.subjectId,
          groupId: dto.groupId ?? null,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'This subject is already assigned to this class and group for this academic year',
        );
      }

      updateData.group = dto.groupId
        ? { connect: { id: dto.groupId } }
        : { disconnect: true };
    }

    if (dto.isOptional !== undefined) updateData.isOptional = dto.isOptional;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;

    const updated = await this.prisma.classSubject.update({
      where: { id },
      data: updateData,
      include: {
        schoolClass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, officialCode: true } },
        group: { select: { id: true, name: true } },
      },
    });

    return ResponseHelper.success(
      updated,
      'Class subject updated successfully',
    );
  }

  /**
   * 6. Safe delete a class subject
   */
  async remove(id: string) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { id },
      include: {
        teacherAssignments: true,
        subject: { select: { name: true } },
        schoolClass: { select: { name: true } },
      },
    });
    if (!existing) throw new NotFoundException('Class Subject');

    if (existing.teacherAssignments.length > 0) {
      throw new BadRequestException(
        `Cannot remove '${existing.subject.name}' from ${existing.schoolClass.name} because it is actively assigned to ${existing.teacherAssignments.length} teacher(s). Please unassign the teacher(s) first.`,
      );
    }

    await this.prisma.classSubject.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      `Subject '${existing.subject.name}' has been safely removed from ${existing.schoolClass.name}`,
    );
  }

  /**
   * 7. Yearly Rollover: Copy all active class subjects from one academic year to the next
   */
  async rollover(dto: RolloverClassSubjectDto) {
    if (dto.fromAcademicYearId === dto.toAcademicYearId) {
      throw new BadRequestException(
        'Source and target academic years cannot be the same',
      );
    }

    const [fromYear, toYear] = await Promise.all([
      this.prisma.academicYear.findUnique({ where: { id: dto.fromAcademicYearId } }),
      this.prisma.academicYear.findUnique({ where: { id: dto.toAcademicYearId } }),
    ]);

    if (!fromYear) throw new NotFoundException('Source Academic Year');
    if (!toYear) throw new NotFoundException('Target Academic Year');

    // Get active subjects from source academic year
    const sourceSubjects = await this.prisma.classSubject.findMany({
      where: {
        academicYearId: dto.fromAcademicYearId,
        isActive: true,
      },
    });

    if (sourceSubjects.length === 0) {
      throw new BadRequestException(
        `No active subjects found in source academic year '${fromYear.name}' to copy`,
      );
    }

    // Check subjects already assigned to target academic year
    const existingInTarget = await this.prisma.classSubject.findMany({
      where: { academicYearId: dto.toAcademicYearId },
    });

    const existingKeys = new Set(
      existingInTarget.map(
        (s) => `${s.classId}_${s.subjectId}_${s.groupId ?? 'null'}`,
      ),
    );

    const toCopy = sourceSubjects.filter(
      (s) =>
        !existingKeys.has(`${s.classId}_${s.subjectId}_${s.groupId ?? 'null'}`),
    );

    if (toCopy.length === 0) {
      return ResponseHelper.success(
        { copiedCount: 0, skippedCount: sourceSubjects.length },
        `All active subjects from '${fromYear.name}' are already present in '${toYear.name}'`,
      );
    }

    // Bulk copy in transaction
    await this.prisma.$transaction(
      toCopy.map((s) =>
        this.prisma.classSubject.create({
          data: {
            academicYearId: dto.toAcademicYearId,
            classId: s.classId,
            subjectId: s.subjectId,
            groupId: s.groupId,
            isOptional: s.isOptional,
            displayOrder: s.displayOrder,
            isActive: true,
          },
        }),
      ),
    );

    return ResponseHelper.success(
      {
        copiedCount: toCopy.length,
        skippedCount: sourceSubjects.length - toCopy.length,
        fromYear: fromYear.name,
        toYear: toYear.name,
      },
      `Successfully rolled over ${toCopy.length} subjects to academic year '${toYear.name}'`,
    );
  }

  /**
   * 5. Public Website API: Get Curriculum & Booklist for a Class
   * Grouped by Subject Category with prescribed Books
   */
  async getPublicCurriculum(classId: string, academicYearId?: string) {
    // 1. Resolve Academic Year (Target or Active)
    let yearId = academicYearId;
    let yearName = '';

    if (yearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: yearId },
      });
      if (!year) throw new NotFoundException('Academic Year');
      yearName = year.name;
    } else {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
      });
      if (!activeYear) {
        throw new NotFoundException('Active academic year not found');
      }
      yearId = activeYear.id;
      yearName = activeYear.name;
    }

    // 2. Resolve Class
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });
    if (!schoolClass) throw new NotFoundException('School Class');

    // 3. Fetch Active Class Subjects
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        classId,
        academicYearId: yearId,
        isActive: true,
      },
      include: {
        subject: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // 4. Fetch Active Books for this Class
    const books = await this.prisma.book.findMany({
      where: {
        classId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Create a map of subjectId -> Books
    const booksBySubject = new Map<string, typeof books>();
    for (const book of books) {
      const list = booksBySubject.get(book.subjectId) || [];
      list.push(book);
      booksBySubject.set(book.subjectId, list);
    }

    // 5. Group subjects by SubjectCategory
    const categoryMap = new Map<SubjectCategory, any[]>();

    for (const cs of classSubjects) {
      const cat = cs.subject.category;
      const list = categoryMap.get(cat) || [];

      // Determine display code: 9-10 show board code, 6-8 omit if null
      const displayCode =
        schoolClass.numericValue >= 9 ? cs.subject.officialCode : null;

      list.push({
        id: cs.id,
        subjectId: cs.subject.id,
        name: cs.subject.name,
        code: displayCode,
        isOptional: cs.isOptional,
        group: cs.group ? cs.group.name : null,
        description: cs.subject.description,
        books: (booksBySubject.get(cs.subject.id) || []).map((b) => ({
          id: b.id,
          name: b.name,
          bookCode: b.bookCode,
          type: b.type,
          displayOrder: b.displayOrder,
        })),
      });

      categoryMap.set(cat, list);
    }

    const groupedCategories = Array.from(categoryMap.entries()).map(
      ([category, subjects]) => ({
        category,
        subjects,
      }),
    );

    return ResponseHelper.success(
      {
        academicYear: yearName,
        class: {
          id: schoolClass.id,
          name: schoolClass.name,
          numericValue: schoolClass.numericValue,
        },
        totalSubjects: classSubjects.length,
        categories: groupedCategories,
      },
      `Curriculum and booklist for ${schoolClass.name} (${yearName}) retrieved successfully`,
    );
  }
}
