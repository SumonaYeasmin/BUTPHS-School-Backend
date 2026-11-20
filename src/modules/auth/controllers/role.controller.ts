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
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Auth) Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({
    summary: 'নতুন রোল তৈরি করা (Create a new role)',
    description:
      'সিস্টেমে একটি নতুন রোল (যেমন: TEACHER, ACCOUNTANT, LIBRARIAN) সংজ্ঞায়িত করা যাবে। নাম স্বয়ংক্রিয়ভাবে আপারকেস হবে।',
  })
  @ApiResponse({ status: 201, description: 'রোল সফলভাবে তৈরি হয়েছে' })
  @ApiResponse({ status: 400, description: 'এই নামের রোল আগে থেকেই বিদ্যমান' })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'সব রোলের তালিকা দেখা (Get all roles)',
    description:
      'সিস্টেমের সমস্ত রোল, রোলের বিবরণ এবং কতজন ইউজার এই রোলে যুক্ত আছেন তা দেখা যাবে। পেজিনেশন ও সার্চ সমর্থিত।',
  })
  @ApiResponse({ status: 200, description: 'রোলের তালিকা সফলভাবে পাওয়া গেছে' })
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'নির্দিষ্ট রোলের তথ্য দেখা (Get single role detail)',
    description: 'রোল আইডি দিয়ে রোলের নাম, বিবরণ ও অ্যাসাইন করা ইউজারের সংখ্যা দেখা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'রোলের তথ্য সফলভাবে পাওয়া গেছে' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'রোলের তথ্য আপডেট করা (Update role details)',
    description: 'রোলের নাম বা বিবরণ পরিবর্তন করা যাবে। সিস্টেমের সুরক্ষিত রোল (ADMIN, SUPER_ADMIN) রিনেম করা যাবে না।',
  })
  @ApiResponse({ status: 200, description: 'রোল সফলভাবে আপডেট হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভ্যালিডেশন ব্যর্থ বা সুরক্ষিত রোল রিনেমের চেষ্টা' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'রোল ডিলিট করা (Delete a role)',
    description:
      'রোল স্থায়ীভাবে মুছে ফেলা যাবে। তবে সুরক্ষিত সিস্টেম রোল এবং কোনো ইউজারের সাথে যুক্ত রোল মুছে ফেলা যাবে না।',
  })
  @ApiResponse({ status: 200, description: 'রোল সফলভাবে ডিলিট হয়েছে' })
  @ApiResponse({ status: 400, description: 'সিস্টেম রোল অথবা সক্রিয় ইউজার থাকায় ডিলিট করা যায়নি' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.delete(id);
  }
}
