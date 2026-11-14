import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { ConflictException } from '../../../common/exceptions/business.exception';

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
}

