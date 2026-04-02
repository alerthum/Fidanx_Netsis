import { Controller, Get, Post, Param, Query, Put, Body } from '@nestjs/common';
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

    @Post()
    async createInvoice(@Body() body: {
        faturaTuru: '1' | '2';
        cariKodu: string;
        tarih?: string;
        vadeTarihi?: string;
        aciklama?: string;
        items: Array<{ stokKodu: string; miktar: number; birimFiyat: number; kdvOrani?: number }>;
    }) {
        return this.invoicesService.createInvoice(body);
    }

    @Get(':belgeNo/details')
    async getInvoiceDetails(
        @Param('belgeNo') belgeNo: string,
        @Query('cariKodu') cariKodu: string,
        @Query('faturaTuru') faturaTuru?: string,
    ) {
        return this.invoicesService.getInvoiceDetails(belgeNo, cariKodu, faturaTuru);
    }

    @Put(':belgeNo')
    async updateInvoice(
        @Param('belgeNo') belgeNo: string,
        @Body() body: { cariKodu: string; faturaTuru: string; items: any[]; totals: any }
    ) {
        return this.invoicesService.updateInvoice(belgeNo, body.cariKodu, body.faturaTuru, body.items, body.totals);
    }
}
