import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IntegrationService } from '../../integration/integration.service';

@Injectable()
export class NetsisStocksService {
    private readonly logger = new Logger(NetsisStocksService.name);

    constructor(
        private db: DatabaseService,
        private integration: IntegrationService
    ) { }

    async getNextCode(tenantId: string, prefix: string) {
        return this.integration.getNextErpCode(tenantId, 'STOCK', prefix);
    }

    async getStocks(tenantId: string, filters?: { grupKodu?: string; tedarikci?: string; arama?: string }) {
        // Basit sorgu - Tedarikçi subquery'leri tblFATUIRS bağlantısı gerektirdiği için kaldırıldı (farklı DB olabilir)
        let where = "1=1";
        const params: Record<string, any> = {};

        if (filters?.grupKodu) {
            where += ` AND (DBO.TRK(stgrup.GRUP_ISIM) LIKE @grupKodu OR DBO.TRK(stgrup1.GRUP_ISIM) LIKE @grupKodu OR DBO.TRK(stgrup2.GRUP_ISIM) LIKE @grupKodu OR DBO.TRK(stgrup3.GRUP_ISIM) LIKE @grupKodu OR DBO.TRK(stgrup4.GRUP_ISIM) LIKE @grupKodu OR DBO.TRK(stgrup5.GRUP_ISIM) LIKE @grupKodu)`;
            params.grupKodu = `%${filters.grupKodu}%`;
        }
        if (filters?.arama) {
            where += ` AND (DBO.TRK(sbt.STOK_ADI) LIKE @arama OR DBO.TRK(stgrup.GRUP_ISIM) LIKE @arama OR DBO.TRK(stgrup1.GRUP_ISIM) LIKE @arama OR DBO.TRK(stgrup2.GRUP_ISIM) LIKE @arama OR DBO.TRK(stgrup3.GRUP_ISIM) LIKE @arama OR DBO.TRK(stgrup4.GRUP_ISIM) LIKE @arama OR DBO.TRK(stgrup5.GRUP_ISIM) LIKE @arama)`;
            params.arama = `%${filters.arama}%`;
        }

        const sql = `
      SELECT 
          sbt.STOK_KODU as StokKodu,
          DBO.TRK(sbt.STOK_ADI) as StokAdi,
          DBO.TRK(stgrup.GRUP_ISIM) as GrupIsim,
          CASE	
              WHEN sbt.STOK_KODU LIKE '150%' THEN '150-01 İLK MADDE'
              WHEN sbt.STOK_KODU LIKE '151%' THEN '151-01 YARIMAMUL' 
              WHEN sbt.STOK_KODU LIKE '152%' THEN '152-01 MAMUL' 
              WHEN sbt.STOK_KODU LIKE '153%' THEN '153-01 TİCARİ' 
              WHEN sbt.STOK_KODU LIKE '600%' OR DBO.TRK(stgrup.GRUP_ISIM) LIKE '%SÜS%' THEN 'SÜS BİTKİLERİ'
              WHEN sbt.STOK_KODU LIKE '157%' OR DBO.TRK(stgrup.GRUP_ISIM) LIKE '%SAKSI%' THEN 'SAKSILAR'
              ELSE 'DİĞER' 
          END as category,
          ISNULL(har.GIRIS_MIKTARI, 0) as GirisMiktari,
          ISNULL(har.CIKIS_MIKTARI, 0) as CikisMiktari,
          (ISNULL(har.GIRIS_MIKTARI, 0) - ISNULL(har.CIKIS_MIKTARI, 0)) as Bakiye,
          DBO.TRK(stgrup1.GRUP_ISIM) as Kod1,
          DBO.TRK(stgrup2.GRUP_ISIM) as Kod2,
          DBO.TRK(stgrup3.GRUP_ISIM) as Kod3,
          DBO.TRK(stgrup4.GRUP_ISIM) as Kod4,
          DBO.TRK(stgrup5.GRUP_ISIM) as Kod5,
          DBO.TRK(sbt.OLCU_BR1) as Birim,
          RTRIM(ISNULL(sbt.S_YEDEK1, '')) as SaksıKodu
      FROM TBLSTSABIT sbt WITH (NOLOCK)
      LEFT JOIN TBLSTGRUP stgrup WITH (NOLOCK) ON stgrup.GRUP_KOD = sbt.GRUP_KODU
      LEFT JOIN (
          SELECT 
              STOK_KODU,
              SUM(CASE WHEN STHAR_GCKOD = 'G' THEN sthar_gcmik ELSE 0 END) as GIRIS_MIKTARI,
              SUM(CASE WHEN STHAR_GCKOD = 'C' THEN sthar_gcmik ELSE 0 END) as CIKIS_MIKTARI
          FROM tblsthar WITH (NOLOCK)
          GROUP BY STOK_KODU
      ) har ON har.STOK_KODU = sbt.STOK_KODU
      LEFT JOIN TBLSTOKKOD1 stgrup1 WITH (NOLOCK) ON stgrup1.GRUP_KOD = sbt.KOD_1
      LEFT JOIN TBLSTOKKOD2 stgrup2 WITH (NOLOCK) ON stgrup2.GRUP_KOD = sbt.KOD_2
      LEFT JOIN TBLSTOKKOD3 stgrup3 WITH (NOLOCK) ON stgrup3.GRUP_KOD = sbt.KOD_3
      LEFT JOIN TBLSTOKKOD4 stgrup4 WITH (NOLOCK) ON stgrup4.GRUP_KOD = sbt.KOD_4
      LEFT JOIN TBLSTOKKOD5 stgrup5 WITH (NOLOCK) ON stgrup5.GRUP_KOD = sbt.KOD_5
      WHERE ${where}
      ORDER BY sbt.STOK_KODU
    `;
        return this.db.query(sql, Object.keys(params).length ? params : {});
    }

    /** Netsis alış faturalarından stok-cari eşleşmelerini döndürür (STOK/CARİ gruplaması için). tblFATUIRS yoksa boş döner. */
    async getStocksWithSuppliers(tenantId: string) {
        try {
            const sql = `
      SELECT 
          sh.STOK_KODU as StokKodu,
          DBO.TRK(ss.STOK_ADI) as StokAdi,
          f.CARI_KODU as CariKodu,
          DBO.TRK(cs.CARI_ISIM) as CariAdi,
          SUM(sh.STHAR_GCMIK) as ToplamMiktar,
          (SELECT TOP 1 sh2.STHAR_NF FROM TBLSTHAR sh2 WITH (NOLOCK) JOIN tblFATUIRS f2 WITH (NOLOCK) ON RTRIM(f2.FATIRS_NO) = RTRIM(sh2.FISNO) AND f2.FTIRSIP = '2' WHERE RTRIM(sh2.STOK_KODU) = RTRIM(sh.STOK_KODU) AND f2.CARI_KODU = f.CARI_KODU ORDER BY f2.TARIH DESC, sh2.INCKEYNO DESC) as SonBirimFiyat,
          MAX(f.TARIH) as SonTarih
      FROM TBLSTHAR sh WITH (NOLOCK)
      JOIN tblFATUIRS f WITH (NOLOCK) ON RTRIM(f.FATIRS_NO) = RTRIM(sh.FISNO) AND f.FTIRSIP = '2'
      JOIN TBLCASABIT cs WITH (NOLOCK) ON cs.CARI_KOD = f.CARI_KODU
      LEFT JOIN TBLSTSABIT ss WITH (NOLOCK) ON ss.STOK_KODU = sh.STOK_KODU
      WHERE sh.STHAR_FTIRSIP = '2'
      GROUP BY sh.STOK_KODU, ss.STOK_ADI, f.CARI_KODU, cs.CARI_ISIM
      ORDER BY DBO.TRK(ss.STOK_ADI), DBO.TRK(cs.CARI_ISIM)
    `;
            return this.db.query(sql);
        } catch (err) {
            this.logger.warn('getStocksWithSuppliers hatası (tblFATUIRS erişilemiyor olabilir):', err);
            return [];
        }
    }

    async getStockByCode(stokKodu: string) {
        const sql = `
      SELECT 
          sbt.STOK_KODU as StokKodu,
          DBO.TRK(sbt.STOK_ADI) as StokAdi,
          DBO.TRK(stgrup.GRUP_ISIM) as GrupIsim,
          ISNULL(har.GIRIS_MIKTARI, 0) - ISNULL(har.CIKIS_MIKTARI, 0) as Bakiye
      FROM TBLSTSABIT sbt WITH (NOLOCK)
      LEFT JOIN TBLSTGRUP stgrup WITH (NOLOCK) ON stgrup.GRUP_KOD = sbt.GRUP_KODU
      LEFT JOIN (
          SELECT 
              STOK_KODU,
              SUM(CASE WHEN STHAR_GCKOD = 'G' THEN sthar_gcmik ELSE 0 END) as GIRIS_MIKTARI,
              SUM(CASE WHEN STHAR_GCKOD = 'C' THEN sthar_gcmik ELSE 0 END) as CIKIS_MIKTARI
          FROM tblsthar WITH (NOLOCK)
          WHERE STOK_KODU = @stokKodu
          GROUP BY STOK_KODU
      ) har ON har.STOK_KODU = sbt.STOK_KODU
      WHERE sbt.STOK_KODU = @stokKodu
    `;
        const results = await this.db.query(sql, { stokKodu });
        return results[0] || null;
    }

    async getStockSerialBalances(stokKodu: string) {
        const sql = `
      SELECT 
          tra.SERI_NO as SeriNo,
          tra.DEPOKOD as DepoKodu,
          ISNULL(DBO.TRK(dp.DEPO_ISMI), tra.DEPOKOD) as DepoAdi,
          SUM(CASE WHEN tra.GCKOD = 'G' THEN tra.MIKTAR ELSE 0 END) as GirisMiktari,
          SUM(CASE WHEN tra.GCKOD = 'C' THEN tra.MIKTAR ELSE 0 END) as CikisMiktari,
          SUM(CASE WHEN tra.GCKOD = 'G' THEN tra.MIKTAR ELSE -tra.MIKTAR END) as Bakiye
      FROM TBLSERITRA tra WITH (NOLOCK)
      LEFT JOIN TBLSTOKDP dp WITH (NOLOCK) ON dp.DEPO_KODU = tra.DEPOKOD
      WHERE tra.STOK_KODU = @stokKodu
      GROUP BY tra.SERI_NO, tra.DEPOKOD, DBO.TRK(dp.DEPO_ISMI)
      HAVING SUM(CASE WHEN tra.GCKOD = 'G' THEN tra.MIKTAR ELSE -tra.MIKTAR END) <> 0
      ORDER BY SeriNo, DepoKodu
    `;
        return this.db.query(sql, { stokKodu });
    }

    async getStockMovements(stokKodu: string) {
        if (!stokKodu || !String(stokKodu).trim()) {
            this.logger.warn('getStockMovements: boş stokKodu');
            return [];
        }
        const trimmed = String(stokKodu).trim();
        this.logger.log(`getStockMovements: stokKodu="${trimmed}" (uzunluk: ${trimmed.length})`);
        const dateCol = 'STHAR_TARIH'; // Netsis stok hareket tarihi; bazı sürümlerde TARIH olabilir
        const orderCol = 'STHAR_TARIH';
        try {
            let sql = `
            SELECT 
                h1.${dateCol} as Tarih,
                h1.FISNO as BelgeNo,
                h1.STHAR_HTUR as HareketTuru,
                h1.STHAR_GCKOD as GCKodu,
                h1.STHAR_GCMIK as Miktar,
                h1.STHAR_NF as BirimFiyat,
                CASE 
                    WHEN h1.STHAR_HTUR IN ('J','H','E') AND c.CARI_ISIM IS NOT NULL 
                    THEN DBO.TRK(c.CARI_ISIM) 
                    ELSE ISNULL(DBO.TRK(h1.STHAR_ACIKLAMA), '') 
                END as Aciklama,
                (SELECT SUM(CASE WHEN h2.STHAR_GCKOD = 'G' THEN h2.STHAR_GCMIK ELSE -h2.STHAR_GCMIK END) 
                 FROM TBLSTHAR h2 WITH (NOLOCK) 
                 WHERE RTRIM(h2.STOK_KODU) = RTRIM(h1.STOK_KODU) AND h2.INCKEYNO <= h1.INCKEYNO) as Bakiye
            FROM TBLSTHAR h1 WITH (NOLOCK)
            LEFT JOIN TBLCASABIT c WITH (NOLOCK) ON RTRIM(c.CARI_KOD) = RTRIM(h1.STHAR_ACIKLAMA)
            WHERE RTRIM(h1.STOK_KODU) = RTRIM(@stokKodu)
            ORDER BY h1.${orderCol} DESC, h1.INCKEYNO DESC
        `;
            let rows = await this.db.query(sql, { stokKodu: trimmed });
            if (Array.isArray(rows)) {
                this.logger.log(`getStockMovements: "${trimmed}" için ${rows.length} satır döndü`);
            }
            // Sürücü bazen küçük harf döndürebilir; frontend için PascalCase garanti et. E = Nakliye (maliyet dağıtımı)
            return (rows || []).map((r: any) => ({
                Tarih: r.Tarih ?? r.tarih,
                BelgeNo: r.BelgeNo ?? r.belgeNo,
                HareketTuru: r.HareketTuru ?? r.hareketTuru ?? r.STHAR_HTUR,
                GCKodu: r.GCKodu ?? r.gcKodu,
                Miktar: r.Miktar ?? r.miktar,
                BirimFiyat: r.BirimFiyat ?? r.birimFiyat,
                Aciklama: r.Aciklama ?? r.aciklama,
                Bakiye: r.Bakiye ?? r.bakiye,
            }));
        } catch (err: any) {
            const msg = err?.message || String(err);
            if (msg.includes('STHAR_TARIH') || msg.includes('Invalid column')) {
                this.logger.log(`getStockMovements: STHAR_TARIH yok, TARIH ile deneniyor`);
                try {
                    const sqlAlt = `
                    SELECT 
                        h1.TARIH as Tarih,
                        h1.FISNO as BelgeNo,
                        h1.STHAR_HTUR as HareketTuru,
                        h1.STHAR_GCKOD as GCKodu,
                        h1.STHAR_GCMIK as Miktar,
                        h1.STHAR_NF as BirimFiyat,
                        CASE 
                            WHEN h1.STHAR_HTUR IN ('J','H','E') AND c.CARI_ISIM IS NOT NULL 
                            THEN DBO.TRK(c.CARI_ISIM) 
                            ELSE ISNULL(DBO.TRK(h1.STHAR_ACIKLAMA), '') 
                        END as Aciklama,
                        (SELECT SUM(CASE WHEN h2.STHAR_GCKOD = 'G' THEN h2.STHAR_GCMIK ELSE -h2.STHAR_GCMIK END) 
                         FROM TBLSTHAR h2 WITH (NOLOCK) 
                         WHERE RTRIM(h2.STOK_KODU) = RTRIM(h1.STOK_KODU) AND h2.INCKEYNO <= h1.INCKEYNO) as Bakiye
                    FROM TBLSTHAR h1 WITH (NOLOCK)
                    LEFT JOIN TBLCASABIT c WITH (NOLOCK) ON RTRIM(c.CARI_KOD) = RTRIM(h1.STHAR_ACIKLAMA)
                    WHERE RTRIM(h1.STOK_KODU) = RTRIM(@stokKodu)
                    ORDER BY h1.TARIH DESC, h1.INCKEYNO DESC
                `;
                    const rowsAlt = await this.db.query(sqlAlt, { stokKodu: trimmed });
                    this.logger.log(`getStockMovements (TARIH): "${trimmed}" için ${Array.isArray(rowsAlt) ? rowsAlt.length : 0} satır`);
                    return (rowsAlt || []).map((r: any) => ({
                        Tarih: r.Tarih ?? r.tarih,
                        BelgeNo: r.BelgeNo ?? r.belgeNo,
                        HareketTuru: r.HareketTuru ?? r.hareketTuru ?? r.STHAR_HTUR,
                        GCKodu: r.GCKodu ?? r.gcKodu,
                        Miktar: r.Miktar ?? r.miktar,
                        BirimFiyat: r.BirimFiyat ?? r.birimFiyat,
                        Aciklama: r.Aciklama ?? r.aciklama,
                        Bakiye: r.Bakiye ?? r.bakiye,
                    }));
                } catch (err2) {
                    this.logger.warn('Stok hareketleri (TARIH ile de) alınamadı:', err2);
                    return [];
                }
            }
            this.logger.warn('Stok hareketleri alınamadı:', err);
            return [];
        }
    }
}
