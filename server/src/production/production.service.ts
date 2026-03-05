import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ProductionService {
    constructor(
        private db: DatabaseService,
        @Inject(forwardRef(() => ActivityService))
        private activity: ActivityService
    ) { }

    // 1. Üretim Partisi Oluşturma (Alış Faturasından veya Manuel)
    async createBatch(tenantId: string, data: any) {
        const partiNo = data.partiNo || `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        const sql = `
            INSERT INTO FDX_BitkiPartileri 
            (TenantId, PartiNo, NetsisStokKodu, BitkiAdi, Safha, Konum, BaslangicMiktar, MevcutMiktar, BirimMaliyet, ToplamMaliyet, AlisFaturaNo, Durum)
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @partiNo, @netsisStokKodu, @bitkiAdi, @safha, @konum, @miktar, @miktar, @birimMaliyet, @toplamMaliyet, @faturaNo, 'AKTIF')`;

        const miktar = Number(data.miktar) || 0;
        const birimMaliyet = Number(data.birimMaliyet) || 0;
        const toplamMaliyet = miktar * birimMaliyet;

        const results = await this.db.query(sql, {
            tenantId,
            partiNo,
            netsisStokKodu: data.netsisStokKodu,
            bitkiAdi: data.bitkiAdi || 'Bilinmeyen Bitki',
            safha: data.safha || 'TEPSİ',
            konum: data.konum || 'Açık Alan',
            miktar,
            birimMaliyet,
            toplamMaliyet,
            faturaNo: data.faturaNo || null
        });

        const partiId = results[0].Id;

        // Geçmişe yaz
        await this.addOperationLog(tenantId, partiId, {
            islemTipi: 'ALIS_GIRIS',
            aciklama: `Yeni parti oluşturuldu. Miktar: ${miktar}, Fatura No: ${data.faturaNo || 'Yok'}`
        });

        await this.activity.log(tenantId, {
            action: 'Yeni Üretim Partisi',
            title: `${partiNo} - ${data.bitkiAdi} partisi oluşturuldu.`,
            icon: '🌱',
            color: 'bg-emerald-50 text-emerald-600'
        });

        return { id: partiId.toString(), partiNo, ...data };
    }

    // 2. Partileri Listeleme
    async findAll(tenantId: string) {
        const result = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE TenantId = @tenantId ORDER BY BaslangicTarihi DESC`, { tenantId });
        return Array.isArray(result) ? result : [];
    }

    // 3. Parti Detayı & İşlem Geçmişi
    async findOne(tenantId: string, id: string) {
        let sql = id.includes('LOT') ?
            `SELECT * FROM FDX_BitkiPartileri WHERE PartiNo = @id AND TenantId = @tenantId` :
            `SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`;

        const results = await this.db.query(sql, { id, tenantId });
        if (!results || results.length === 0) throw new NotFoundException('Parti bulunamadı.');
        const parti = results[0];

        const history = await this.db.query(`SELECT * FROM FDX_PartiIslemleri WHERE PartiId = @partiId ORDER BY IslemTarihi DESC`, { partiId: parti.Id });

        return { ...parti, history };
    }

    // 4. ŞAŞIRTMA (Safha Değişimi) İşlemi
    async sasirtmaYap(tenantId: string, kaynakPartiId: string, data: any) {
        /*
          data = {
             hedefSafha: 'KÜÇÜK_SAKSI',
             hedefKonum: 'Sera 1', (opsiyonel)
             sasirtilanMiktar: 500,
             ekMaliyetTutar: 1500, // saksı + toprak maliyeti vs.
             kullanilanMalzeme: '5L Saksı + Torf'
          }
        */
        const results = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`, { id: kaynakPartiId, tenantId });
        if (results.length === 0) throw new NotFoundException('Kaynak parti bulunamadı.');
        const kaynakParti = results[0];

        const miktar = Number(data.sasirtilanMiktar) || 0;
        if (miktar <= 0 || miktar > kaynakParti.MevcutMiktar) {
            throw new BadRequestException('Geçersiz şaşırtma miktarı.');
        }

        const hedeflenenKonum = data.hedefKonum || kaynakParti.Konum;
        const ekMaliyet = Number(data.ekMaliyetTutar) || 0;

        // Kaynak partinin eski birim maliyeti:
        const kaynakBirimMaliyet = kaynakParti.BirimMaliyet;
        // Şaşırtılan bitkilerin orantısal kaynak maliyet payı:
        const tasinanKaynakMaliyet = kaynakBirimMaliyet * miktar;
        // Yeni partinin toplam maliyeti = taşınan maliyet + yeni saksı/torf vs ek maliyet
        const yeniToplamMaliyet = tasinanKaynakMaliyet + ekMaliyet;
        const yeniBirimMaliyet = miktar > 0 ? yeniToplamMaliyet / miktar : 0;

        // 4.1. Yeni Hedef Parti Oluştur
        const yeniPartiNo = `${kaynakParti.PartiNo}-S`;
        const insertSql = `
            INSERT INTO FDX_BitkiPartileri 
            (TenantId, PartiNo, NetsisStokKodu, BitkiAdi, Safha, Konum, BaslangicMiktar, MevcutMiktar, BirimMaliyet, ToplamMaliyet, KaynakPartiId)
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @partiNo, @netsisStokKodu, @bitkiAdi, @safha, @konum, @miktar, @miktar, @yeniBirimMaliyet, @yeniToplamMaliyet, @kaynakPartiId)`;

        const yeniPartiResult = await this.db.query(insertSql, {
            tenantId,
            partiNo: yeniPartiNo,
            netsisStokKodu: kaynakParti.NetsisStokKodu,
            bitkiAdi: kaynakParti.BitkiAdi,
            safha: data.hedefSafha,
            konum: hedeflenenKonum,
            miktar,
            yeniBirimMaliyet,
            yeniToplamMaliyet,
            kaynakPartiId: kaynakParti.Id
        });
        const yeniPartiId = yeniPartiResult[0].Id;

        // 4.2. Kaynak Partiden Miktarı Düş
        const kalanMiktar = kaynakParti.MevcutMiktar - miktar;
        const kalanToplamMaliyet = kaynakParti.ToplamMaliyet - tasinanKaynakMaliyet; // Orantısal olarak azaldı. Kalan partinin birim maliyeti aynı kalır.

        const updateKaynakSql = `UPDATE FDX_BitkiPartileri SET MevcutMiktar = @kalanMiktar, ToplamMaliyet = @kalanToplamMaliyet WHERE Id = @kaynakPartiId`;
        await this.db.query(updateKaynakSql, { kalanMiktar, kalanToplamMaliyet, kaynakPartiId: kaynakParti.Id });

        // 4.3 İşlem Kayıtları
        await this.addOperationLog(tenantId, kaynakParti.Id, {
            islemTipi: 'SASIRTMA_CIKIS',
            aciklama: `${miktar} adet bitki ${data.hedefSafha} safhasına (Parti: ${yeniPartiNo}) şaşırtıldı.`,
            miktar,
            hedefSafha: data.hedefSafha,
            hedefKonum: hedeflenenKonum,
            hedefPartiId: yeniPartiId
        });

        await this.addOperationLog(tenantId, yeniPartiId, {
            islemTipi: 'SASIRTMA_GIRIS',
            aciklama: `${kaynakParti.PartiNo} partisinden şaşırtılarak oluşturuldu. Ek maliyetler eklendi.`,
            miktar,
            kullanilanMalzeme: data.kullanilanMalzeme,
            maliyetTutar: ekMaliyet,
            hedefSafha: data.hedefSafha
        });

        return { success: true, yeniPartiId, yeniPartiNo };
    }

    // 5. Günlük İşlem Kaydetme (Toplu Dağıtım)
    async islemKaydet(tenantId: string, data: any) {
        /*
          data = {
             konum: 'Sera 1', // veya tüm seralar için iptal // Sadece belirli yerlere uygulandığını varsayalım
             islemTipi: 'ILACLAMA',
             aciklama: 'Örümcek ilacı atıldı',
             maliyetTutar: 2000,
             kullanilanMalzeme: 'İlaç XYZ',
             kullanilanMiktar: 2.5
          }
        */
        const konum = data.konum;
        const maliyetTutar = Number(data.maliyetTutar) || 0;

        // o konumdaki aktif partileri buluyoruz
        const batches = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE TenantId = @tenantId AND Konum = @konum AND MevcutMiktar > 0 AND Durum = 'AKTIF'`, { tenantId, konum }) as any[];

        if (batches.length === 0) throw new BadRequestException(`Seçilen konumda (${konum}) aktif üretim partisi bulunamadı.`);

        const totalQuantity = batches.reduce((sum, b) => sum + b.MevcutMiktar, 0);
        const costPerUnit = totalQuantity > 0 ? (maliyetTutar / totalQuantity) : 0;

        for (const b of batches) {
            const batchPay = costPerUnit * b.MevcutMiktar;
            const yeniToplamMaliyet = b.ToplamMaliyet + batchPay;
            const yeniBirimMaliyet = yeniToplamMaliyet / b.MevcutMiktar;

            // Partiyi güncelle
            await this.db.query(`UPDATE FDX_BitkiPartileri SET ToplamMaliyet = @yT, BirimMaliyet = @yB WHERE Id = @bId`, { yT: yeniToplamMaliyet, yB: yeniBirimMaliyet, bId: b.Id });

            // Geçmişe yaz
            await this.addOperationLog(tenantId, b.Id, {
                islemTipi: data.islemTipi,
                aciklama: data.aciklama,
                maliyetTutar: batchPay,
                birimMaliyetEtkisi: costPerUnit,
                kullanilanMalzeme: data.kullanilanMalzeme,
                kullanilanMiktar: (data.kullanilanMiktar || 1) * (b.MevcutMiktar / totalQuantity) // oransal malzeme miktarı
            });
        }

        await this.activity.log(tenantId, {
            action: 'Toplu İşlem',
            title: `${konum} bölgesindeki partilere ${data.islemTipi} yapıldı. Toplam Maliyet: ₺${maliyetTutar}`,
            icon: '💧',
            color: 'bg-blue-50 text-blue-600'
        });

        return { success: true, processedBatches: batches.length };
    }

    // 6. Fire Kaydı
    async fireKaydet(tenantId: string, partiId: string, data: any) {
        const results = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`, { id: partiId, tenantId });
        if (results.length === 0) throw new NotFoundException('Parti bulunamadı.');
        const parti = results[0];

        const miktar = Number(data.fireMiktar);
        if (miktar <= 0 || miktar > parti.MevcutMiktar) throw new BadRequestException('Geçersiz fire miktarı');

        const kalanMiktar = parti.MevcutMiktar - miktar;
        const fireOlanMaliyet = parti.BirimMaliyet * miktar;
        // Not: Muhasebe stratejisine göre ölen bitkinin maliyeti kalanlara yedirilebilir veya toplam maliyetten düşülüp zarar yazılabilir. 
        // Şimdilik kalanların taşıdığı formati kullanarak "Maliyet aynı, miktar azaldı" prensibini (birim maliyeti artıran) uygulayacağız:
        // Yani parti.ToplamMaliyet DÜŞMEZ.

        const yeniBirimMaliyet = kalanMiktar > 0 ? parti.ToplamMaliyet / kalanMiktar : 0;
        const yeniFireMiktar = (parti.FireMiktar || 0) + miktar;

        await this.db.query(`UPDATE FDX_BitkiPartileri SET MevcutMiktar = @kM, BirimMaliyet = @yB, FireMiktar = @yFM WHERE Id = @pId`, {
            kM: kalanMiktar, yB: yeniBirimMaliyet, yFM: yeniFireMiktar, pId: parti.Id
        });

        await this.addOperationLog(tenantId, parti.Id, {
            islemTipi: 'FIRE',
            aciklama: `Fire Kaydı İşlendi. Sebep: ${data.sebep || 'Belirtilmedi'}`,
            miktar
        });

        return { success: true, kalanMiktar, yeniBirimMaliyet };
    }

    // 7. Satış Aksiyonu (Sadece Stok Düşümü)
    async satisYap(tenantId: string, partiId: string, data: any) {
        const results = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`, { id: partiId, tenantId });
        if (results.length === 0) throw new NotFoundException('Parti bulunamadı.');
        const parti = results[0];

        const satisAdet = Number(data.satisAdet);
        if (satisAdet <= 0 || satisAdet > parti.MevcutMiktar) throw new BadRequestException('Geçersiz satış miktarı');

        const kalanMiktar = parti.MevcutMiktar - satisAdet;
        const satilanToplamMaliyet = parti.BirimMaliyet * satisAdet;
        const yeniToplamMaliyet = parti.ToplamMaliyet - satilanToplamMaliyet;
        const yeniSatilanAdet = (parti.SatilanMiktar || 0) + satisAdet;

        await this.db.query(`UPDATE FDX_BitkiPartileri SET MevcutMiktar = @kM, ToplamMaliyet = @yT, SatilanMiktar = @ySA WHERE Id = @pId`, {
            kM: kalanMiktar, yT: yeniToplamMaliyet, ySA: yeniSatilanAdet, pId: parti.Id
        });

        await this.addOperationLog(tenantId, parti.Id, {
            islemTipi: 'SATIS',
            aciklama: `${satisAdet} adet ürün satıldı. Fiyat/Adet: ₺${data.birimFiyat || 0}`,
            miktar: satisAdet
        });

        return { success: true, kalanMiktar };
    }

    // --- Yardımcı Log Fonksiyonu ---
    private async addOperationLog(tenantId: string, partiId: number, data: any) {
        const sql = `
            INSERT INTO FDX_PartiIslemleri 
            (TenantId, PartiId, IslemTipi, Aciklama, Miktar, MaliyetTutar, BirimMaliyetEtkisi, KullanilanMalzeme, KullanilanMiktar, HedefKonum, HedefSafha, HedefPartiId)
            VALUES (@tenantId, @partiId, @islemTipi, @aciklama, @miktar, @maliyetTutar, @birimMaliyetEtkisi, @kullanilanMalzeme, @kullanilanMiktar, @hedefKonum, @hedefSafha, @hedefPartiId)`;

        await this.db.query(sql, {
            tenantId,
            partiId,
            islemTipi: data.islemTipi,
            aciklama: data.aciklama || null,
            miktar: data.miktar || null,
            maliyetTutar: data.maliyetTutar || 0,
            birimMaliyetEtkisi: data.birimMaliyetEtkisi || 0,
            kullanilanMalzeme: data.kullanilanMalzeme || null,
            kullanilanMiktar: data.kullanilanMiktar || null,
            hedefKonum: data.hedefKonum || null,
            hedefSafha: data.hedefSafha || null,
            hedefPartiId: data.hedefPartiId || null
        });
    }

    // --- Gider Dağıtımı (Aktivite Servisinden Çağrılır) ---
    async distributeOperationCost(tenantId: string, locations: string[], totalCost: number, data: any) {
        if (!locations || locations.length === 0 || !totalCost || totalCost <= 0) return;

        // 1. İlgili konumlardaki partileri bul
        const locParams = locations.map((_, i) => `@loc${i}`).join(',');
        const params: any = { tenantId };
        locations.forEach((loc, i) => params[`loc${i}`] = loc);

        const batches = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE TenantId = @tenantId AND Konum IN (${locParams}) AND MevcutMiktar > 0 AND Durum = 'AKTIF'`, params) as any[];
        if (batches.length === 0) return;

        // 2. Toplam miktar
        const totalQuantity = batches.reduce((sum, b) => sum + (b.MevcutMiktar || 0), 0);
        if (totalQuantity === 0) return;

        const costPerUnit = totalCost / totalQuantity;

        // 3. Dağıt
        for (const b of batches) {
            const batchPay = costPerUnit * b.MevcutMiktar;
            const yeniToplamMaliyet = b.ToplamMaliyet + batchPay;
            const yeniBirimMaliyet = yeniToplamMaliyet / b.MevcutMiktar;

            await this.db.query(`UPDATE FDX_BitkiPartileri SET ToplamMaliyet = @yT, BirimMaliyet = @yB WHERE Id = @bId`, { yT: yeniToplamMaliyet, yB: yeniBirimMaliyet, bId: b.Id });

            await this.addOperationLog(tenantId, b.Id, {
                islemTipi: 'GIDER_DAGITIM',
                aciklama: data.title || 'Maliyet Dağıtımı',
                maliyetTutar: batchPay,
                birimMaliyetEtkisi: costPerUnit
            });
        }

        return { processedBatches: batches.length, totalDistributed: totalCost };
    }

}
