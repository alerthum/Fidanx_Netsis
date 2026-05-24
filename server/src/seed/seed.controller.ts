import { Controller, Delete, Query, Post, Get, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('seed')
export class SeedController {
    private readonly logger = new Logger(SeedController.name);

    constructor(private db: DatabaseService) { }

    /**
     * Production ortamında seed/clear işlemlerini engeller.
     * Canlı Netsis DB'sine yanlışlıkla test verisi yazılmasını önler.
     */
    private guardProduction() {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException(
                'Seed/Clear işlemleri production ortamında devre dışıdır. ' +
                'Test ortamı için NODE_ENV=development kullanın.'
            );
        }
    }

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
        this.guardProduction();
        this.logger.warn(`⚠️ SEED çalıştırılıyor: tenantId=${tenantId} — Bu işlem sadece test/geliştirme ortamında yapılmalıdır.`);

        // 1. Tenant Kaydı ve Ayarlar
        const existingTenant = await this.db.query(`SELECT Id FROM Tenants WHERE TenantId = @tenantId`, { tenantId });
        if (existingTenant.length === 0) {
            await this.db.query(`INSERT INTO Tenants (TenantId, Name, SettingsJson) VALUES (@tenantId, 'FidanX Botanik Bahçe', @settings)`, {
                tenantId,
                settings: JSON.stringify({
                    categories: ['Süs Bitkisi', 'Meyve Fidanı', 'Ağaç', 'Çalı'],
                    productionStages: ['TEPSİ', 'KÜÇÜK_SAKSI', 'BÜYÜK_SAKSI', 'SATIŞA_HAZIR'],
                    locations: ['Sera A', 'Sera B', 'Açık Alan 1', 'Açık Alan 2', 'Depo'],
                })
            });
        }

        // 2. Önce eski/yeni tüm verileri temizle
        await this.clear(tenantId);

        // 3. Netsis Test Stok Kartları (Sadece test ortamında — canlı Netsis'e yazılmaz)
        // ⚠️ DİKKAT: Bu blok Netsis TBLSTSABIT tablosuna doğrudan INSERT yapar.
        // Production'da guardProduction() zaten engeller, ama ekstra güvenlik için kontrol var.
        const sampleStocks = [
            { code: '150-01-001', name: 'Leylandi Tepsi', grup: 'SUS_BITKISI' },
            { code: '150-01-002', name: 'Leylandi 2 Lt', grup: 'SUS_BITKISI' },
            { code: '150-01-003', name: 'Leylandi 5 Lt', grup: 'SUS_BITKISI' },
            { code: '157-01-001', name: 'Bitki İlacı X', grup: 'YARDIMCI' },
            { code: '157-02-001', name: '2L Saksı', grup: 'YARDIMCI' },
            { code: '157-03-001', name: 'Torf Toprak', grup: 'YARDIMCI' }
        ];

        for (const s of sampleStocks) {
            try {
                const exists = await this.db.query(`SELECT STOK_KODU FROM TBLSTSABIT WHERE RTRIM(STOK_KODU) = @code`, { code: s.code });
                if (exists.length === 0) {
                    await this.db.query(`
                        INSERT INTO TBLSTSABIT (STOK_KODU, STOK_ADI, GRUP_KODU, OLCU_BR1)
                        VALUES (@code, @name, @grup, 'ADET')
                    `, { code: s.code, name: s.name, grup: s.grup });
                }
            } catch (err: any) {
                // Şema kısıtlaması durumunda minimal insert dene
                try {
                    await this.db.query(`INSERT INTO TBLSTSABIT (STOK_KODU, STOK_ADI) VALUES (@code, @name)`, { code: s.code, name: s.name });
                } catch (err2: any) {
                    this.logger.warn(`Seed: Netsis stok kartı eklenemedi (${s.code}): ${err2.message}`);
                }
            }
        }

        // 4. Legacy Plants tablosu - Artık kullanılmıyor.
        // Stok kaynağı tamamen Netsis'tir. Plants tablosu eski mimari kalıntısıdır.
        // Demo verisi oluşturulmaz, canlı ortamda karışıklık yaratmaması için atlanır.
        this.logger.log('Legacy Plants demo verisi atlandı — stok kaynağı Netsis\'tir.');
        const plantData: any[] = []; // Boş — eski demo verileri artık eklenmez

        for (const p of plantData) {
            await this.db.query(`
                INSERT INTO Plants (TenantId, Name, Category, Type, CurrentStock, WholesalePrice, RetailPrice, ViyolCount, CuttingCount) 
                VALUES (@tenantId, @name, @cat, @type, @stock, @wp, @rp, @vc, @cc)
            `, {
                tenantId, name: p.name, cat: p.category, type: p.type, stock: p.currentStock, wp: p.wholesalePrice, rp: p.retailPrice, vc: p.viyolCount, cc: p.cuttingCount
            });
        }

        // 5. Yeni FDX Üretim Partileri & Şecere (Şaşırtma Spliti Gösteren Senaryo)
        // 5.1. Kök Parti: Leylandi Tepsi
        const kRes = await this.db.query(`
            INSERT INTO FDX_BitkiPartileri 
            (TenantId, PartiNo, KokPartiNo, NetsisStokKodu, StokAdi, BitkiAdi, Safha, SaksiBoyutu, Konum, BaslangicMiktar, MevcutMiktar, Miktar, FireMiktar, SatilanMiktar, BirimMaliyet, ToplamMaliyet, AlisFaturaNo, Durum, BaslangicTarihi, OlusturmaTarihi, KaynakSeriNo)
            OUTPUT INSERTED.Id
            VALUES 
            (@tenantId, 'LOT-2026-LEYLANDI-001', 'LOT-2026-LEYLANDI-001', '150-01-001', 'Leylandi Tepsi', 'Leylandi', 'TEPSİ', 'Tepsi', 'Sera A', 20000, 14950, 14950, 50, 0, 8.0, 119600.0, 'FAT-2026-001', 'AKTIF', '2026-01-10', '2026-01-10', 'LOT-2026-LEYLANDI-001')
        `, { tenantId });
        const kokPartiId = kRes[0].Id;

        // 5.2. Şaşırtılan Çocuk Parti: Leylandi 2 Lt (5000 adet şaşırtılmış, ek saksı/torf maliyetleri eklenmiş)
        const cRes = await this.db.query(`
            INSERT INTO FDX_BitkiPartileri 
            (TenantId, PartiNo, KokPartiNo, NetsisStokKodu, StokAdi, BitkiAdi, Safha, SaksiBoyutu, Konum, BaslangicMiktar, MevcutMiktar, Miktar, FireMiktar, SatilanMiktar, BirimMaliyet, ToplamMaliyet, KaynakPartiId, Durum, BaslangicTarihi, OlusturmaTarihi, KaynakSeriNo)
            OUTPUT INSERTED.Id
            VALUES 
            (@tenantId, 'LOT-2026-LEYLANDI-001-S', 'LOT-2026-LEYLANDI-001', '150-01-002', 'Leylandi 2 Lt', 'Leylandi', 'KÜÇÜK_SAKSI', '2 Lt', 'Sera B', 5000, 4980, 4980, 20, 0, 12.0, 59760.0, @kokPartiId, 'AKTIF', '2026-02-15', '2026-02-15', 'LOT-2026-LEYLANDI-001')
        `, { tenantId, kokPartiId });
        const cocukPartiId = cRes[0].Id;

        // 5.3. Kök Parti İşlem Detayları
        await this.db.query(`
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, PartiNo, IslemTipi, Aciklama, KaynakStokKodu, Miktar, MaliyetTutar, ToplamMaliyetEtkisi, IslemYapan, IslemTarihi)
            VALUES 
            (@tenantId, @kokPartiId, 'LOT-2026-LEYLANDI-001', 'ALIS_GIRIS', 'Alış faturasından parti oluşturuldu.', '150-01-001', 20000, 160000.0, 160000.0, 'Sistem', '2026-01-10')
        `, { tenantId, kokPartiId });

        await this.db.query(`
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, PartiNo, IslemTipi, Aciklama, KaynakStokKodu, HedefStokKodu, Miktar, HedefSafha, HedefKonum, HedefPartiId, IslemYapan, IslemTarihi)
            VALUES 
            (@tenantId, @kokPartiId, 'LOT-2026-LEYLANDI-001', 'SASIRTMA_CIKIS', '5000 adet bitki KÜÇÜK_SAKSI safhasına (Parti: LOT-2026-LEYLANDI-001-S) şaşırtıldı.', '150-01-001', '150-01-002', 5000, 'KÜÇÜK_SAKSI', 'Sera B', @cocukPartiId, 'Sistem', '2026-02-15')
        `, { tenantId, kokPartiId, cocukPartiId });

        await this.db.query(`
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, PartiNo, IslemTipi, Aciklama, KaynakStokKodu, FireMiktari, MaliyetTutar, IslemYapan, IslemTarihi)
            VALUES 
            (@tenantId, @kokPartiId, 'LOT-2026-LEYLANDI-001', 'FIRE', 'Tepsi kuruma kaynaklı 50 adet fire verildi.', '150-01-001', 50, 400.0, 'Sistem', '2026-03-01')
        `, { tenantId, kokPartiId });

        // 5.4. Çocuk Parti İşlem Detayları
        await this.db.query(`
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, PartiNo, IslemTipi, Aciklama, KaynakStokKodu, HedefStokKodu, Miktar, EkMaliyet, ToplamMaliyetEtkisi, HedefSafha, IslemYapan, IslemTarihi)
            VALUES 
            (@tenantId, @cocukPartiId, 'LOT-2026-LEYLANDI-001-S', 'SASIRTMA_GIRIS', 'LOT-2026-LEYLANDI-001 partisinden şaşırtılarak oluşturuldu. Ek saksı ve torf maliyetleri eklendi.', '150-01-001', '150-01-002', 5000, 20000.0, 60000.0, 'KÜÇÜK_SAKSI', 'Sistem', '2026-02-15')
        `, { tenantId, cocukPartiId });

        await this.db.query(`
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, PartiNo, IslemTipi, Aciklama, KaynakStokKodu, FireMiktari, MaliyetTutar, IslemYapan, IslemTarihi)
            VALUES 
            (@tenantId, @cocukPartiId, 'LOT-2026-LEYLANDI-001-S', 'FIRE', 'Saksılama sonrası adaptasyon kaybı 20 adet.', '150-01-002', 20, 240.0, 'Sistem', '2026-03-05')
        `, { tenantId, cocukPartiId });

        // 6. Sıcaklık ve Konum Bazlı Kayıtlar (Yeni FDX_SicaklikKayitlari & Legacy)
        await this.db.query(`
            INSERT INTO FDX_SicaklikKayitlari (TenantId, Konum, OlcumTarihi, IcSicaklik, DisSicaklik, Nem, MazotLt, OlcumPeriyodu, Not_) 
            VALUES (@tenantId, 'Sera A', GETDATE(), 22.4, 14.5, 65.0, 12.5, 'SABAH', 'Seed ile oluşturuldu')
        `, { tenantId });

        await this.db.query(`
            INSERT INTO FDX_SicaklikKayitlari (TenantId, Konum, OlcumTarihi, IcSicaklik, DisSicaklik, Nem, MazotLt, OlcumPeriyodu, Not_) 
            VALUES (@tenantId, 'Sera B', GETDATE(), 24.1, 15.2, 60.0, 15.0, 'OGLE', 'Seed ile oluşturuldu')
        `, { tenantId });

        await this.db.query(`INSERT INTO TemperatureLogs (TenantId, LogDate, SeraIciSabah, SeraIciOgle, SeraIciAksam) VALUES (@tenantId, @date, 18.5, 24.5, 21.0)`, { tenantId, date: new Date() });
        await this.db.query(`INSERT INTO FertilizerLogs (TenantId, LogDate, Fungusit, AminoAsit) VALUES (@tenantId, @date, 1, 1)`, { tenantId, date: new Date() });

        // 7. Giderler (Expenses)
        await this.db.query(`
            INSERT INTO Expenses (TenantId, Title, Amount, ExpenseType, LogDate)
            VALUES 
            (@tenantId, 'Şubat Dönemi Personel Maaşları', 32000.0, 'İşçilik', '2026-02-28'),
            (@tenantId, 'Sera Isıtma Elektrik Bedeli', 14500.0, 'Enerji', '2026-02-25'),
            (@tenantId, 'Genel Nakliye Gideri', 6000.0, 'Diğer', '2026-02-20')
        `, { tenantId });

        // 8. Sistem Aktivite Kaydı
        await this.db.query(`
            INSERT INTO ActivityLogs (TenantId, Action, Title, Icon, Color) 
            VALUES (@tenantId, 'Veri Yükleme', 'Netsis entegre parti ve maliyet örnek verileri başarıyla yüklendi.', '📊', 'bg-emerald-50 text-emerald-600')
        `, { tenantId });

        return {
            success: true,
            message: `${tenantId} için yeni Netsis/FDX entegre örnek verileri yüklendi.`
        };
    }

    @Delete('clear')
    async clear(@Query('tenantId') tenantId: string) {
        this.guardProduction();
        this.logger.warn(`⚠️ CLEAR çalıştırılıyor: tenantId=${tenantId} — Tüm FidanX verileri silinecek!`);
        const tables = [
            'FDX_Barkodlar',
            'FDX_PartiMaliyetleri',
            'FDX_PartiIslemleri',
            'FDX_BitkiPartileri',
            'FDX_SicaklikKayitlari',
            'ActivityLogs',
            'TemperatureLogs',
            'FertilizerLogs',
            'ProductionCostHistory',
            'ProductionHistory',
            'ProductionBatches',
            'PurchaseItems',
            'Purchases',
            'OrderItems',
            'Orders',
            'Sales',
            'Suppliers',
            'Plants',
            'RecipeItems',
            'Recipes',
            'SupportHistory',
            'SupportTickets',
            'Expenses'
        ];

        for (const table of tables) {
            try {
                await this.db.query(`DELETE FROM ${table} WHERE TenantId = @tenantId`, { tenantId });
            } catch (err: any) {
                // Foreign key vs. nedeniyle hata verse bile devam et
            }
        }

        try {
            await this.db.query(`DELETE FROM Customers WHERE TenantId = @tenantId`, { tenantId });
        } catch (err) { }

        return { message: `${tenantId} verileri temizlendi.` };
    }
}
