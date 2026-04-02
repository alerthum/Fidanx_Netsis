import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { NetsisModule } from '../netsis/netsis.module';

@Module({
  imports: [NetsisModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule { }
