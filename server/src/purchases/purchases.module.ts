import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { ActivityModule } from '../activity/activity.module';
import { NetsisModule } from '../netsis/netsis.module';

@Module({
  imports: [ActivityModule, NetsisModule],
    controllers: [PurchasesController],
    providers: [PurchasesService],
})
export class PurchasesModule { }
