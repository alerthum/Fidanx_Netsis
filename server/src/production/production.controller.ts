import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { ProductionService } from './production.service';
import { TemperatureService } from './temperature.service';

@Controller('production')
export class ProductionController {
    constructor(
        private readonly productionService: ProductionService,
        private readonly temperatureService: TemperatureService
    ) { }

    // 1. Üretim Partisi Oluşturma
    @Post('batches')
    createBatch(
        @Query('tenantId') tenantId: string,
        @Body() body: any
    ) {
        return this.productionService.createBatch(tenantId, body);
    }

    // 2. Partileri Listeleme
    @Get('batches')
    findAll(@Query('tenantId') tenantId: string) {
        return this.productionService.findAll(tenantId);
    }

    // 3. Parti Detayı
    @Get('batches/:id')
    findOne(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string
    ) {
        return this.productionService.findOne(tenantId, id);
    }

    // 4. ŞAŞIRTMA (Safha Değişimi)
    @Post('batches/:id/sasirtma')
    sasirtmaYap(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() body: any
    ) {
        return this.productionService.sasirtmaYap(tenantId, id, body);
    }

    // 5. Günlük Toplu İşlem Kaydetme (Sulama, İlaçlama, Gübre vb.)
    @Post('islem')
    islemKaydet(
        @Query('tenantId') tenantId: string,
        @Body() body: any
    ) {
        return this.productionService.islemKaydet(tenantId, body);
    }

    // 6. Fire Kaydı
    @Post('batches/:id/fire')
    fireKaydet(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() body: any
    ) {
        return this.productionService.fireKaydet(tenantId, id, body);
    }

    // 7. Satış İşlemi
    @Post('batches/:id/satis')
    satisYap(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() body: any
    ) {
        return this.productionService.satisYap(tenantId, id, body);
    }

    // ── Sera Sıcaklık Ölçümleri (Konum Bazlı) ──
    @Get('sicaklik')
    getTemperatureLogs(@Query('tenantId') tenantId: string) {
        return this.temperatureService.findAll(tenantId);
    }

    @Post('sicaklik')
    createTemperatureLog(@Query('tenantId') tenantId: string, @Body() body: any) {
        return this.temperatureService.create(tenantId, body);
    }

    @Delete('sicaklik/:id')
    deleteTemperatureLog(@Query('tenantId') tenantId: string, @Param('id') id: string) {
        return this.temperatureService.remove(tenantId, id);
    }
}
