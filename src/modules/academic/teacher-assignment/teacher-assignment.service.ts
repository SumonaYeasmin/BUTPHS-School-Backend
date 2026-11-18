import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';
import { StaffStatus, StaffType } from '../../../../prisma/generated/client';

@Injectable()
export class TeacherAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a teacher to a specific Class, Section, and Subject
   * With conflict guard: prevents assigning 2 teachers to the same subject simultaneously.
   */
  async assign(dto: AssignTeacherDto) {
    // 1. Validate Staff (Must exist, be ACTIVE, and be TEACHER)
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff) {
      throw new NotFoundException('Teacher / Staff member');
    }
    if (staff.status !== StaffStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot assign "${staff.name}". Staff status is "${staff.status}", only ACTIVE staff can be assigned to classes.`,
      );
    }
    if (staff.staffType !== StaffType.TEACHER) {
      throw new BadRequestException(
        `Staff member "${staff.name}" is designated as "${staff.staffType}", but only TEACHERs can be assigned to academic subjects.`,
      );
    }

    // 2. Validate Academic Year
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic Year');
    }

    // 3. Validate School Class
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });
    if (!schoolClass) {
      throw new NotFoundException('School Class');
    }

    // 4. Validate Section & confirm it belongs to the Class
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
    });
    if (!section) {
      throw new NotFoundException('Section');
    }
    if (section.classId !== dto.classId) {
      throw new BadRequestException(
        `Section "${section.name}" does not belong to Class "${schoolClass.name}".`,
      );
    }

    // 5. Validate ClassSubject & confirm it matches Class and Academic Year
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: dto.classSubjectId },
      include: {
        subject: { select: { id: true, name: true, officialCode: true } },
      },
    });
    if (!classSubject) {
      throw new NotFoundException('Class Subject');
    }
    if (classSubject.classId !== dto.classId) {
      throw new BadRequestException(
        `Subject "${classSubject.subject.name}" is not offered in Class "${schoolClass.name}".`,
      );
    }
    if (classSubject.academicYearId !== dto.academicYearId) {
      throw new BadRequestException(
        `Subject configuration does not belong to Academic Year "${academicYear.name}".`,
      );
    }

    // 6. Conflict Guard: Check if an active teacher is ALREADY assigned to this subject
    const activeAssignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        academicYearId: dto.academicYearId,
        sectionId: dto.sectionId,
        classSubjectId: dto.classSubjectId,
        isActive: true,
      },
      include: {
        staff: { select: { id: true, name: true, employeeId: true } },
      },
    });

    if (activeAssignment) {
      // Check if it's already the same teacher
      if (activeAssignment.staffId === dto.staffId) {
        throw new ConflictException(
          `শিক্ষক "${activeAssignment.staff.name}" (${activeAssignment.staff.employeeId}) ইতিমধ্যে এই বিষয়ের সক্রিয় দায়িত্বে নিয়োজিত আছেন।`,
        );
      }

      // If another teacher is active and replaceExisting is FALSE -> Block & Alert
      if (!dto.replaceExisting) {
        throw new BadRequestException(
          `এই বিষয়ের জন্য ইতিমধ্যে একজন শিক্ষক সক্রিয় দায়িত্বে আছেন: "${activeAssignment.staff.name}" (${activeAssignment.staff.employeeId})। একই বিষয়ে একসাথে দুইজনকে অ্যাসাইন করা সম্ভব নয়। নতুন শিক্ষক নিয়োগ করতে চাইলে 'replaceExisting: true' পাঠান অথবা বর্তমান শিক্ষককে আগে দায়িত্ব থেকে অব্যাহতি দিন।`,
        );
      }

      // If replaceExisting is TRUE -> Deactivate previous teacher's assignment
      const releaseDate = dto.assignedDate ? new Date(dto.assignedDate) : new Date();
      await this.prisma.teacherAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          isActive: false,
          releasedDate: releaseDate,
        },
      });
    }

    // 7. Create New Teacher Assignment
    const assignedDate = dto.assignedDate ? new Date(dto.assignedDate) : new Date();
    const assignment = await this.prisma.teacherAssignment.create({
      data: {
        staffId: dto.staffId,
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        classSubjectId: dto.classSubjectId,
        assignedDate,
        canEnterMarks: dto.canEnterMarks ?? true,
        isActive: true,
      },
      include: {
        staff: {
          select: { id: true, name: true, employeeId: true, designation: true },
        },
        schoolClass: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        classSubject: {
          include: {
            subject: { select: { id: true, name: true, officialCode: true } },
          },
        },
        academicYear: { select: { id: true, name: true } },
      },
    });

    return ResponseHelper.created(
      assignment,
      `শিক্ষক "${staff.name}" সফলভাবে ${schoolClass.name} (${section.name}) - ${classSubject.subject.name} বিষয়ে নিযুক্ত হয়েছেন।`,
    );
  }
}
