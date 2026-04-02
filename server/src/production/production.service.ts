import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ActivityService } from '../activity/activity.service';
import { NetsisStocksService } from '../netsis/stocks/stocks.service';

@Injectable()
export class ProductionService {
    private readonly logger = new Logger(ProductionService.name);

    constructor(
        private db: DatabaseService,
        @Inject(forwardRef(() => ActivityService))
        private activity: ActivityService,
        private netsisStocks: NetsisStocksService
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

    // --- Normalizer: DB satırını tutarlı camelCase JSON'a çevirir ---
    private normalizeBatch(b: any) {
        return {
            id: b.Id?.toString(),
            partiNo: b.PartiNo,
            netsisStokKodu: b.NetsisStokKodu,
            bitkiAdi: b.BitkiAdi,
            safha: b.Safha,
            konum: b.Konum,
            baslangicMiktar: b.BaslangicMiktar ?? 0,
            mevcutMiktar: b.MevcutMiktar ?? 0,
            birimMaliyet: b.BirimMaliyet ?? 0,
            toplamMaliyet: b.ToplamMaliyet ?? 0,
            fireMiktar: b.FireMiktar ?? 0,
            satilanMiktar: b.SatilanMiktar ?? 0,
            durum: b.Durum ?? 'AKTIF',
            baslangicTarihi: b.BaslangicTarihi,
            alisFaturaNo: b.AlisFaturaNo,
            kaynakPartiId: b.KaynakPartiId,
        };
    }

    private normalizeOperation(h: any) {
        return {
            id: h.Id,
            islemTipi: h.IslemTipi,
            aciklama: h.Aciklama,
            miktar: h.Miktar,
            maliyetTutar: h.MaliyetTutar ?? 0,
            birimMaliyetEtkisi: h.BirimMaliyetEtkisi ?? 0,
            kullanilanMalzeme: h.KullanilanMalzeme,
            kullanilanMiktar: h.KullanilanMiktar,
            hedefKonum: h.HedefKonum,
            hedefSafha: h.HedefSafha,
            hedefPartiId: h.HedefPartiId,
            islemTarihi: h.IslemTarihi,
        };
    }

    // 2. Partileri Listeleme
    async findAll(tenantId: string) {
        const result = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE TenantId = @tenantId ORDER BY BaslangicTarihi DESC`, { tenantId });
        return Array.isArray(result) ? result.map(b => this.normalizeBatch(b)) : [];
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

        return {
            ...this.normalizeBatch(parti),
            history: Array.isArray(history) ? history.map(h => this.normalizeOperation(h)) : [],
        };
    }

    // 3b. Konum Transferi
    async transferKonum(tenantId: string, partiId: string, data: any) {
        const results = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`, { id: partiId, tenantId });
        if (results.length === 0) throw new NotFoundException('Parti bulunamadı.');
        const parti = results[0];

        const eskiKonum = parti.Konum;
        const yeniKonum = data.targetLocation;
        if (!yeniKonum) throw new BadRequestException('Hedef konum belirtilmedi.');

        await this.db.query(`UPDATE FDX_BitkiPartileri SET Konum = @yeniKonum WHERE Id = @id`, { yeniKonum, id: parti.Id });

        await this.addOperationLog(tenantId, parti.Id, {
            islemTipi: 'TRANSFER',
            aciklama: `${eskiKonum} → ${yeniKonum} konumuna transfer edildi. ${data.note || ''}`.trim(),
            hedefKonum: yeniKonum,
        });

        await this.activity.log(tenantId, {
            action: 'Konum Transferi',
            title: `${parti.PartiNo} partisi ${eskiKonum} → ${yeniKonum} konumuna taşındı.`,
            icon: '🚚',
            color: 'bg-amber-50 text-amber-600',
        });

        return { success: true, eskiKonum, yeniKonum };
    }

    // 4. ŞAŞIRTMA (Safha Değişimi) İşlemi
    async sasirtmaYap(tenantId: string, kaynakPartiId: string, data: any) {
        const results = await this.db.query(`SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`, { id: kaynakPartiId, tenantId });
        if (results.length === 0) throw new NotFoundException('Kaynak parti bulunamadı.');
        const kaynakParti = results[0];

        const miktar = Number(data.sasirtilanMiktar) || 0;
        if (miktar <= 0 || miktar > kaynakParti.MevcutMiktar) {
            throw new BadRequestException('Geçersiz şaşırtma miktarı.');
        }

        let recipeCost = 0;
        let recipeInfo = '';
        if (data.recipeId) {
            const recItems = await this.db.query(`SELECT MaterialCode, MaterialName, Amount, Unit, UnitPrice FROM RecipeItems WHERE RecipeId = @recipeId`, { recipeId: data.recipeId }) as any[];
            if (Array.isArray(recItems)) {
                recipeCost = recItems.reduce((sum, i) => sum + (i.Amount || 0) * (i.UnitPrice || 0), 0);
                recipeInfo = recItems.map(i => `${i.MaterialName || i.MaterialCode} (${i.Amount} ${i.Unit})`).join(', ');
            }
        }

        const hedeflenenKonum = data.hedefKonum || kaynakParti.Konum;
        const manuelEkMaliyet = Number(data.ekMaliyetTutar) || 0;
        const ekMaliyet = manuelEkMaliyet + recipeCost;

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

        const hedefNetsisKod = (data.hedefNetsisStokKodu && String(data.hedefNetsisStokKodu).trim())
            ? String(data.hedefNetsisStokKodu).trim()
            : kaynakParti.NetsisStokKodu;

        const yeniPartiResult = await this.db.query(insertSql, {
            tenantId,
            partiNo: yeniPartiNo,
            netsisStokKodu: hedefNetsisKod,
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

        const malzemeAciklama = recipeInfo || data.kullanilanMalzeme || '';
        await this.addOperationLog(tenantId, yeniPartiId, {
            islemTipi: 'SASIRTMA_GIRIS',
            aciklama: `${kaynakParti.PartiNo} partisinden şaşırtılarak oluşturuldu.${recipeInfo ? ` Reçete: ${recipeInfo}` : ''} Ek maliyetler eklendi.`,
            miktar,
            kullanilanMalzeme: malzemeAciklama,
            maliyetTutar: ekMaliyet,
            hedefSafha: data.hedefSafha
        });

        let netsisTransfer: { fisNo?: string; error?: string } | null = null;
        const kaynakSk = String(kaynakParti.NetsisStokKodu || '').trim();
        const hedefSk = String(hedefNetsisKod || '').trim();
        if (kaynakSk && hedefSk && kaynakSk !== hedefSk) {
            try {
                const tr = await this.netsisStocks.transferBetweenStocks({
                    kaynakStokKodu: kaynakSk,
                    hedefStokKodu: hedefSk,
                    miktar,
                    aciklama: `FidanX şaşırtma ${kaynakParti.PartiNo} → ${yeniPartiNo}`
                });
                netsisTransfer = { fisNo: tr?.fisNo };
            } catch (e: any) {
                this.logger.warn(`Netsis stok transferi başarısız (${kaynakSk}→${hedefSk}): ${e?.message || e}`);
                netsisTransfer = { error: e?.message || String(e) };
            }
        }

        return { success: true, yeniPartiId, yeniPartiNo, netsisTransfer };
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

        const birimFiyat = Number(data.birimFiyat) || 0;
        const satisGeliri = satisAdet * birimFiyat;
        await this.addOperationLog(tenantId, parti.Id, {
            islemTipi: 'SATIS',
            aciklama: `${satisAdet} adet ürün satıldı. Birim fiyat: ₺${birimFiyat.toFixed(2)} | Ciro: ₺${satisGeliri.toFixed(2)}`,
            miktar: satisAdet,
            maliyetTutar: satisGeliri
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

    async getLineage(tenantId: string, batchId: string) {
        const visited = new Set<string>();
        const lineage: any[] = [];

        const traverse = async (id: string, direction: 'up' | 'down') => {
            if (visited.has(id)) return;
            visited.add(id);

            const rows = await this.db.query(
                `SELECT * FROM FDX_BitkiPartileri WHERE Id = @id AND TenantId = @tenantId`,
                { id, tenantId }
            );
            if (rows.length === 0) return;
            const b = rows[0];

            const ops = await this.db.query(
                `SELECT * FROM FDX_PartiIslemleri WHERE PartiId = @bId ORDER BY IslemTarihi ASC`,
                { bId: b.Id }
            );

            lineage.push({
                ...this.normalizeBatch(b),
                operations: (ops || []).map(this.normalizeOperation),
                direction
            });

            if (direction === 'up' && b.KaynakPartiId) {
                await traverse(b.KaynakPartiId.toString(), 'up');
            }

            if (direction === 'down') {
                const children = await this.db.query(
                    `SELECT Id FROM FDX_BitkiPartileri WHERE KaynakPartiId = @id AND TenantId = @tenantId`,
                    { id: b.Id, tenantId }
                );
                for (const child of children) {
                    await traverse(child.Id.toString(), 'down');
                }
            }
        };

        await traverse(batchId, 'up');
        visited.delete(batchId);
        await traverse(batchId, 'down');

        return lineage.sort((a, b) => (a.baslangicTarihi || '') < (b.baslangicTarihi || '') ? -1 : 1);
    }

    async getProfitabilityReport(tenantId: string) {
        const batches = await this.db.query(
            `SELECT * FROM FDX_BitkiPartileri WHERE TenantId = @tenantId`,
            { tenantId }
        );

        const all = (batches || []).map((b: any) => this.normalizeBatch(b));
        const aktif = all.filter((b: any) => b.durum === 'AKTIF' && b.mevcutMiktar > 0);
        const satilan = all.filter((b: any) => b.satilanMiktar > 0);

        const toplamYatirim = aktif.reduce((s: number, b: any) => s + (b.toplamMaliyet || 0), 0);
        const toplamBitki = aktif.reduce((s: number, b: any) => s + (b.mevcutMiktar || 0), 0);
        const toplamFire = all.reduce((s: number, b: any) => s + (b.fireMiktar || 0), 0);
        const toplamSatilan = all.reduce((s: number, b: any) => s + (b.satilanMiktar || 0), 0);

        const salesOps = await this.db.query(
            `SELECT h.MaliyetTutar, h.Miktar, h.IslemTipi FROM FDX_PartiIslemleri h
             INNER JOIN FDX_BitkiPartileri b ON h.PartiId = b.Id
             WHERE b.TenantId = @tenantId AND h.IslemTipi = 'SATIS'`, { tenantId }
        );
        const toplamSatisGeliri = (salesOps || []).reduce((s: number, op: any) => {
            return s + (Number(op.MaliyetTutar) || 0);
        }, 0);

        const bitkiBazli: Record<string, { bitkiAdi: string; adet: number; maliyet: number; satilan: number; fire: number }> = {};
        all.forEach((b: any) => {
            const key = b.bitkiAdi || 'Bilinmeyen';
            if (!bitkiBazli[key]) bitkiBazli[key] = { bitkiAdi: key, adet: 0, maliyet: 0, satilan: 0, fire: 0 };
            bitkiBazli[key].adet += b.mevcutMiktar || 0;
            bitkiBazli[key].maliyet += b.toplamMaliyet || 0;
            bitkiBazli[key].satilan += b.satilanMiktar || 0;
            bitkiBazli[key].fire += b.fireMiktar || 0;
        });

        return {
            ozet: {
                toplamYatirim,
                toplamBitki,
                toplamSatilan,
                toplamFire,
                toplamSatisGeliri,
                ortBirimMaliyet: toplamBitki > 0 ? toplamYatirim / toplamBitki : 0,
                fireOrani: (toplamFire + toplamSatilan + toplamBitki) > 0 ? (toplamFire / (toplamFire + toplamSatilan + toplamBitki) * 100) : 0
            },
            bitkiBazli: Object.values(bitkiBazli).sort((a, b) => b.maliyet - a.maliyet)
        };
    }

    async getSeraEfficiency(tenantId: string) {
        const batches = await this.db.query(
            `SELECT Konum, COUNT(*) as PartiSayisi, SUM(MevcutMiktar) as ToplamBitki, SUM(ToplamMaliyet) as ToplamMaliyet, SUM(FireMiktar) as ToplamFire, SUM(SatilanMiktar) as ToplamSatilan
             FROM FDX_BitkiPartileri WHERE TenantId = @tenantId AND Durum = 'AKTIF'
             GROUP BY Konum ORDER BY ToplamBitki DESC`,
            { tenantId }
        );

        return (batches || []).map((r: any) => ({
            konum: r.Konum || 'Belirtilmemiş',
            partiSayisi: r.PartiSayisi || 0,
            toplamBitki: r.ToplamBitki || 0,
            toplamMaliyet: r.ToplamMaliyet || 0,
            toplamFire: r.ToplamFire || 0,
            toplamSatilan: r.ToplamSatilan || 0,
            birimMaliyet: r.ToplamBitki > 0 ? r.ToplamMaliyet / r.ToplamBitki : 0,
            verimlilik: (r.ToplamBitki + r.ToplamSatilan) > 0
                ? ((r.ToplamBitki + r.ToplamSatilan) / (r.ToplamBitki + r.ToplamSatilan + (r.ToplamFire || 0)) * 100)
                : 0
        }));
    }

}
