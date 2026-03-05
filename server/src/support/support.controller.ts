
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Get()
    findAll(@Query('tenantId') tenantId: string) {
        return this.supportService.findAll(tenantId);
    }

    @Post()
    create(@Query('tenantId') tenantId: string, @Body() data: any) {
        return this.supportService.create(tenantId, data);
    }
}
