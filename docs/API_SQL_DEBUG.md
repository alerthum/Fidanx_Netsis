# Fidanx Netsis - API ve SQL Debug Dokümantasyonu

Bu doküman, alış faturaları ve ilgili Netsis entegrasyonunda debug yaparken kullanılacak API endpoint'leri ve SQL sorgularını içerir.

---

## Alış Faturaları API

### Endpoint
```
GET /api/netsis/invoices?faturaTuru=2&page=1&pageSize=500
```

### Parametreler
| Parametre | Açıklama | Varsayılan |
|-----------|----------|------------|
| faturaTuru | 1=Satış, 2=Alış | - |
| page | Sayfa numarası | 1 |
| pageSize | Sayfa başına kayıt | 20 (önerilen: 500) |

### Dosya Konumları
- **Controller:** `server/src/netsis/invoices/invoices.controller.ts`
- **Service:** `server/src/netsis/invoices/invoices.service.ts`

### Kullanılan SQL (getAllInvoices)

```sql
-- Toplam kayıt sayısı
SELECT COUNT(*) as total 
FROM tblFATUIRS f WITH (NOLOCK) 
WHERE f.FTIRSIP = '2';

-- Fatura listesi (sayfalı)
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
        f.CARI_KODU AS CariKodu,
        dbo.TRK(cs.CARI_ISIM) AS CariAdi,
        f.FTIRSIP AS FaturaTuru,
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
        (SELECT COUNT(*) FROM TBLSTHAR sh WITH (NOLOCK) 
         WHERE RTRIM(sh.FISNO) = RTRIM(f.FATIRS_NO) AND sh.STHAR_FTIRSIP = f.FTIRSIP) AS KalemSayisi,
        ROW_NUMBER() OVER (ORDER BY f.TARIH DESC, f.FATIRS_NO DESC) AS RowNum
    FROM tblFATUIRS f WITH (NOLOCK)
    LEFT JOIN TBLCASABIT cs WITH (NOLOCK) ON cs.CARI_KOD = f.CARI_KODU
    WHERE f.FTIRSIP = '2'
) AS PagedResults
WHERE RowNum > @offset AND RowNum <= @offset + @pageSize
ORDER BY RowNum;
```

**Önemli:** Cari tipi (120/320) filtresi YOK. Sadece `FTIRSIP='2'` ile alış faturaları alınır. `tblFATUIRS.CARI_KODU` faturadaki satıcı (tedarikçi) kodudur.

### Sütun/Tablo Adları (Netsis versiyonuna göre)
- **TBLSTHAR:** Sıra için `INCKEYNO` kullanılır (INC_KEY değil)
- **Kasa:** `TBLKASA` = kasa hareketleri, `TBLKASAMAS` = kasa tanımları (TBLKASAHAR/TBLKASASABIT yok)

### Hata: "Faturalar alınamadı"
1. Sunucu konsolundaki hata mesajını kontrol edin.
2. Netsis veritabanında `tblFATUIRS` tablosunun varlığını doğrulayın:
   ```sql
   SELECT TOP 1 * FROM tblFATUIRS;
   ```
3. Tablo yoksa veya farklı isimdeyse (örn. `TBLFATUIRS`), `invoices.service.ts` içindeki tablo adını güncelleyin.

### Belirli Faturayı Kontrol Etmek İçin
```sql
-- Örnek: SEA202500000024 ve 320-01-OO-002
SELECT f.*, dbo.TRK(cs.CARI_ISIM) AS CariAdi
FROM tblFATUIRS f WITH (NOLOCK)
LEFT JOIN TBLCASABIT cs ON cs.CARI_KOD = f.CARI_KODU
WHERE f.FATIRS_NO = 'SEA202500000024' 
   OR f.CARI_KODU = '320-01-OO-002';
```

---

## Fatura Kalemleri API

### Endpoint
```
GET /api/netsis/invoices/:belgeNo/details?cariKodu=...
```

### Örnek
```
GET /api/netsis/invoices/SEA202500000024/details?cariKodu=320-01-OO-002
```

### Kullanılan SQL (getInvoiceDetails)

```sql
SELECT
    sh.STOK_KODU AS StokKodu,
    dbo.TRK(ss.STOK_ADI) AS StokAdi,
    sh.STHAR_GCMIK AS Miktar,
    dbo.TRK(ss.OLCU_BR1) AS Birim,
    sh.STHAR_NF AS BirimFiyat,
    sh.STHAR_GCMIK * sh.STHAR_NF AS Tutar,
    sh.STHAR_KDV AS KdvOrani
FROM TBLSTHAR sh WITH (NOLOCK)
LEFT JOIN TBLSTSABIT ss WITH (NOLOCK) ON ss.STOK_KODU = sh.STOK_KODU
WHERE RTRIM(sh.FISNO) = RTRIM(@belgeNo)
  AND sh.STHAR_FTIRSIP = '2'
ORDER BY sh.INCKEYNO;
```

### API Yanıt Alanları
| Alan | Açıklama |
|------|----------|
| StokKodu | Stok kartı kodu |
| StokAdi | Stok adı |
| Miktar | Miktar |
| Birim | Ölçü birimi |
| BirimFiyat | Birim fiyat |
| Tutar | Toplam tutar |
| KdvOrani | KDV oranı |

---

## Netsis Tabloları Özeti

| Tablo | Açıklama |
|-------|----------|
| tblFATUIRS | Fatura başlıkları (FATIRS_NO, CARI_KODU, FTIRSIP, TARIH, GENELTOPLAM) |
| TBLSTHAR | Stok hareketleri (FISNO, STOK_KODU, STHAR_GCMIK, STHAR_NF, STHAR_FTIRSIP) |
| TBLCASABIT | Cari kartları (CARI_KOD, CARI_ISIM) |
| TBLSTSABIT | Stok kartları (STOK_KODU, STOK_ADI, OLCU_BR1) |

### FTIRSIP Değerleri
- `'1'` = Satış faturası
- `'2'` = Alış faturası

---

## Sorun Giderme

### Tüm alış faturaları gelmiyor
1. `pageSize` parametresini 500 veya 1000 yapın
2. Netsis'te doğrudan SQL çalıştırıp toplam kayıt sayısını kontrol edin
3. `FTIRSIP` değerinin gerçekten `'2'` olduğunu doğrulayın

### Belirli fatura listede yok (örn. SEA202500000024)
1. Yukarıdaki "Belirli Faturayı Kontrol Etmek İçin" SQL'ini çalıştırın
2. `FATIRS_NO` formatında boşluk veya özel karakter olup olmadığını kontrol edin
3. `FTIRSIP` değerini kontrol edin
