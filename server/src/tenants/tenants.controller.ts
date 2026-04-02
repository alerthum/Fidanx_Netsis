import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tenantsService.findOne(id);
    }

    @Post(':id/settings')
    updateSettings(@Param('id') id: string, @Body() settings: any) {
        return this.tenantsService.updateSettings(id, settings);
    }

    @Patch(':id/repair-encoding')
    repairEncoding(@Param('id') id: string) {
        return this.tenantsService.repairEncoding(id);
    }
}
