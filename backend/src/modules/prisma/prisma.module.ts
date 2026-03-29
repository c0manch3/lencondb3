import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaReadonlyService } from './prisma-readonly.service';

@Global()
@Module({
  providers: [PrismaService, PrismaReadonlyService],
  exports: [PrismaService, PrismaReadonlyService],
})
export class PrismaModule {}
