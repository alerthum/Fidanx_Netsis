import { Module, forwardRef } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { TemperatureService } from './temperature.service';
import { FertilizerService } from './fertilizer.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [forwardRef(() => ActivityModule)],
  controllers: [ProductionController],
  providers: [ProductionService, TemperatureService, FertilizerService],
  exports: [ProductionService, TemperatureService, FertilizerService]
})
export class ProductionModule { }
