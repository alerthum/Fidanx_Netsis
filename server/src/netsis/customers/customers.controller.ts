import { Controller, Get, Query } from '@nestjs/common';
import { NetsisCustomersService } from './customers.service';

@Controller('netsis/customers')
export class NetsisCustomersController {
    constructor(private readonly customersService: NetsisCustomersService) { }

    @Get()
    async getCustomers(
        @Query('tenantId') tenantId: string,
        @Query('type') type?: string
    ) {
        return this.customersService.getCustomerSummaries(tenantId || 'demo-tenant', type);
    }

    @Get('next-code')
    async getNextCode(
        @Query('tenantId') tenantId: string,
        @Query('prefix') prefix: string
    ) {
        return this.customersService.getNextCode(tenantId || 'demo-tenant', prefix);
    }

    @Get('summaries')
    async getCustomerSummaries(
        @Query('tenantId') tenantId: string,
        @Query('type') type?: string
    ) {
        return this.customersService.getCustomerSummaries(tenantId || 'demo-tenant', type);
    }

    @Get('transactions')
    async getCustomerTransactions(
        @Query('tenantId') tenantId: string,
        @Query('cariKod') cariKod: string,
    ) {
        return this.customersService.getCustomerTransactions(tenantId || 'demo-tenant', cariKod);
    }

    @Get('invoices')
    async getCustomerInvoices(
        @Query('tenantId') tenantId: string,
        @Query('cariKod') cariKod: string,
    ) {
        return this.customersService.getCustomerInvoices(tenantId || 'demo-tenant', cariKod);
    }
}
