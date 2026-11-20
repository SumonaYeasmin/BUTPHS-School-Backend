import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransferCertificateService } from './transfer-certificate.service';
import { IssueTcDto } from './dto/issue-tc.dto';
import { QueryTcDto } from './dto/query-tc.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('(Academic) Transfer Certificates (TC)')
@Controller('academic/transfer-certificates')
export class TransferCertificateController {
  constructor(
    private readonly tcService: TransferCertificateService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Issue a Transfer Certificate (TC) for a student (Admin only)',
    description:
      'Creates a permanent TC record, updates student and enrollment status to TRANSFERRED, deactivates active RFID cards, and calculates age at leaving.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer Certificate issued successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or student is already graduated',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Student has already been issued a TC',
  })
  async issue(@Body() dto: IssueTcDto) {
    return this.tcService.issue(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all issued Transfer Certificates with pagination and search',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transfer certificates retrieved successfully',
  })
  async findAll(@Query() query: QueryTcDto) {
    return this.tcService.findAll(query);
  }

  @Get('verify/:tcNumber')
  @ApiOperation({
    summary: 'Public Verification Endpoint for QR Code scanning',
    description:
      'Allows external schools or authorities to verify certificate authenticity without login by scanning the QR code.',
  })
  @ApiParam({
    name: 'tcNumber',
    description: 'Sequential TC number (e.g., TC-2026-0001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result returned',
  })
  @ApiResponse({
    status: 404,
    description: 'Transfer certificate not found or invalid',
  })
  async verifyByTcNumber(@Param('tcNumber') tcNumber: string) {
    return this.tcService.verifyByTcNumber(tcNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER', 'PARENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get full Transfer Certificate details by ID for viewing/printing',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the transfer certificate record',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Transfer certificate not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tcService.findOne(id);
  }
}
