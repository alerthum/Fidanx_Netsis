import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Get()
    async getActivities(@Query('tenantId') tenantId: string) {
        return this.activityService.findAll(tenantId);
    }

    @Post()
    async logActivity(@Query('tenantId') tenantId: string, @Body() data: any) {
        return this.activityService.log(tenantId, data);
    }
}
