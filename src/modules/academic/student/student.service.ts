import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, BloodGroup, Religion } from '../../../../prisma/generated/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { UpdateStudentParentDto } from './dto/update-student-parent.dto';
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
      const existingRFID = await this.prisma.studentRFIDcard.findUnique({
        where: { cardNumber: dto.rfidCardNo.trim() },
      });
      if (existingRFID) {
        throw new ConflictException(
          `Student with RFID card number '${dto.rfidCardNo.trim()}' already exists`,
        );
      }
    }

    // 7. Validate Parents if provided
    if (dto.parents && dto.parents.length > 0) {
      for (const p of dto.parents) {
        if (p.parentId) {
          const parentExists = await this.prisma.parent.findUnique({
            where: { id: p.parentId },
          });
          if (!parentExists) {
            throw new NotFoundException(
              `Parent with ID '${p.parentId}' not found`,
            );
          }
        } else {
          if (!p.name?.trim() || !p.phone?.trim()) {
            throw new BadRequestException(
              'Both name and phone are required for every new parent in the admission form',
            );
          }
        }
      }
    }

    // 8. Atomic Transaction: Create Student Profile + Initial Enrollment + Optional Parents
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
          bloodGroup: (dto.bloodGroup?.trim() as BloodGroup) || null,
          religion: (dto.religion?.trim() as Religion) || null,
          birthCertificateNo: dto.birthCertificateNo?.trim() || null,
          photo: dto.photo?.trim() || null,
          presentAddress: dto.presentAddress?.trim() || null,
          permanentAddress: dto.permanentAddress?.trim() || null,
          admissionDate,
          status: 'ACTIVE',
          rfidcards: dto.rfidCardNo?.trim()
            ? {
                create: {
                  cardNumber: dto.rfidCardNo.trim(),
                  status: 'ACTIVE',
                },
              }
            : undefined,
        },
      });

      const enrollment = await tx.studentEnrollment.create({
        data: {
          studentId: student.id,
          academicYearId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          groupId: dto.groupId || null,
          optionalSubjectId: dto.optionalSubjectId || null,
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
          optionalSubject: { select: { id: true, name: true, officialCode: true } },
        },
      });

      // Link or create parents in the same atomic transaction
      const linkedParents = [];
      if (dto.parents && dto.parents.length > 0) {
        for (const p of dto.parents) {
          let resolvedParentId = p.parentId;

          if (!resolvedParentId) {
            const newParent = await tx.parent.create({
              data: {
                name: p.name!.trim(),
                phone: p.phone!.trim(),
                email: p.email?.trim() || null,
                nid: p.nid?.trim() || null,
                occupation: p.occupation?.trim() || null,
                address: p.address?.trim() || null,
              },
            });
            resolvedParentId = newParent.id;
          }

          if (p.isPrimary) {
            await tx.parentStudent.updateMany({
              where: { studentId: student.id },
              data: { isPrimary: false },
            });
          }

          const parentLink = await tx.parentStudent.create({
            data: {
              studentId: student.id,
              parentId: resolvedParentId,
              relationship: p.relationship,
              isPrimary: p.isPrimary || false,
            },
            include: {
              parent: true,
            },
          });

          linkedParents.push({
            mappingId: parentLink.id,
            relationship: parentLink.relationship,
            isPrimary: parentLink.isPrimary,
            parent: {
              id: parentLink.parent.id,
              name: parentLink.parent.name,
              phone: parentLink.parent.phone,
              email: parentLink.parent.email,
              nid: parentLink.parent.nid,
              occupation: parentLink.parent.occupation,
              address: parentLink.parent.address,
            },
          });
        }
      }

      return {
        ...student,
        currentEnrollment: enrollment,
        parents: linkedParents,
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
        { rfidcards: { some: { cardNumber: { contains: term, mode: 'insensitive' } } } },
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

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        rfidcards: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    // 1. Uniqueness check on birthCertificateNo if updated
    if (
      dto.birthCertificateNo !== undefined &&
      dto.birthCertificateNo.trim() !== student.birthCertificateNo
    ) {
      const trimmedBCN = dto.birthCertificateNo.trim();
      if (trimmedBCN) {
        const existingBCN = await this.prisma.student.findUnique({
          where: { birthCertificateNo: trimmedBCN },
        });
        if (existingBCN && existingBCN.id !== id) {
          throw new ConflictException(
            `Student with birth certificate number '${trimmedBCN}' already exists`,
          );
        }
      }
    }

    // 2. Uniqueness check on rfidCardNo if updated
    const currentActiveCard = student.rfidcards?.[0]?.cardNumber;
    if (
      dto.rfidCardNo !== undefined &&
      dto.rfidCardNo.trim() !== currentActiveCard
    ) {
      const trimmedRFID = dto.rfidCardNo.trim();
      if (trimmedRFID) {
        const existingRFID = await this.prisma.studentRFIDcard.findUnique({
          where: { cardNumber: trimmedRFID },
        });
        if (existingRFID && existingRFID.studentId !== id) {
          throw new ConflictException(
            `Student with RFID card number '${trimmedRFID}' already exists`,
          );
        }
      }
    }

    // 3. Handle Active Enrollment corrections (sectionId, groupId, roll)
    const hasEnrollmentUpdate =
      dto.sectionId !== undefined ||
      dto.groupId !== undefined ||
      dto.roll !== undefined;

    let targetEnrollmentId: string | null = null;
    let enrollmentUpdateData: Prisma.StudentEnrollmentUpdateInput | null = null;

    if (hasEnrollmentUpdate) {
      const currentEnrollment = student.enrollments[0];
      if (!currentEnrollment) {
        throw new BadRequestException(
          'Student has no active enrollment to update',
        );
      }
      targetEnrollmentId = currentEnrollment.id;
      enrollmentUpdateData = {};

      const targetSectionId = dto.sectionId ?? currentEnrollment.sectionId;
      const targetRoll = dto.roll ?? currentEnrollment.roll;

      if (
        dto.sectionId !== undefined &&
        dto.sectionId !== currentEnrollment.sectionId
      ) {
        const section = await this.prisma.section.findUnique({
          where: { id: dto.sectionId },
        });
        if (!section) {
          throw new NotFoundException('Section');
        }
        if (section.classId !== currentEnrollment.classId) {
          throw new BadRequestException(
            `Section '${section.name}' does not belong to student's currently enrolled class`,
          );
        }
        enrollmentUpdateData.section = { connect: { id: dto.sectionId } };
      }

      if (
        dto.groupId !== undefined &&
        dto.groupId !== currentEnrollment.groupId
      ) {
        if (dto.groupId) {
          const group = await this.prisma.academicGroup.findUnique({
            where: { id: dto.groupId },
          });
          if (!group) {
            throw new NotFoundException('Academic group');
          }
          enrollmentUpdateData.group = { connect: { id: dto.groupId } };
        } else {
          enrollmentUpdateData.group = { disconnect: true };
        }
      }

      if (
        dto.optionalSubjectId !== undefined &&
        dto.optionalSubjectId !== currentEnrollment.optionalSubjectId
      ) {
        if (dto.optionalSubjectId) {
          const optSubject = await this.prisma.subject.findUnique({
            where: { id: dto.optionalSubjectId },
          });
          if (!optSubject) {
            throw new NotFoundException('Optional Subject');
          }
          enrollmentUpdateData.optionalSubject = {
            connect: { id: dto.optionalSubjectId },
          };
        } else {
          enrollmentUpdateData.optionalSubject = { disconnect: true };
        }
      }

      if (
        (dto.roll !== undefined && dto.roll !== currentEnrollment.roll) ||
        (dto.sectionId !== undefined &&
          dto.sectionId !== currentEnrollment.sectionId)
      ) {
        const conflictRoll = await this.prisma.studentEnrollment.findUnique({
          where: {
            academicYearId_classId_sectionId_roll: {
              academicYearId: currentEnrollment.academicYearId,
              classId: currentEnrollment.classId,
              sectionId: targetSectionId,
              roll: targetRoll,
            },
          },
        });

        if (conflictRoll && conflictRoll.id !== currentEnrollment.id) {
          throw new ConflictException(
            `Roll number ${targetRoll} is already assigned in this section for this academic year`,
          );
        }

        if (dto.roll !== undefined) {
          enrollmentUpdateData.roll = dto.roll;
        }
      }
    }

    // 4. Prepare student update data
    const studentUpdateData: Prisma.StudentUpdateInput = {};
    if (dto.name !== undefined) studentUpdateData.name = dto.name.trim();
    if (dto.gender !== undefined) studentUpdateData.gender = dto.gender;
    if (dto.dateOfBirth !== undefined)
      studentUpdateData.dateOfBirth = dto.dateOfBirth
        ? new Date(dto.dateOfBirth)
        : null;
    if (dto.bloodGroup !== undefined)
      studentUpdateData.bloodGroup =
        (dto.bloodGroup?.trim() as BloodGroup) || null;
    if (dto.religion !== undefined)
      studentUpdateData.religion = (dto.religion?.trim() as Religion) || null;
    if (dto.birthCertificateNo !== undefined)
      studentUpdateData.birthCertificateNo =
        dto.birthCertificateNo?.trim() || null;
    if (dto.photo !== undefined)
      studentUpdateData.photo = dto.photo?.trim() || null;
    if (dto.presentAddress !== undefined)
      studentUpdateData.presentAddress = dto.presentAddress?.trim() || null;
    if (dto.permanentAddress !== undefined)
      studentUpdateData.permanentAddress = dto.permanentAddress?.trim() || null;
    if (dto.status !== undefined) studentUpdateData.status = dto.status;

    // 5. Execute in atomic transaction
    const updatedResult = await this.prisma.$transaction(async (tx) => {
      if (
        dto.rfidCardNo !== undefined &&
        dto.rfidCardNo.trim() !== currentActiveCard
      ) {
        const trimmedRFID = dto.rfidCardNo.trim();
        await tx.studentRFIDcard.updateMany({
          where: { studentId: id, status: 'ACTIVE' },
          data: { status: 'BLOCKED' },
        });
        if (trimmedRFID) {
          await tx.studentRFIDcard.create({
            data: {
              studentId: id,
              cardNumber: trimmedRFID,
              status: 'ACTIVE',
            },
          });
        }
      }

      await tx.student.update({
        where: { id },
        data: studentUpdateData,
      });

      if (targetEnrollmentId && enrollmentUpdateData) {
        await tx.studentEnrollment.update({
          where: { id: targetEnrollmentId },
          data: enrollmentUpdateData,
        });
      }

      return tx.student.findUnique({
        where: { id },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
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
        },
      });
    });

    return ResponseHelper.success(
      updatedResult,
      'Student profile updated successfully',
    );
  }

  async remove(id: string, permanent = false) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            _count: {
              select: {
                attendances: true,
                marks: true,
                subjectResults: true,
                resultSummaries: true,
                promotionsFrom: true,
                promotionsTo: true,
              },
            },
          },
        },
        _count: {
          select: {
            promotions: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    if (permanent) {
      // 1. Permanent (Hard Delete) Guard: Ensure zero academic history
      let totalAttendances = 0;
      let totalMarks = 0;
      let totalResults = 0;

      for (const enr of student.enrollments) {
        totalAttendances += enr._count.attendances;
        totalMarks += enr._count.marks;
        totalResults += enr._count.subjectResults + enr._count.resultSummaries;
      }

      const issues: string[] = [];
      if (totalAttendances > 0) {
        issues.push(`${totalAttendances} attendance record(s)`);
      }
      if (totalMarks > 0) {
        issues.push(`${totalMarks} exam mark(s)`);
      }
      if (totalResults > 0) {
        issues.push(`${totalResults} result record(s)`);
      }
      if (student._count.promotions > 0) {
        issues.push(`${student._count.promotions} promotion record(s)`);
      }

      if (issues.length > 0) {
        throw new BadRequestException(
          `Cannot permanently delete student with academic history: ${issues.join(', ')}. Please use soft delete (status INACTIVE) instead.`,
        );
      }

      // Safe to hard delete: delete enrollments first then student atomically
      await this.prisma.$transaction(async (tx) => {
        await tx.studentEnrollment.deleteMany({
          where: { studentId: id },
        });

        await tx.student.delete({
          where: { id },
        });
      });

      return ResponseHelper.success(
        null,
        `Student '${student.name}' (${student.studentId}) permanently deleted successfully`,
      );
    }

    // 2. Default: Soft Delete (Set status to INACTIVE)
    await this.prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return ResponseHelper.success(
      null,
      `Student '${student.name}' (${student.studentId}) marked as INACTIVE (soft deleted) successfully`,
    );
  }

  /**
   * Assign or link a parent/guardian to a student.
   * - If parentId is provided, links the existing parent.
   * - If parentId is omitted, creates a new Parent record and links it.
   * - If isPrimary is true, resets previous primary parents for this student.
   */
  async assignParent(studentId: string, dto: AssignParentDto) {
    // 1. Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, studentId: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID '${studentId}' not found`);
    }

    // 2. Validate input
    if (dto.parentId) {
      const existingParent = await this.prisma.parent.findUnique({
        where: { id: dto.parentId },
      });
      if (!existingParent) {
        throw new NotFoundException(
          `Parent with ID '${dto.parentId}' not found`,
        );
      }

      // Check if already linked
      const alreadyLinked = await this.prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: dto.parentId,
            studentId,
          },
        },
      });
      if (alreadyLinked) {
        throw new ConflictException(
          `Parent '${existingParent.name}' is already linked to student '${student.name}' (${alreadyLinked.relationship})`,
        );
      }
    } else {
      if (!dto.name?.trim() || !dto.phone?.trim()) {
        throw new BadRequestException(
          'name and phone are required when creating a new parent profile',
        );
      }
    }

    // 3. Execute in atomic transaction
    const linkResult = await this.prisma.$transaction(async (tx) => {
      let resolvedParentId = dto.parentId;

      // Create new Parent profile if parentId wasn't provided
      if (!resolvedParentId) {
        const newParent = await tx.parent.create({
          data: {
            name: dto.name!.trim(),
            phone: dto.phone!.trim(),
            email: dto.email?.trim() || null,
            nid: dto.nid?.trim() || null,
            occupation: dto.occupation?.trim() || null,
            address: dto.address?.trim() || null,
          },
        });
        resolvedParentId = newParent.id;
      }

      // If this parent is marked as primary, reset any previous primary parents for this student
      if (dto.isPrimary) {
        await tx.parentStudent.updateMany({
          where: { studentId },
          data: { isPrimary: false },
        });
      }

      // Create ParentStudent relationship link
      const parentStudent = await tx.parentStudent.create({
        data: {
          parentId: resolvedParentId,
          studentId,
          relationship: dto.relationship,
          isPrimary: dto.isPrimary || false,
        },
        include: {
          parent: true,
        },
      });

      return parentStudent;
    });

    return ResponseHelper.created(
      linkResult,
      `Parent '${linkResult.parent.name}' successfully linked to student '${student.name}' as ${linkResult.relationship}`,
    );
  }

  /**
   * Get all parents/guardians assigned to a student
   */
  async getStudentParents(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, studentId: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID '${studentId}' not found`);
    }

    const links = await this.prisma.parentStudent.findMany({
      where: { studentId },
      include: {
        parent: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const parentsList = links.map((link) => ({
      mappingId: link.id,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
      createdAt: link.createdAt,
      parent: {
        id: link.parent.id,
        name: link.parent.name,
        phone: link.parent.phone,
        email: link.parent.email,
        nid: link.parent.nid,
        occupation: link.parent.occupation,
        address: link.parent.address,
      },
    }));

    return ResponseHelper.success(
      {
        student,
        totalParents: links.length,
        parents: parentsList,
      },
      `Parents/guardians for student '${student.name}' retrieved successfully`,
    );
  }

  /**
   * Update a student-parent relationship (e.g. change relationship type or promote to isPrimary)
   */
  async updateStudentParent(
    studentId: string,
    parentId: string,
    dto: UpdateStudentParentDto,
  ) {
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      include: {
        parent: true,
        student: true,
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Parent-Student relationship not found for this student and parent',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // If setting this parent as primary, reset all other parents of this student
      if (dto.isPrimary) {
        await tx.parentStudent.updateMany({
          where: { studentId },
          data: { isPrimary: false },
        });
      }

      return tx.parentStudent.update({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
        data: {
          relationship:
            dto.relationship !== undefined ? dto.relationship : undefined,
          isPrimary: dto.isPrimary !== undefined ? dto.isPrimary : undefined,
        },
        include: {
          parent: true,
        },
      });
    });

    return ResponseHelper.success(
      updated,
      `Parent relationship for '${updated.parent.name}' updated successfully`,
    );
  }

  /**
   * Unlink a parent from a student
   */
  async removeStudentParent(studentId: string, parentId: string) {
    const link = await this.prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      include: {
        parent: true,
        student: true,
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Parent-Student relationship not found for this student and parent',
      );
    }

    await this.prisma.parentStudent.delete({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    return ResponseHelper.success(
      null,
      `Parent '${link.parent.name}' unlinked from student '${link.student.name}' successfully`,
    );
  }
}
