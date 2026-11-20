import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { QueryPermissionDto } from '../dto/query-permission.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Auth) Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({
    summary: 'নতুন পারমিশন তৈরি করা (Create a new permission)',
    description:
      'সিস্টেমে একটি নতুন পারমিশন কি-ওয়ার্ড (যেমন: EXAM_CREATE, MARKS_ENTRY, FEES_COLLECT) তৈরি করা যাবে।',
  })
  @ApiResponse({ status: 201, description: 'পারমিশন সফলভাবে তৈরি হয়েছে' })
  @ApiResponse({ status: 400, description: 'এই নামের পারমিশন আগে থেকেই বিদ্যমান' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'সকল পারমিশনের তালিকা দেখা (Get all permissions)',
    description:
      'সিস্টেমের সমস্ত পারমিশনের তালিকা, বিবরণ এবং পেজিনেশন ও সার্চিং সুবিধা দেখা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'পারমিশন তালিকা সফলভাবে পাওয়া গেছে' })
  async findAll(@Query() query: QueryPermissionDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'নির্দিষ্ট পারমিশনের বিবরণ দেখা (Get single permission detail)',
    description: 'পারমিশন আইডি দিয়ে নির্দিষ্ট একটি পারমিশনের বিস্তারিত তথ্য দেখা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'পারমিশন তথ্য সফলভাবে পাওয়া গেছে' })
  @ApiResponse({ status: 404, description: 'পারমিশন খুঁজে পাওয়া যায়নি' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'পারমিশন আপডেট করা (Update permission details)',
    description: 'পারমিশনের নাম বা বিবরণ পরিবর্তন করা যাবে। নাম পরিবর্তন করলে ডুপ্লিকেট নাম প্রতিরোধ করা হবে।',
  })
  @ApiResponse({ status: 200, description: 'পারমিশন সফলভাবে আপডেট হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভ্যালিডেশন ব্যর্থ বা পারমিশনের নাম ইতিমধ্যে বিদ্যমান' })
  @ApiResponse({ status: 404, description: 'পারমিশন খুঁজে পাওয়া যায়নি' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'পারমিশন ডিলিট করা (Delete a permission)',
    description:
      'একটি অব্যবহৃত পারমিশন মুছে ফেলা যাবে। তবে কোনো রোলের সাথে যুক্ত পারমিশন সরাসরি মোছা যাবে না।',
  })
  @ApiResponse({ status: 200, description: 'পারমিশন সফলভাবে ডিলিট হয়েছে' })
  @ApiResponse({ status: 400, description: 'পারমিশনটি কোনো রোলের সাথে যুক্ত থাকায় ডিলিট করা যায়নি' })
  @ApiResponse({ status: 404, description: 'পারমিশন খুঁজে পাওয়া যায়নি' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.delete(id);
  }
}
