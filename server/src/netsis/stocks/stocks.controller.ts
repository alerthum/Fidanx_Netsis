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
        partiNo?: string;
        items: Array<{ stokKodu: string; miktar: number; birimFiyat?: number; partiNo?: string }>;
    }) {
        return this.stocksService.createConsumption(body);
    }

    @Post('lot-movement')
    async createLotMovement(@Body() body: {
        stokKodu: string;
        gckod: 'G' | 'C';
        miktar: number;
        partiNo: string;
        fisNo?: string;
        tarih?: string;
        birimFiyat?: number;
        aciklama?: string;
        htur?: number;
        ftirsip?: string;
        depoKodu?: string | number;
    }) {
        return this.stocksService.createLotMovement(body);
    }

    @Post('stage-card')
    async ensureOrCreateStageStock(@Body() body: {
        kaynakStokKodu: string;
        hedefStokKodu?: string;
        hedefStokAdi?: string;
        hedefSafha?: string;
        saksiBoyutu?: string;
        codePrefix?: string;
    }) {
        return this.stocksService.ensureOrCreateStageStock(body);
    }

    /** Kaynak stoktan çıkış, hedef stoğa giriş (şaşırtma / saksı değişimi). */
    @Post('transfer-sku')
    async transferSku(@Body() body: {
        kaynakStokKodu: string;
        hedefStokKodu: string;
        miktar: number;
        partiNo?: string;
        kokPartiNo?: string;
        aciklama?: string;
        tarih?: string;
        kaynakBirimMaliyet?: number;
        hedefBirimMaliyet?: number;
        yardimciMalzemeler?: Array<{ stokKodu: string; miktar: number; birimFiyat?: number }>;
    }) {
        return this.stocksService.transferBetweenStocks(body);
    }
}
