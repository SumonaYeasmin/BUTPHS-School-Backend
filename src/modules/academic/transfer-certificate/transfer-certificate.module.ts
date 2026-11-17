import { Module } from '@nestjs/common';
import { TransferCertificateController } from './transfer-certificate.controller';
import { TransferCertificateService } from './transfer-certificate.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransferCertificateController],
  providers: [TransferCertificateService],
  exports: [TransferCertificateService],
})
export class TransferCertificateModule {}
