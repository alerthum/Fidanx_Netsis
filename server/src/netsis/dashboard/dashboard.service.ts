import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NetsisDashboardService {
    private readonly logger = new Logger(NetsisDashboardService.name);

    constructor(private db: DatabaseService) { }

    async getStockSummary() {
        const sql = `
      WITH StokBakiyeleri AS (
          SELECT 
              STOK_KODU,
              SUM(CASE WHEN STHAR_GCKOD = 'G' THEN STHAR_GCMIK ELSE -STHAR_GCMIK END) AS Bakiye
          FROM TBLSTHAR WITH (NOLOCK)
          GROUP BY STOK_KODU
      )
      SELECT 
          COUNT(*) AS ToplamKartSayisi,
          SUM(CASE WHEN ISNULL(b.Bakiye, 0) > 0 THEN 1 ELSE 0 END) AS StokluUrunSayisi,
          COUNT(DISTINCT s.GRUP_KODU) AS GrupSayisi
      FROM TBLSTSABIT s WITH (NOLOCK)
      LEFT JOIN StokBakiyeleri b ON s.STOK_KODU = b.STOK_KODU
    `;
        return this.db.query(sql);
    }

    async getCriticalStocks() {
        const sql = `
      WITH StokBakiye AS (
          SELECT 
              STOK_KODU,
              SUM(CASE WHEN STHAR_GCKOD = 'G' THEN STHAR_GCMIK ELSE -STHAR_GCMIK END) AS MevcutMiktar
          FROM TBLSTHAR WITH (NOLOCK)
          GROUP BY STOK_KODU
      )
      SELECT TOP 20
          s.STOK_KODU AS StokKodu,
          dbo.TRK(s.STOK_ADI) AS StokAdi,
          ISNULL(b.MevcutMiktar, 0) AS MevcutMiktar,
          dbo.TRK(s.OLCU_BR1) AS Birim
      FROM TBLSTSABIT s WITH (NOLOCK)
      LEFT JOIN StokBakiye b ON b.STOK_KODU = s.STOK_KODU
      WHERE ISNULL(b.MevcutMiktar, 0) <= 10
      ORDER BY b.MevcutMiktar ASC
    `;
        return this.db.query(sql);
    }

    async getTopCustomers() {
        const sql = `
      SELECT TOP 10
          c.CARI_KOD AS CariKodu,
          dbo.TRK(c.CARI_ISIM) AS CariAdi,
          SUM(ch.BORC - ch.ALACAK) AS Bakiye
      FROM TBLCASABIT c WITH (NOLOCK)
      JOIN TBLCAHAR ch WITH (NOLOCK) ON c.CARI_KOD = ch.CARI_KOD
      WHERE LEFT(c.CARI_KOD, 3) = '120'
      GROUP BY c.CARI_KOD, c.CARI_ISIM
      ORDER BY Bakiye DESC
    `;
        return this.db.query(sql);
    }

    async getMonthlySalesComparison() {
        const sql = `
      SELECT 
          YEAR(TARIH) AS Yil,
          MONTH(TARIH) AS Ay,
          SUM(GENELTOPLAM) AS ToplamSatış,
          COUNT(*) AS FaturaSayisi
      FROM tblFATUIRS WITH (NOLOCK)
      WHERE FTIRSIP = '1'
        AND TARIH >= DATEADD(MONTH, -12, GETDATE())
      GROUP BY YEAR(TARIH), MONTH(TARIH)
      ORDER BY Yil DESC, Ay DESC
    `;
        return this.db.query(sql);
    }
}
