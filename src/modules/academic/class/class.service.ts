import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    const trimmedName = dto.name.trim();

    // 1. Check if class with same name already exists
    const existingByName = await this.prisma.schoolClass.findUnique({
      where: { name: trimmedName },
    });
    if (existingByName) {
      throw new ConflictException(
        `Class with name '${trimmedName}' already exists`,
      );
    }

    // 2. Check if class with same numeric value already exists
    const existingByNumeric = await this.prisma.schoolClass.findUnique({
      where: { numericValue: dto.numericValue },
    });
    if (existingByNumeric) {
      throw new ConflictException(
        `Class with numeric value '${dto.numericValue}' already exists (${existingByNumeric.name})`,
      );
    }

    // 3. Create class (and optional sections) in an atomic transaction
    const schoolClass = await this.prisma.$transaction(async (tx) => {
      const createdClass = await tx.schoolClass.create({
        data: {
          name: trimmedName,
          numericValue: dto.numericValue,
          ...(dto.sections && dto.sections.length > 0
            ? {
                sections: {
                  create: dto.sections.map((secName) => ({
                    name: secName.trim(),
                  })),
                },
              }
            : {}),
        },
        include: {
          sections: true,
        },
      });

      return createdClass;
    });

    return ResponseHelper.created(
      schoolClass,
      `Class '${schoolClass.name}' created successfully`,
    );
  }

  async findAll() {
    const classes = await this.prisma.schoolClass.findMany({
      orderBy: { numericValue: 'asc' },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            sections: true,
            enrollments: true,
            classSubjects: true,
          },
        },
      },
    });

    return ResponseHelper.success(classes, 'Classes retrieved successfully');
  }

  async findOne(id: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
        classSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sections: true,
            exams: true,
          },
        },
      },
    });

    if (!schoolClass) {
      throw new NotFoundException('Class');
    }

    return ResponseHelper.success(
      schoolClass,
      'Class details retrieved successfully',
    );
  }
}
