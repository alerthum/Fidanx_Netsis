import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
    constructor(private readonly service: PurchasesService) { }

    @Post()
    create(@Query('tenantId') tenantId: string, @Body() body: any) {
        return this.service.create(tenantId, body);
    }

    @Get()
    findAll(@Query('tenantId') tenantId: string) {
        return this.service.findAll(tenantId);
    }

    @Get('suppliers')
    async getSuppliers(@Query('tenantId') tenantId: string) {
        // PurchasesService.getSuppliers artık otomatik 320 filtresi uyguluyor
        return this.service.getSuppliers(tenantId);
    }

    @Post('suppliers')
    async createSupplier(@Query('tenantId') tenantId: string, @Body() body: any) {
        return this.service.createSupplier(tenantId, body);
    }

    @Patch(':id/status')
    updateStatus(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return this.service.updateStatus(tenantId, id, status);
    }

    @Delete(':id')
    delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
        return this.service.delete(tenantId, id);
    }
}
