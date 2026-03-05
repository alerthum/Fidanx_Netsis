import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NetsisFinanceService {
    private readonly logger = new Logger(NetsisFinanceService.name);

    constructor(private db: DatabaseService) { }

    // --- BANKA İŞLEMLERİ ---

    async getAllBanks() {
        const sql = `
      SELECT 
          sbt.NETHESKODU AS HesapKodu, 
          ISNULL((SELECT SUM(TUTAR) FROM TBLBNKHESTRA WITH (NOLOCK) WHERE NETHESKODU = sbt.NETHESKODU AND BA = 'B'), 0) AS ToplamBorc, 
          ISNULL((SELECT SUM(TUTAR) FROM TBLBNKHESTRA WITH (NOLOCK) WHERE NETHESKODU = sbt.NETHESKODU AND BA = 'A'), 0) AS ToplamAlacak, 
          0 AS BorcBakiye, 
          0 AS AlacakBakiye, 
          sbt.DOVIZTIPI AS DovizTipi, 
          dbo.TRK(sbt.ACIKLAMA) AS BankaHesapAdi,
          dbo.TRK(bnk.BANKAADI) AS AnaBankaAdi
      FROM TBLBNKHESSABIT sbt WITH (NOLOCK)
      LEFT JOIN TBLBNKSABIT bnk WITH (NOLOCK) ON sbt.NETBANKAKODU = bnk.NETBANKAKODU
      ORDER BY sbt.NETHESKODU
    `;
        return this.db.query(sql);
    }

    async getBankTransactions(hesapKodu: string) {
        const sql = `
      SELECT 
          TARIH AS Tarih, 
          NETHESKODU AS HesapKodu, 
          dbo.TRK(ACIKLAMA) AS Aciklama, 
          CASE WHEN BA = 'B' THEN TUTAR ELSE 0 END AS Borc, 
          CASE WHEN BA = 'A' THEN TUTAR ELSE 0 END AS Alacak, 
          DOVIZTIPI AS DovizTipi, 
          'Banka İşlemi' AS BankaHesapAdi
      FROM TBLBNKHESTRA WITH (NOLOCK)
      WHERE NETHESKODU = @hesapKodu
      ORDER BY TARIH ASC
    `;
        return this.db.query(sql, { hesapKodu });
    }

    // --- KASA İŞLEMLERİ ---

    /** Netsis: TBLKASA = kasa hareketleri, TBLKASAMAS = kasa tanımları (TBLKASAHAR/TBLKASASABIT yok) */
    async getAllCashBoxes() {
        try {
            const sql = `
      SELECT 
          KSMAS_KOD AS KasaKodu, 
          dbo.TRK(KSMAS_NAME) AS Aciklama,
          (SELECT SUM(CASE WHEN IO = 'G' THEN TUTAR ELSE -TUTAR END) 
           FROM TBLKASA WITH (NOLOCK) 
           WHERE KSMAS_KOD = TBLKASAMAS.KSMAS_KOD) AS Bakiye
      FROM TBLKASAMAS WITH (NOLOCK)
      ORDER BY KSMAS_KOD
    `;
            return this.db.query(sql);
        } catch (err) {
            this.logger.warn('Kasa listesi alınamadı (TBLKASAMAS/TBLKASA kontrol edin):', err);
            return [];
        }
    }

    async getCashBoxTransactions(kasaKodu: string) {
        try {
            const sql = `
      SELECT 
          TARIH AS Tarih, 
          dbo.TRK(ACIKLAMA) AS Aciklama, 
          CASE WHEN IO = 'G' THEN TUTAR ELSE 0 END AS Giriş,
          CASE WHEN IO = 'C' THEN TUTAR ELSE 0 END AS Çıkış,
          (SELECT SUM(CASE WHEN IO = 'G' THEN TUTAR ELSE -TUTAR END) 
           FROM TBLKASA kh2 WITH (NOLOCK) 
           WHERE kh2.KSMAS_KOD = kh.KSMAS_KOD AND kh2.TARIH <= kh.TARIH) AS Bakiye
      FROM TBLKASA kh WITH (NOLOCK)
      WHERE KSMAS_KOD = @kasaKodu
      ORDER BY TARIH ASC
    `;
            return this.db.query(sql, { kasaKodu });
        } catch (err) {
            this.logger.warn('Kasa hareketleri alınamadı (TBLKASA kontrol edin):', err);
            return [];
        }
    }

    // --- ÇEK / SENET İŞLEMLERİ ---

    async getCustomerCheques(yeri?: string) {
        let where = "1=1";
        const params: any = {};
        if (yeri && yeri !== '*') {
            where = "mc.SC_YERI = @yeri";
            params.yeri = yeri;
        }

        const sql = `
      SELECT 
          mc.SC_NO AS BelgeNo,
          mc.VADETRH AS VadeTarihi,
          dbo.TRK(mc.ACIKLAMA1) AS Aciklama,
          dbo.TRK(c.CARI_ISIM) AS CariAdi,
          mc.TUTAR AS Tutar,
          mc.DOVTIP AS DovizTuru,
          CASE mc.SC_YERI
              WHEN 'P' THEN 'Portföy'
              WHEN 'T' THEN 'Tahsil'
              WHEN 'C' THEN 'Ciro'
              WHEN 'B' THEN 'Bankada'
              ELSE mc.SC_YERI
          END AS Durum
      FROM TBLMCEK mc WITH (NOLOCK)
      LEFT JOIN TBLCASABIT c WITH (NOLOCK) ON LTRIM(RTRIM(mc.SC_VERENK)) = LTRIM(RTRIM(c.CARI_KOD))
      WHERE ${where}
      ORDER BY mc.VADETRH ASC
    `;
        return this.db.query(sql, params);
    }

    async getOwnCheques() {
        const sql = `
      SELECT 
          bc.SC_NO AS BelgeNo,
          bc.VADETRH AS VadeTarihi,
          dbo.TRK(bc.ACIKLAMA1) AS Aciklama,
          dbo.TRK(c.CARI_ISIM) AS CariAdi,
          bc.TUTAR AS Tutar,
          bc.DOVTIP AS DovizTuru
      FROM TBLBCEK bc WITH (NOLOCK)
      LEFT JOIN TBLCASABIT c WITH (NOLOCK) ON LTRIM(RTRIM(bc.SC_VERENK)) = LTRIM(RTRIM(c.CARI_KOD))
      ORDER BY bc.VADETRH ASC
    `;
        return this.db.query(sql);
    }

    // --- ÖDEMELER ---

    async getPayments(filters: { startDate?: string, endDate?: string, cariAdi?: string, period?: string }) {
        let where = "LEFT(ch.CARI_KOD, 3) = '320' AND ch.BORC > 0";
        const params: any = {};

        if (filters.startDate) {
            where += " AND ch.TARIH >= @startDate";
            params.startDate = filters.startDate;
        }
        if (filters.endDate) {
            where += " AND ch.TARIH <= @endDate";
            params.endDate = filters.endDate;
        }
        if (filters.cariAdi) {
            where += " AND dbo.TRK(cs.CARI_ISIM) LIKE @cariAdi";
            params.cariAdi = `%${filters.cariAdi}%`;
        }
        if (filters.period) {
            // period format: YYYY-MM
            const [year, month] = filters.period.split('-');
            where += " AND YEAR(ch.TARIH) = @year AND MONTH(ch.TARIH) = @month";
            params.year = year;
            params.month = month;
        }

        const sql = `
      SELECT 
          ch.TARIH AS Tarih,
          ch.CARI_KOD AS CariKodu,
          dbo.TRK(cs.CARI_ISIM) AS CariAdi,
          dbo.TRK(ch.ACIKLAMA) AS Aciklama,
          ch.BORC AS Tutar,
          ch.BELGE_NO AS BelgeNo,
          ch.VADE_TARIHI AS VadeTarihi
      FROM TBLCAHAR ch WITH (NOLOCK)
      LEFT JOIN TBLCASABIT cs WITH (NOLOCK) ON cs.CARI_KOD = ch.CARI_KOD
      WHERE ${where}
      ORDER BY ch.TARIH DESC
    `;
        return this.db.query(sql, params);
    }

    async getPaymentSummary() {
        const sql = `
      SELECT 
          COUNT(*) AS IslemSayisi,
          SUM(BORC) AS ToplamOdeme,
          MONTH(TARIH) AS Ay,
          YEAR(TARIH) AS Yil
      FROM TBLCAHAR WITH (NOLOCK)
      WHERE LEFT(CARI_KOD, 3) = '320' AND BORC > 0
      GROUP BY YEAR(TARIH), MONTH(TARIH)
      ORDER BY Yil DESC, Ay DESC
    `;
        return this.db.query(sql);
    }
}
