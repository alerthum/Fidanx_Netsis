import { Controller, Delete, Query, Post, Get, Body, Param } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('seed')
export class SeedController {
    constructor(private db: DatabaseService) { }

    @Get('setup-trk')
    async setupTrk() {
        const sql = `
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TRK]') AND type in (N'FN', N'IF', N'TF', N'FS', N'FT'))
            BEGIN
                EXEC('CREATE FUNCTION [dbo].[TRK] (@Metin NVARCHAR(MAX))
                RETURNS NVARCHAR(MAX)
                AS
                BEGIN
                    DECLARE @Sonuc NVARCHAR(MAX)
                    SET @Sonuc = @Metin
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(208), ''Ğ'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(220), ''Ü'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(222), ''Ş'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(221), ''İ'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(214), ''Ö'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(199), ''Ç'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(240), ''ğ'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(252), ''ü'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(254), ''ş'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(253), ''ı'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(246), ''ö'')
                    SET @Sonuc = REPLACE(@Sonuc, CHAR(231), ''ç'')
                    RETURN @Sonuc
                END')
            END
        `;
        await this.db.query(sql);
        return { success: true, message: 'dbo.TRK fonksiyonu tanımlandı.' };
    }

    @Post()
    async seed(@Query('tenantId') tenantId: string) {
        // 1. Tenant Kaydı
        const existingTenant = await this.db.query(`SELECT Id FROM Tenants WHERE TenantId = @tenantId`, { tenantId });
        if (existingTenant.length === 0) {
            await this.db.query(`INSERT INTO Tenants (TenantId, Name, SettingsJson) VALUES (@tenantId, 'FidanX İşletmesi', @settings)`, {
                tenantId,
                settings: JSON.stringify({
                    categories: ['Süs Bitkisi', 'Meyve Fidanı', 'Ağaç', 'Çalı'],
                    productionStages: ['VİYOL', 'KÜÇÜK_SAKSI', 'BÜYÜK_SAKSI', 'SATIŞA_HAZIR'],
                    locations: ['Sera A', 'Sera B', 'Açık Alan 1', 'Açık Alan 2', 'Depo'],
                })
            });
        }

        // 2. Önce temizlik
        await this.clear(tenantId);

        // 3. Bitkiler
        const plantData = [
            { name: 'Leylandi', category: 'Süs Bitkisi', type: 'CUTTING', currentStock: 2200, wholesalePrice: 104.5, retailPrice: 225, viyolCount: 643, cuttingCount: 45010 },
            { name: 'Alev çalısı', category: 'Süs Bitkisi', type: 'CUTTING', currentStock: 300, wholesalePrice: 83.5, retailPrice: 150, viyolCount: 44, cuttingCount: 3080 },
            { name: 'Arap yasemini', category: 'Süs Bitkisi', type: 'CUTTING', currentStock: 30, wholesalePrice: 160, retailPrice: 300, viyolCount: 8, cuttingCount: 560 }
        ];

        const plantIds: Record<string, number> = {};
        for (const p of plantData) {
            const res = await this.db.query(`INSERT INTO Plants (TenantId, Name, Category, Type, CurrentStock, WholesalePrice, RetailPrice, ViyolCount, CuttingCount) OUTPUT INSERTED.Id VALUES (@tenantId, @name, @cat, @type, @stock, @wp, @rp, @vc, @cc)`, {
                tenantId, name: p.name, cat: p.category, type: p.type, stock: p.currentStock, wp: p.wholesalePrice, rp: p.retailPrice, vc: p.viyolCount, cc: p.cuttingCount
            });
            plantIds[p.name] = res[0].Id;
        }

        // 4. Tedarikçiler
        const suppliers = [
            { name: 'Ödemiş Ceza İnfaz Kurumu', address: 'Ödemiş, İzmir' },
            { name: 'Adnan Aktaş', address: 'İzmir' }
        ];
        const supplierIds: Record<string, number> = {};
        for (const s of suppliers) {
            const res = await this.db.query(`INSERT INTO Customers (TenantId, Name, Address) OUTPUT INSERTED.Id VALUES (@tenantId, @name, @addr)`, {
                tenantId, name: s.name, addr: s.address
            });
            supplierIds[s.name] = res[0].Id;
        }

        // 5. Üretim Partileri
        const productionBatches = [
            { lotId: 'LOT-2025-LEYLANDI-001', plantName: 'Leylandi', quantity: 45010, viyolCount: 643, startDate: '2025-11-24', stage: 'VİYOL', location: 'Sera A' },
            { lotId: 'LOT-2025-ALEVCALISI-004', plantName: 'Alev çalısı', quantity: 3080, viyolCount: 44, startDate: '2025-12-17', stage: 'VİYOL', location: 'Sera A' }
        ];
        for (const b of productionBatches) {
            const res = await this.db.query(`INSERT INTO ProductionBatches (TenantId, LotId, PlantName, Quantity, ViyolCount, StartDate, Stage, Location) OUTPUT INSERTED.Id VALUES (@tenantId, @lot, @name, @qty, @vc, @date, @stage, @loc)`, {
                tenantId, lot: b.lotId, name: b.plantName, qty: b.quantity, vc: b.viyolCount, date: new Date(b.startDate), stage: b.stage, loc: b.location
            });
            const batchId = res[0].Id;
            await this.db.query(`INSERT INTO ProductionHistory (BatchId, Action) VALUES (@batchId, 'Parti oluşturuldu (Seed)')`, { batchId });
        }

        // 6. Sıcaklık ve Gübre
        await this.db.query(`INSERT INTO TemperatureLogs (TenantId, LogDate, SeraIciSabah, SeraIciOgle, SeraIciAksam) VALUES (@tenantId, @date, 1.5, 24.5, 23.1)`, { tenantId, date: new Date() });
        await this.db.query(`INSERT INTO FertilizerLogs (TenantId, LogDate, Fungusit, AminoAsit) VALUES (@tenantId, @date, 1, 1)`, { tenantId, date: new Date() });

        // 7. Aktiviteler
        await this.db.query(`INSERT INTO ActivityLogs (TenantId, Action, Title, Icon, Color) VALUES (@tenantId, 'Veri Yükleme', 'Örnek veriler MSSQL veritabanına yüklendi', '📊', 'bg-emerald-50 text-emerald-600')`, { tenantId });

        return {
            success: true,
            message: `${tenantId} için örnek veriler yüklendi.`
        };
    }

    @Delete('clear')
    async clear(@Query('tenantId') tenantId: string) {
        const tables = ['ActivityLogs', 'TemperatureLogs', 'FertilizerLogs', 'ProductionCostHistory', 'ProductionHistory', 'ProductionBatches', 'PurchaseItems', 'Purchases', 'OrderItems', 'Orders', 'Sales', 'Suppliers', 'Plants', 'RecipeItems', 'Recipes', 'SupportHistory', 'SupportTickets', 'Expenses'];

        // Customers tablosu Suppliers olarak da kullanıldığı için dikkatli silinmeli veya hepsi silinecekse:
        // ForeignKey kısıtlamaları nedeniyle tersten silmek veya ROLLBACK/DELETE ile yönetmek lazım.
        // Basitlik için FK'sız varsayarak siliyoruz:

        for (const table of tables) {
            try { await this.db.query(`DELETE FROM ${table} WHERE TenantId = @tenantId`, { tenantId }); } catch (e) { }
        }
        // Customers/Suppliers özel durum:
        await this.db.query(`DELETE FROM Customers WHERE TenantId = @tenantId`, { tenantId });

        return { message: `${tenantId} verileri temizlendi.` };
    }
}
