import { Module, forwardRef } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ProductionModule } from '../production/production.module';

@Module({
    imports: [forwardRef(() => ProductionModule)],
    controllers: [ActivityController],
    providers: [ActivityService],
    exports: [ActivityService]
})
export class ActivityModule { }
