import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { ActivityModule } from '../activity/activity.module';
import { IntegrationModule } from '../integration/integration.module';

@Module({
    imports: [ActivityModule, IntegrationModule],
    controllers: [PurchasesController],
    providers: [PurchasesService],
})
export class PurchasesModule { }
