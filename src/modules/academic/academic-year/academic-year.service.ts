import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { ConflictException } from '../../../common/exceptions/business.exception';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicYearDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be earlier than end date');
    }

    const trimmedName = dto.name.trim();

    const existingYear = await this.prisma.academicYear.findUnique({
      where: { name: trimmedName },
    });

    if (existingYear) {
      throw new ConflictException(
        `Academic year '${trimmedName}' already exists`,
      );
    }

    const isActive = dto.isActive ?? false;

    // Use transaction to ensure single active year if isActive is true
    const academicYear = await this.prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.academicYear.create({
        data: {
          name: trimmedName,
          startDate,
          endDate,
          isActive,
        },
      });
    });

    return ResponseHelper.created(
      academicYear,
      `Academic year '${academicYear.name}' created successfully`,
    );
  }
}

