import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { NetsisStocksService } from './stocks.service';

@Controller('netsis/stocks')
export class NetsisStocksController {
    constructor(private readonly stocksService: NetsisStocksService) { }

    @Get('list')
    async getStocks(
        @Query('tenantId') tenantId: string,
        @Query('grupKodu') grupKodu?: string,
        @Query('tedarikci') tedarikci?: string,
        @Query('arama') arama?: string,
    ) {
        const filters = (grupKodu || tedarikci || arama) ? { grupKodu, tedarikci, arama } : undefined;
        return this.stocksService.getStocks(tenantId, filters);
    }

    @Get('list-with-suppliers')
    async getStocksWithSuppliers(@Query('tenantId') tenantId: string) {
        return this.stocksService.getStocksWithSuppliers(tenantId);
    }

    @Get('movements')
    async getStockMovements(
        @Query('stokKodu') stokKodu: string,
    ) {
        return this.stocksService.getStockMovements(stokKodu);
    }

    @Get('next-code')
    async getNextCode(
        @Query('tenantId') tenantId: string,
        @Query('prefix') prefix: string
    ) {
        return this.stocksService.getNextCode(tenantId || 'demo-tenant', prefix);
    }

    @Post('consumption')
    async createConsumption(@Body() body: {
        fisNo?: string;
        aciklama?: string;
        tarih?: string;
        items: Array<{ stokKodu: string; miktar: number; birimFiyat?: number }>;
    }) {
        return this.stocksService.createConsumption(body);
    }
}
