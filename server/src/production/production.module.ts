import { Module, forwardRef } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { TemperatureService } from './temperature.service';
import { FertilizerService } from './fertilizer.service';
import { ActivityModule } from '../activity/activity.module';
import { NetsisModule } from '../netsis/netsis.module';

@Module({
  imports: [forwardRef(() => ActivityModule), NetsisModule],
  controllers: [ProductionController],
  providers: [ProductionService, TemperatureService, FertilizerService],
  exports: [ProductionService, TemperatureService, FertilizerService]
})
export class ProductionModule { }
