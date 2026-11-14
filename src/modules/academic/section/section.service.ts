import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionDto) {
    const trimmedName = dto.name.trim();

    // 1. Verify class exists
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });

    if (!schoolClass) {
      throw new NotFoundException('Class');
    }

    // 2. Check duplicate section name within this specific class
    const existingSection = await this.prisma.section.findUnique({
      where: {
        classId_name: {
          classId: dto.classId,
          name: trimmedName,
        },
      },
    });

    if (existingSection) {
      throw new ConflictException(
        `Section '${trimmedName}' already exists in class '${schoolClass.name}'`,
      );
    }

    // 3. Create the section
    const section = await this.prisma.section.create({
      data: {
        classId: dto.classId,
        name: trimmedName,
      },
      include: {
        schoolClass: {
          select: {
            id: true,
            name: true,
            numericValue: true,
          },
        },
      },
    });

    return ResponseHelper.created(
      section,
      `Section '${section.name}' created successfully in ${schoolClass.name}`,
    );
  }
}
