import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, BookType } from '../../../../prisma/generated/client';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/business.exception';

@Injectable()
export class BookService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new prescribed book for a class & subject
   */
  async create(dto: CreateBookDto) {
    const trimmedName = dto.name.trim();

    // 1. Validate School Class
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: dto.classId },
    });
    if (!schoolClass) throw new NotFoundException('School Class');

    // 2. Validate Subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject');

    // 3. Check for duplicates (same class, subject, and book name)
    const existing = await this.prisma.book.findUnique({
      where: {
        classId_subjectId_name: {
          classId: dto.classId,
          subjectId: dto.subjectId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Book '${trimmedName}' is already prescribed for ${schoolClass.name} under subject '${subject.name}'`,
      );
    }

    // 4. Create Book entry
    const book = await this.prisma.book.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        name: trimmedName,
        bookCode: dto.bookCode?.trim() || null,
        type: dto.type ?? BookType.TEXTBOOK,
        displayOrder: dto.displayOrder ?? 0,
        isActive: true,
      },
      include: {
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: { select: { id: true, name: true, officialCode: true, category: true } },
      },
    });

    return ResponseHelper.created(
      book,
      `Book '${book.name}' added to ${schoolClass.name} (${subject.name}) successfully`,
    );
  }

  /**
   * Get all books with optional filters (classId, subjectId, type, search, isActive)
   */
  async findAll(query?: QueryBookDto) {
    const where: Prisma.BookWhereInput = {};

    if (query?.classId) where.classId = query.classId;
    if (query?.subjectId) where.subjectId = query.subjectId;
    if (query?.type) where.type = query.type;
    if (query?.isActive !== undefined) where.isActive = query.isActive;

    if (query?.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { bookCode: { contains: term, mode: 'insensitive' } },
      ];
    }

    const books = await this.prisma.book.findMany({
      where,
      include: {
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
          },
        },
      },
      orderBy: [
        { schoolClass: { numericValue: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return ResponseHelper.success(books, 'Books retrieved successfully');
  }

  /**
   * Get single book details by ID
   */
  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: {
          select: {
            id: true,
            name: true,
            officialCode: true,
            category: true,
            description: true,
          },
        },
      },
    });

    if (!book) throw new NotFoundException('Book');

    return ResponseHelper.success(book, 'Book details retrieved successfully');
  }

  /**
   * Update book details by ID
   */
  async update(id: string, dto: UpdateBookDto) {
    const existing = await this.prisma.book.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Book');

    const updateData: Prisma.BookUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await this.prisma.book.findUnique({
          where: {
            classId_subjectId_name: {
              classId: existing.classId,
              subjectId: existing.subjectId,
              name: trimmedName,
            },
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `A book named '${trimmedName}' already exists for this class and subject`,
          );
        }

        updateData.name = trimmedName;
      }
    }

    if (dto.bookCode !== undefined) {
      updateData.bookCode = dto.bookCode?.trim() || null;
    }

    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.book.update({
      where: { id },
      data: updateData,
      include: {
        schoolClass: { select: { id: true, name: true, numericValue: true } },
        subject: { select: { id: true, name: true, officialCode: true, category: true } },
      },
    });

    return ResponseHelper.success(updated, 'Book updated successfully');
  }

  /**
   * Safe delete a book by ID
   */
  async remove(id: string) {
    const existing = await this.prisma.book.findUnique({
      where: { id },
      include: {
        schoolClass: { select: { name: true } },
      },
    });
    if (!existing) throw new NotFoundException('Book');

    await this.prisma.book.delete({
      where: { id },
    });

    return ResponseHelper.success(
      null,
      `Book '${existing.name}' for ${existing.schoolClass.name} has been deleted successfully`,
    );
  }
}
