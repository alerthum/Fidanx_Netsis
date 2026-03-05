import { Controller, Get, Param, Query } from '@nestjs/common';
import { NetsisInvoicesService } from './invoices.service';
import { IntegrationService } from '../../integration/integration.service';

@Controller('netsis/invoices')
export class NetsisInvoicesController {
    constructor(
        private readonly invoicesService: NetsisInvoicesService,
        private readonly integration: IntegrationService
    ) { }

    @Get()
    async getAllInvoices(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('faturaTuru') faturaTuru?: string,
    ) {
        return this.invoicesService.getAllInvoices(
            page ? parseInt(page) : 1,
            pageSize ? parseInt(pageSize) : 20,
            faturaTuru,
        );
    }

    @Get('tab-categories')
    async getInvoiceTabCategories() {
        return this.invoicesService.getInvoiceTabCategories();
    }

    @Get('summary')
    async getShipmentSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.invoicesService.getShipmentSummary(startDate, endDate);
    }

    @Get('push')
    async pushInvoice(
        @Query('tenantId') tenantId: string,
        @Query('invoiceId') invoiceId: string,
        @Query('type') type: 'PURCHASE' | 'SALES'
    ) {
        return this.integration.pushInvoice(tenantId || 'demo-tenant', invoiceId, type);
    }

    @Get(':belgeNo/details')
    async getInvoiceDetails(
        @Param('belgeNo') belgeNo: string,
        @Query('cariKodu') cariKodu: string,
        @Query('faturaTuru') faturaTuru?: string,
    ) {
        return this.invoicesService.getInvoiceDetails(belgeNo, cariKodu, faturaTuru);
    }
}
