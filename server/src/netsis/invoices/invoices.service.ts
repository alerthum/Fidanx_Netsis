import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NetsisInvoicesService {
    private readonly logger = new Logger(NetsisInvoicesService.name);

    constructor(private db: DatabaseService) { }

    /**
     * Netsis'te yeni satış/alış faturası oluşturur.
     * tblFATUIRS (başlık) + TBLSTHAR (kalemler) + TBLCAHAR (cari hareket) atomik INSERT.
     */
    async createInvoice(data: {
        faturaTuru: '1' | '2';
        cariKodu: string;
        tarih?: string;
        vadeTarihi?: string;
        aciklama?: string;
        items: Array<{ stokKodu: string; miktar: number; birimFiyat: number; kdvOrani?: number }>;
    }) {
        if (!data.cariKodu || !data.items?.length) {
            throw new BadRequestException('Cari kodu ve en az bir kalem gerekli.');
        }

        const faturaNo = await this.generateInvoiceNo(data.faturaTuru);
        const tarih = data.tarih || new Date().toISOString().split('T')[0];
        const vadeTarihi = data.vadeTarihi || tarih;
        const ftirsip = data.faturaTuru;

        let brutTutar = 0;
        let kdvTutar = 0;
        for (const item of data.items) {
            const satirTutar = (item.miktar || 0) * (item.birimFiyat || 0);
            brutTutar += satirTutar;
            kdvTutar += satirTutar * ((item.kdvOrani || 0) / 100);
        }
        const genelToplam = brutTutar + kdvTutar;

        return this.db.executeTransaction(async (tx) => {
            const fReq = this.db.createRequest(tx, {
                fatiraNo: faturaNo,
                tarih,
                vadeTarihi,
                cariKodu: data.cariKodu,
                ftirsip,
                aciklama: data.aciklama || '',
                brutTutar,
                kdvTutar,
                genelToplam
            });
            await fReq.query(`
                INSERT INTO tblFATUIRS (FATIRS_NO, TARIH, ODEMETARIHI, CARI_KODU, FTIRSIP, ACIKLAMA, BRUTTUTAR, KDVTUTAR, GENELTOPLAM, DOVIZTIP)
                VALUES (@fatiraNo, @tarih, @vadeTarihi, @cariKodu, @ftirsip, @aciklama, @brutTutar, @kdvTutar, @genelToplam, 0)
            `);

            for (const item of data.items) {
                const satirTutar = (item.miktar || 0) * (item.birimFiyat || 0);
                const gckod = ftirsip === '1' ? 'C' : 'G';

                const sReq = this.db.createRequest(tx, {
                    fisno: faturaNo,
                    stokKodu: item.stokKodu,
                    ftirsip,
                    gckod,
                    miktar: item.miktar || 0,
                    birimFiyat: item.birimFiyat || 0,
                    tutar: satirTutar,
                    kdvOrani: item.kdvOrani || 0,
                    tarih,
                    htur: 1
                });
                await sReq.query(`
                    INSERT INTO TBLSTHAR (FISNO, STOK_KODU, STHAR_FTIRSIP, STHAR_GCKOD, STHAR_GCMIK, STHAR_NF, STHAR_BF, STHAR_TUTAR, STHAR_KDV, STHAR_TARIH, STHAR_HTUR)
                    VALUES (@fisno, @stokKodu, @ftirsip, @gckod, @miktar, @birimFiyat, @birimFiyat, @tutar, @kdvOrani, @tarih, @htur)
                `);
            }

            const cReq = this.db.createRequest(tx, {
                cariKod: data.cariKodu,
                tarih,
                vadeTarihi,
                belgeNo: faturaNo,
                borc: ftirsip === '1' ? genelToplam : 0,
                alacak: ftirsip === '2' ? genelToplam : 0,
                aciklama: data.aciklama || `FidanX Fatura: ${faturaNo}`
            });
            await cReq.query(`
                INSERT INTO TBLCAHAR (CARI_KOD, TARIH, VADE_TARIHI, BELGE_NO, BORC, ALACAK, ACIKLAMA)
                VALUES (@cariKod, @tarih, @vadeTarihi, @belgeNo, @borc, @alacak, @aciklama)
            `);

            this.logger.log(`Netsis fatura oluşturuldu: ${faturaNo} (${ftirsip === '1' ? 'Satış' : 'Alış'})`);
            return { success: true, faturaNo, genelToplam };
        });
    }

    private async generateInvoiceNo(faturaTuru: string): Promise<string> {
        const prefix = faturaTuru === '1' ? 'FDX' : 'FDA';
        const yil = new Date().getFullYear();
        const sonuc = await this.db.query(`
            SELECT TOP 1 FATIRS_NO FROM tblFATUIRS WITH (NOLOCK)
            WHERE FATIRS_NO LIKE @pattern
            ORDER BY FATIRS_NO DESC
        `, { pattern: `${prefix}${yil}%` });

        if (sonuc.length === 0) return `${prefix}${yil}00000001`;

        const lastNo = sonuc[0].FATIRS_NO as string;
        const numMatch = lastNo.match(/\d+$/);
        if (!numMatch) return `${prefix}${yil}00000001`;

        const nextNum = (parseInt(numMatch[0]) + 1).toString().padStart(8, '0');
        return `${prefix}${yil}${nextNum}`;
    }

    async getAllInvoices(page: number = 1, pageSize: number = 20, faturaTuru?: string) {
        const offset = (page - 1) * pageSize;
        let whereClause = "f.FTIRSIP IN ('1', '2')";
        if (faturaTuru) {
            whereClause += ` AND f.FTIRSIP = @faturaTuru`;
        }

        const countSql = `SELECT COUNT(*) as total FROM tblFATUIRS f WITH (NOLOCK) WHERE ${whereClause}`;
        let totalCount = 0;
        try {
            const countResult = await this.db.query(countSql, { faturaTuru });
            totalCount = countResult[0]?.total || 0;
        } catch (err) {
            this.logger.error('Fatura sayısı alınamadı (tblFATUIRS kontrol edin):', err);
            throw err;
        }

        // KategoriLabel subquery bazen hata verebiliyor - önce basit sorgu dene
        const sqlBasit = `
      SELECT *
      FROM (
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
              dbo.TRK(cs.CARI_ISIM) AS CariAdi,
              f.FTIRSIP AS FaturaTuru,
              CASE f.FTIRSIP
                  WHEN '1' THEN 'Satış Faturası'
                  WHEN '2' THEN 'Alış Faturası'
                  ELSE ''
              END AS FaturaTuruLabel,
              ISNULL((
                  SELECT TOP 1 
                      CASE 
                          WHEN sh.STOK_KODU LIKE '150-01%' THEN '150-01'
                          WHEN sh.STOK_KODU LIKE '150-02%' THEN '150-02'
                          WHEN sh.STOK_KODU LIKE '150-03%' THEN '150-03'
                          WHEN sh.STOK_KODU LIKE 'HIZ%' THEN 'HIZ'
                          ELSE 'DIGER'
                      END
                  FROM TBLSTHAR sh WITH (NOLOCK) 
                  WHERE RTRIM(sh.FISNO) = RTRIM(f.FATIRS_NO) 
                    AND sh.STHAR_FTIRSIP = f.FTIRSIP
                  ORDER BY sh.INCKEYNO
              ), 'DIGER') AS Kategori,
              ISNULL((
                  SELECT TOP 1 
                      CASE 
                          WHEN sh.STOK_KODU LIKE '150-01%' THEN '150-01'
                          WHEN sh.STOK_KODU LIKE '150-02%' THEN '150-02'
                          WHEN sh.STOK_KODU LIKE '150-03%' THEN '150-03'
                          WHEN sh.STOK_KODU LIKE 'HIZ%' THEN 'Hizmet Faturası'
                          ELSE 'Diğer'
                      END
                  FROM TBLSTHAR sh WITH (NOLOCK) 
                  WHERE RTRIM(sh.FISNO) = RTRIM(f.FATIRS_NO) AND sh.STHAR_FTIRSIP = f.FTIRSIP
                  ORDER BY sh.INCKEYNO
              ), 'Diğer') AS KategoriLabel,
              (SELECT COUNT(*) FROM TBLSTHAR sh WITH (NOLOCK) WHERE RTRIM(sh.FISNO) = RTRIM(f.FATIRS_NO) AND sh.STHAR_FTIRSIP = f.FTIRSIP) AS KalemSayisi,
              ROW_NUMBER() OVER (ORDER BY f.TARIH DESC, f.FATIRS_NO DESC) AS RowNum
          FROM tblFATUIRS f WITH (NOLOCK)
          LEFT JOIN TBLCASABIT cs WITH (NOLOCK) ON cs.CARI_KOD = f.CARI_KODU
          WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= @offset + @pageSize
      ORDER BY RowNum
    `;

        let items: any[];
        try {
            items = await this.db.query(sqlBasit, { offset, pageSize, faturaTuru });
        } catch (err) {
            this.logger.error('Fatura listesi alınamadı:', err);
            throw err;
        }

        return {
            items,
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
        };
    }

    /** Fatura kalemleri. faturaTuru: '1' = Satış, '2' = Alış. Verilmezse önce alış sonra satış dener. */
    async getInvoiceDetails(belgeNo: string, cariKodu: string, faturaTuru?: string) {
        const turu = faturaTuru === '1' || faturaTuru === '2' ? faturaTuru : null;
        const sql = `
      SELECT
          sh.STOK_KODU AS StokKodu,
          dbo.TRK(ss.STOK_ADI) AS StokAdi,
          sh.STHAR_GCMIK AS Miktar,
          dbo.TRK(ss.OLCU_BR1) AS Birim,
          sh.STHAR_NF AS BirimFiyat,
          sh.STHAR_GCMIK * sh.STHAR_NF AS Tutar,
          sh.STHAR_DOVTIP AS DovizTuru,
          sh.STHAR_DOVFIAT AS DovizBirimFiyat,
          sh.STHAR_KDV AS KdvOrani
      FROM TBLSTHAR sh WITH (NOLOCK)
      LEFT JOIN TBLSTSABIT ss WITH (NOLOCK) ON ss.STOK_KODU = sh.STOK_KODU
      WHERE RTRIM(sh.FISNO) = RTRIM(@belgeNo)
        AND sh.STHAR_FTIRSIP = @faturaTuru
      ORDER BY sh.INCKEYNO
    `;
        if (turu) {
            return this.db.query(sql, { belgeNo, faturaTuru: turu });
        }
        const alis = await this.db.query(sql, { belgeNo, faturaTuru: '2' });
        if (alis && alis.length > 0) return alis;
        return this.db.query(sql, { belgeNo, faturaTuru: '1' });
    }

    /** Tab etiketlerini TBLSTGRUP'tan çeker (150-01 -> Süs Bitkisi vb.) */
    async getInvoiceTabCategories() {
        const sql = `
      SELECT '150-01' AS id, ISNULL((SELECT TOP 1 DBO.TRK(g.GRUP_ISIM) FROM TBLSTSABIT s WITH (NOLOCK) INNER JOIN TBLSTGRUP g WITH (NOLOCK) ON g.GRUP_KOD = s.GRUP_KODU WHERE s.STOK_KODU LIKE '150-01%'), 'Üretim 150-01') AS label
      UNION ALL SELECT '150-02', ISNULL((SELECT TOP 1 DBO.TRK(g.GRUP_ISIM) FROM TBLSTSABIT s WITH (NOLOCK) INNER JOIN TBLSTGRUP g WITH (NOLOCK) ON g.GRUP_KOD = s.GRUP_KODU WHERE s.STOK_KODU LIKE '150-02%'), 'Üretim 150-02')
      UNION ALL SELECT '150-03', ISNULL((SELECT TOP 1 DBO.TRK(g.GRUP_ISIM) FROM TBLSTSABIT s WITH (NOLOCK) INNER JOIN TBLSTGRUP g WITH (NOLOCK) ON g.GRUP_KOD = s.GRUP_KODU WHERE s.STOK_KODU LIKE '150-03%'), 'Üretim 150-03')
      UNION ALL SELECT 'DIGER', 'Diğer'
      UNION ALL SELECT 'HIZ', 'Hizmet Faturası'
      UNION ALL SELECT 'TÜMÜ', 'Tümü'
    `;
        return this.db.query(sql);
    }

    async getShipmentSummary(startDate?: string, endDate?: string) {
        const sql = `
      SELECT 
          f.FTIRSIP AS FaturaTuru,
          CASE f.FTIRSIP WHEN '1' THEN 'Satış' WHEN '2' THEN 'Alış' END AS Tip,
          COUNT(f.FATIRS_NO) AS FaturaSayisi,
          SUM(CASE WHEN f.DOVIZTIP = 0 THEN f.GENELTOPLAM ELSE 0 END) AS ToplamTL,
          SUM(CASE WHEN f.DOVIZTIP = 1 THEN f.DOVIZTUT ELSE 0 END) AS ToplamUSD,
          SUM(CASE WHEN f.DOVIZTIP = 2 THEN f.DOVIZTUT ELSE 0 END) AS ToplamEUR
      FROM tblFATUIRS f WITH (NOLOCK)
      WHERE f.FTIRSIP IN ('1', '2')
        AND (@startDate IS NULL OR f.TARIH >= @startDate)
        AND (@endDate IS NULL OR f.TARIH <= @endDate)
      GROUP BY f.FTIRSIP
    `;
        return this.db.query(sql, { startDate, endDate });
    }

    async updateInvoice(belgeNo: string, cariKodu: string, faturaTuru: string, items: any[], totals: any) {
        this.logger.log(`Netsis Fatura Güncelleniyor: ${belgeNo} (${faturaTuru === '1' ? 'Satış' : 'Alış'})`);

        try {
            // 1. TBLSTHAR: Kalemleri döngü ile güncelle
            for (const item of items) {
                // Not: Eğer item.isNew veya yeni kalem eklendiyse INSERT gerektirir. 
                // Buradaki basit mantık olanları günceller.
                await this.db.query(`
                    UPDATE TBLSTHAR 
                    SET STHAR_GCMIK = @miktar, STHAR_NF = @fiyat, STHAR_BF = @fiyat
                    WHERE RTRIM(FISNO) = RTRIM(@belgeNo) AND STHAR_FTIRSIP = @faturaTuru AND RTRIM(STOK_KODU) = RTRIM(@stokKodu)
                `, {
                    miktar: item.amount,
                    fiyat: item.unitPrice,
                    belgeNo,
                    faturaTuru,
                    stokKodu: item.StokKodu || item.materialId || item.id
                });
            }

            // 2. TBLFATUIRS: Toplam Tutarları güncelle
            await this.db.query(`
                UPDATE tblFATUIRS
                SET BRUTTUTAR = @subTotal, GENELTOPLAM = @total
                WHERE RTRIM(FATIRS_NO) = RTRIM(@belgeNo) AND FTIRSIP = @faturaTuru
            `, {
                belgeNo,
                faturaTuru,
                subTotal: totals.subTotal,
                total: totals.total
            });

            // 3. TBLCAHAR: Açık Cari hareketini bul ve tutarını düzelt
            if (faturaTuru === '1') {
                // Satış faturası, müşteri borçlandı
                await this.db.query(`
                    UPDATE TBLCAHAR 
                    SET BORC = @total 
                    WHERE RTRIM(BELGE_NO) = RTRIM(@belgeNo) AND RTRIM(CARI_KOD) = RTRIM(@cariKodu)
                `, { total: totals.total, belgeNo, cariKodu });
            } else if (faturaTuru === '2') {
                // Alış faturası, tedarikçi alacaklandı
                await this.db.query(`
                    UPDATE TBLCAHAR 
                    SET ALACAK = @total 
                    WHERE RTRIM(BELGE_NO) = RTRIM(@belgeNo) AND RTRIM(CARI_KOD) = RTRIM(@cariKodu)
                `, { total: totals.total, belgeNo, cariKodu });
            }

            return { success: true, message: 'Fatura başarıyla Netsis üzerinde güncellendi.' };

        } catch (err) {
            this.logger.error('Netsis Fatura güncellenirken hata oluştu', err);
            throw new Error('Fatura güncellenirken Netsis üzerinde hata oluştu.');
        }
    }
}
