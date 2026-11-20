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
import { UserService } from '../services/user.service';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Auth) User-Role Assignment')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UserRoleController {
  constructor(private readonly userService: UserService) {}

  @Post(':userId/roles')
  @ApiOperation({
    summary: 'ইউজারকে নতুন রোল দেওয়া (Assign roles to user)',
    description:
      'নির্দিষ্ট একজন ইউজারকে এক বা একাধিক রোল (যেমন: TEACHER, ACCOUNTANT) অ্যাসাইন করা যাবে। আগের রোল ঠিক রেখে নতুন রোল যোগ হবে।',
  })
  @ApiResponse({ status: 201, description: 'রোল সফলভাবে অ্যাসাইন করা হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভুল রোল আইডি বা কোনো রোল পাওয়া যায়নি' })
  @ApiResponse({ status: 404, description: 'ইউজার খুঁজে পাওয়া যায়নি' })
  async assignRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.userService.assignRoles(userId, dto);
  }

  @Patch(':userId/roles')
  @ApiOperation({
    summary: 'ইউজারের রোল আপডেট/সিঙ্ক করা (Update/Sync user roles)',
    description:
      'ইউজারের বর্তমান রোলগুলো পরিবর্তন করে নতুন তালিকা অনুযায়ী সেট করা হবে। আগের রোল মুছে গিয়ে শুধুমাত্র সিলেক্ট করা নতুন রোলগুলো সক্রিয় থাকবে।',
  })
  @ApiResponse({ status: 200, description: 'ইউজারের রোল সফলভাবে আপডেট হয়েছে' })
  @ApiResponse({ status: 400, description: 'ভুল রোল আইডি প্রদান করা হয়েছে' })
  @ApiResponse({ status: 404, description: 'ইউজার খুঁজে পাওয়া যায়নি' })
  async updateUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.userService.updateUserRoles(userId, dto);
  }

  @Get(':userId/roles')
  @ApiOperation({
    summary: 'ইউজারের সক্রিয় রোল ও পারমিশন দেখা (Get user assigned roles)',
    description:
      'নির্দিষ্ট একজন ইউজারের বর্তমানে কোন কোন রোল সক্রিয় আছে এবং সেই রোলের কী কী পারমিশন আছে তা বিস্তারিত দেখা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'ইউজারের রোল তালিকা সফলভাবে পাওয়া গেছে' })
  @ApiResponse({ status: 404, description: 'ইউজার খুঁজে পাওয়া যায়নি' })
  async getUserRoles(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.userService.getUserRoles(userId);
  }

  @Delete(':userId/roles/:roleId')
  @ApiOperation({
    summary: 'ইউজার থেকে রোল প্রত্যাহার করা (Revoke role from user)',
    description:
      'নির্দিষ্ট একজন ইউজার থেকে কোনো একটি রোল রিমুভ বা বাতিল করা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'ইউজার থেকে রোল সফলভাবে প্রত্যাহার করা হয়েছে' })
  @ApiResponse({ status: 404, description: 'ইউজার বা রোল অ্যাসাইনমেন্ট পাওয়া যায়নি' })
  async removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.userService.removeRole(userId, roleId);
  }
}
