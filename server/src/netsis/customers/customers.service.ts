import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IntegrationService } from '../../integration/integration.service';

@Injectable()
export class NetsisCustomersService {
    private readonly logger = new Logger(NetsisCustomersService.name);

    constructor(
        private db: DatabaseService,
        private integration: IntegrationService
    ) { }

    async getNextCode(tenantId: string, prefix: string) {
        return this.integration.getNextErpCode(tenantId, 'CUSTOMER', prefix);
    }

    async getCustomerSummaries(tenantId: string, type?: string) {
        let filter = "LEFT(c.CARI_KOD, 3) IN ('120', '320')";
        if (type === '120' || type === '320') {
            filter = `LEFT(c.CARI_KOD, 3) = '${type}'`;
        }

        const sql = `
      WITH CariFinans AS (
          SELECT
              ch.CARI_KOD,
              SUM(CASE WHEN ch.BORC > 0 THEN ch.BORC ELSE 0 END) AS ToplamBorcTl,
              SUM(CASE WHEN ch.ALACAK > 0 THEN ch.ALACAK ELSE 0 END) AS ToplamAlacakTl,
              SUM(CASE WHEN ch.BORC > 0 AND ch.DOVIZ_TURU != '0' THEN ISNULL(ch.DOVIZ_TUTAR, 0) ELSE 0 END) AS ToplamBorcDoviz,
              SUM(CASE WHEN ch.ALACAK > 0 AND ch.DOVIZ_TURU != '0' THEN ISNULL(ch.DOVIZ_TUTAR, 0) ELSE 0 END) AS ToplamAlacakDoviz
          FROM TBLCAHAR ch WITH (NOLOCK)
          GROUP BY ch.CARI_KOD
      ),
      CariCekRiski AS (
          SELECT
              ch.CARI_KOD,
              SUM(
                  CASE 
                      WHEN ch.DOVIZ_TURU IS NULL OR ch.DOVIZ_TURU = '0' THEN
                          ISNULL(ch.BORC, 0) + ISNULL(ch.ALACAK, 0)
                      ELSE
                          ISNULL(ch.DOVIZ_TUTAR, 0)
                  END
              ) AS CekRiski
          FROM TBLCAHAR ch WITH (NOLOCK)
          WHERE ch.HAREKET_TURU IN ('G', 'H')
              AND ch.VADE_TARIHI > GETDATE()
          GROUP BY ch.CARI_KOD
      )
      SELECT
          c.CARI_KOD AS CariKodu,
          dbo.TRK(c.CARI_ISIM) AS CariAdi,
          c.RAPOR_KODU1 AS CariTipi,
          dbo.TRK(ISNULL(ulk.ULKEADI, '')) AS Ulke,
          ISNULL(c.ULKE_KODU, '') AS UlkeKodu,
          c.DOVIZ_TIPI AS DovizTuru,
          CASE c.DOVIZ_TIPI
              WHEN '0' THEN '0-TL'
              WHEN '1' THEN '1-DOLAR'
              WHEN '2' THEN '2-EURO'
              WHEN '3' THEN '3-FRANG'
              WHEN '4' THEN '4-FRANG'
              WHEN '5' THEN '5-STERLİN'
          END AS DovizAciklama,
          ISNULL(f.ToplamBorcTl, 0) - ISNULL(f.ToplamAlacakTl, 0) AS BakiyeTl,
          ISNULL(f.ToplamBorcDoviz, 0) - ISNULL(f.ToplamAlacakDoviz, 0) AS BakiyeDoviz,
          ISNULL(cek.CekRiski, 0) AS CekRiski,
          dbo.TRK(c.CARI_ADRES) AS CariAdres,
          dbo.TRK(c.CARI_IL) AS CariIl,
          dbo.TRK(c.CARI_ILCE) AS CariIlce,
          c.CARI_TEL AS Telefon,
          c.EMAIL AS Email,
          c.RAPOR_KODU2 AS GrupKodu,
          dbo.TRK(ISNULL(g.GRUP_ISIM, '')) AS GrupAdi
      FROM tblcasabit c WITH (NOLOCK)
      LEFT JOIN CariFinans f ON f.CARI_KOD = c.CARI_KOD
      LEFT JOIN CariCekRiski cek ON cek.CARI_KOD = c.CARI_KOD
      LEFT JOIN netsis..ULKESABIT ulk ON ulk.ULKEKODU = c.ULKE_KODU
      LEFT JOIN TBLCARIKOD2 g WITH (NOLOCK) ON g.GRUP_KOD = c.RAPOR_KODU2
      WHERE ${filter}
      ORDER BY c.CARI_KOD
    `;
        return this.db.query(sql);
    }

    async getCustomerTransactions(tenantId: string, cariKodu: string) {
        // Netsis karakter dönüşümü (dbo.TRK) Haksa projesinde tanımlı bir fonksiyon olarak görünüyor.
        // Eğer veritabanında bu fonksiyon yoksa sorgu hata verebilir.
        const sql = `
      SELECT
          ch.CARI_KOD AS CariKod,
          dbo.TRK(sbt.CARI_ISIM) AS CariIsim,
          ch.TARIH AS Tarih,
          ch.VADE_TARIHI AS VadeTarihi,
          ch.BELGE_NO AS BelgeNo,
          dbo.TRK(ch.ACIKLAMA) AS Aciklama,
          (case when ch.DOVIZ_TURU=0 and ch.BORC>0 then ch.BORC when ch.DOVIZ_TURU<>0 and ch.BORC>0 then DOVIZ_TUTAR else 0 end) AS Borc,
          (case when ch.DOVIZ_TURU=0 and ch.ALACAK>0 then ch.ALACAK when ch.DOVIZ_TURU<>0 and ch.ALACAK>0 then DOVIZ_TUTAR else 0 end) AS Alacak,
          ch.DOVIZ_TURU AS DovizTuru,
          ch.DOVIZ_TUTAR AS DovizTutar,
          sbt.CARI_TIP AS CariTip,
          ISNULL(ch.HAREKET_TURU, '') AS HareketTuru
      FROM TBLCAHAR ch WITH (NOLOCK)
      LEFT JOIN TBLCASABIT sbt WITH (NOLOCK) ON sbt.CARI_KOD = ch.CARI_KOD
      WHERE ch.CARI_KOD = @cariKodu
      AND UPPER(LTRIM(RTRIM(ISNULL(ch.ACIKLAMA, '')))) NOT LIKE '%KUR%FARKI%'
      ORDER BY ch.TARIH ASC, ch.BELGE_NO ASC
    `;
        const transactions = await this.db.query(sql, { cariKodu });

        // Bakiye hesaplama mantığı NestJS tarafında yapılabilir (Haksa projesindeki gibi)
        let runningBalance = 0;
        return transactions.map(t => {
            const borc = parseFloat(t.Borc || 0);
            const alacak = parseFloat(t.Alacak || 0);
            runningBalance += (borc - alacak);
            return { ...t, Bakiye: runningBalance };
        });
    }

    async getCustomerInvoices(tenantId: string, cariKodu: string) {
        const sql = `
      SELECT
          f.FATIRS_NO AS BelgeNo,
          f.TARIH AS Tarih,
          f.ODEMETARIHI AS VadeTarihi,
          dbo.TRK(f.ACIKLAMA) AS Aciklama,
          (CASE 
              WHEN f.DOVIZTIP = 0 OR f.DOVIZTIP IS NULL THEN ISNULL(f.GENELTOPLAM, 0)
              WHEN f.DOVIZTIP <> 0 THEN ISNULL(f.DOVIZTUT, 0)
              ELSE 0 
          END) AS ToplamTutar,
          ISNULL(f.DOVIZTIP, '0') AS DovizTuru,
          f.DOVIZTUT AS DovizTutar,
          f.CARI_KODU AS CariKodu,
          f.FTIRSIP AS FaturaTuru,
          CASE f.FTIRSIP
              WHEN '1' THEN 'Satış Faturası'
              WHEN '2' THEN 'Alış Faturası'
              ELSE ''
          END AS FaturaTuruLabel
      FROM tblFATUIRS f WITH (NOLOCK)
      WHERE f.CARI_KODU = @cariKodu
          AND f.FTIRSIP IN ('1', '2')
      ORDER BY f.TARIH DESC, f.FATIRS_NO DESC
    `;
        return this.db.query(sql, { cariKodu });
    }
}
