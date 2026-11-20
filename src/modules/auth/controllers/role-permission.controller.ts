import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Auth) Role-Permission Assignment')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class RolePermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Post(':roleId/permissions')
  @ApiOperation({
    summary: 'রোলে পারমিশন যোগ করা (Assign permissions to role)',
    description:
      'একটি নির্দিষ্ট রোলে এক বা একাধিক পারমিশন (যেমন: MARKS_ENTRY, ATTENDANCE_TAKE) যোগ করা যাবে। আগের পারমিশন অক্ষুণ্ণ থাকবে।',
  })
  @ApiResponse({ status: 201, description: 'পারমিশন সফলভাবে রোলে যুক্ত হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভুল পারমিশন আইডি প্রদান করা হয়েছে' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async assignPermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(roleId, dto);
  }

  @Patch(':roleId/permissions')
  @ApiOperation({
    summary: 'রোলের পারমিশন তালিকা আপডেট/সিঙ্ক করা (Update/Sync role permissions)',
    description:
      'রোলের বর্তমান সব পারমিশন মুছে ফেলে নতুন সিলেক্ট করা তালিকা অনুযায়ী পারমিশন সেট করা হবে (চেকবক্স ম্যাট্রিক্সের জন্য প্রযোজ্য)।',
  })
  @ApiResponse({ status: 200, description: 'রোলের পারমিশন তালিকা সফলভাবে আপডেট হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভুল পারমিশন আইডি প্রদান করা হয়েছে' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async updateRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.roleService.updateRolePermissions(roleId, dto);
  }

  @Get(':roleId/permissions')
  @ApiOperation({
    summary: 'রোলের সক্রিয় পারমিশনের তালিকা দেখা (Get role permissions)',
    description: 'কোনো নির্দিষ্ট রোলে বর্তমানে কোন কোন পারমিশন সক্রিয় আছে তা বিস্তারিত দেখতে পাওয়া যাবে।',
  })
  @ApiResponse({ status: 200, description: 'রোলের পারমিশন তালিকা সফলভাবে পাওয়া গেছে' })
  @ApiResponse({ status: 404, description: 'রোল খুঁজে পাওয়া যায়নি' })
  async getRolePermissions(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.roleService.getRolePermissions(roleId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @ApiOperation({
    summary: 'রোল থেকে পারমিশন প্রত্যাহার করা (Revoke permission from role)',
    description: 'নির্দিষ্ট রোল থেকে যেকোনো একটি পারমিশন বাতিল বা রিমুভ করা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'রোল থেকে পারমিশন সফলভাবে প্রত্যাহার করা হয়েছে' })
  @ApiResponse({ status: 404, description: 'রোল বা পারমিশন অ্যাসাইনমেন্ট খুঁজে পাওয়া যায়নি' })
  async removePermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.roleService.removePermission(roleId, permissionId);
  }
}
