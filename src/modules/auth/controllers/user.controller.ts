import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { QueryUserDto } from '../dto/query-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Auth) Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'সব ইউজারের তালিকা দেখা (List all users)',
    description:
      'সিস্টেমের সকল ইউজারের তালিকা দেখা যাবে। নাম, ইমেইল বা ফোন দিয়ে সার্চ এবং রোল অনুযায়ী ফিল্টার করা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'ইউজার তালিকা সফলভাবে পাওয়া গেছে' })
  async findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'নির্দিষ্ট ইউজারের তথ্য দেখা (Get user details)',
    description:
      'ইউজার আইডি (UUID) দিয়ে তার প্রোফাইল, তার কোন কোন রোল আছে এবং রোলগুলোর পারমিশন দেখা যাবে।',
  })
  @ApiResponse({ status: 200, description: 'ইউজার ডিটেইলস সফলভাবে পাওয়া গেছে' })
  @ApiResponse({ status: 404, description: 'ইউজার খুঁজে পাওয়া যায়নি' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }
}
