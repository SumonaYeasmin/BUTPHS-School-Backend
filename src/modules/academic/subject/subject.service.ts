import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { ConflictException } from '../../../common/exceptions/business.exception';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code?.trim() || null;

    // 1. Check if subject with same name already exists
    const existingByName = await this.prisma.subject.findUnique({
      where: { name: trimmedName },
    });

    if (existingByName) {
      throw new ConflictException(
        `Subject with name '${trimmedName}' already exists`,
      );
    }

    // 2. Check if subject with same board code already exists (if code provided)
    if (trimmedCode) {
      const existingByCode = await this.prisma.subject.findUnique({
        where: { code: trimmedCode },
      });

      if (existingByCode) {
        throw new ConflictException(
          `Subject with board code '${trimmedCode}' already exists`,
        );
      }
    }

    // 3. Create the subject in master catalog
    const subject = await this.prisma.subject.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        description: dto.description?.trim() || null,
      },
    });

    return ResponseHelper.created(
      subject,
      `Subject '${subject.name}' created successfully`,
    );
  }
}
