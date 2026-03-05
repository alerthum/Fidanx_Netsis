# Fidanx Netsis – Proje Analiz ve İyileştirme Planı

**Tarih:** 23 Şubat 2025  
**Amaç:** Tüm modüllerin test edilmesi, eksikliklerin ve tutarsızlıkların tespiti, uygulanabilir iyileştirme planı.

---

## 1. Özet

Proje analizi sonucunda tespit edilen sorunlar ve öncelik sırasına göre önerilen çözümler aşağıda listelenmiştir. Bazı kritik düzeltmeler (stok endpoint, raporlar veri çekme) uygulanmış durumdadır.

---

## 2. Tespit Edilen Sorunlar ve Durumları

### 2.1 Kritik – Çalışmayan / Boş Dönen

| # | Sorun | Sayfa/Modül | Durum | Öneri |
|---|-------|-------------|-------|-------|
| 1 | **Ürün listesi boş** – Yeni sipariş ekle → Ürün Ekle modalında ürün gelmiyordu | Satışlar (`/satislar`) | ✅ Düzeltildi | `GET /netsis/stocks` → `GET /netsis/stocks/list` |
| 2 | **Stok listesi boş** – Yanlış endpoint | Raporlar, Üretim, Reçeteler, Analizler | ✅ Düzeltildi | Tüm `netsis/stocks` çağrıları `netsis/stocks/list` olarak güncellendi |
| 3 | **Raporlar – Sıcaklık ve gübre kayıtları boş** | Raporlar (Operasyonlar sekmesi) | ✅ Düzeltildi | `fetchAllData` içine `temperature-logs` ve `fertilizer-logs` API çağrıları eklendi |
| 4 | **INC_KEY hatası** – Faturalar API 500 dönüyordu | Netsis Invoices | ⚠️ Kontrol | `invoices.service.ts` zaten `INCKEYNO` kullanıyor; dokümantasyon düzeltildi. Hata devam ederse Netsis TBLSTHAR şemasını kontrol edin |

### 2.2 Orta – Tutarsızlıklar

| # | Sorun | Açıklama | Öneri |
|---|-------|----------|-------|
| 5 | **Tedarikçi Sipariş Özeti – Hizmet faturaları** | Raporlar’da “Tedarikçi Sipariş Özeti” alış faturalarından (`faturaTuru=2`) oluşuyor. Hizmet faturaları (HIZ%) da aynı tabloda; bu yüzden hizmet faturaları da listede görünüyor. | İstenirse fatura kalemlerinde `STOK_KODU LIKE 'HIZ%'` olanları filtreleyip sadece mal alışlarını gösterebilirsiniz. |
| 6 | **Gider dağılımı boş** | Raporlar’da `expenses` her zaman `[]`; `finans/expenses` API’si çağrılmıyor | `fetchAllData` içine `GET /api/finans/expenses` ekleyin veya Netsis alış faturalarını kategori bazında gider olarak kullanın |
| 7 | **Dashboard sıcaklık boş** | Ana sayfada sıcaklık verisi sabit `[]` | `GET /api/production/temperature-logs` ile veri çekin veya bu bölümü kaldırın |
| 8 | **Sipariş–Stok eşleşmesi** | Satış siparişlerinde `PlantId` vs Netsis `StokKodu` uyumsuzluğu | `OrderItems` için Netsis stok kodu ile Plants tablosu arasında eşleme (ErpCode) ekleyin |

### 2.3 Sera – Firebase → Netsis Geçişi

| # | Sorun | Açıklama | Öneri |
|---|-------|----------|-------|
| 9 | **Sera verisi local SQL’de** | Sıcaklık ölçümleri ve yakıt tüketimi `TemperatureLogs` tablosunda (local SQL). Firebase’deki eski veriler taşınmamış | **Adım 1:** Firebase’den mevcut verileri export edin. **Adım 2:** Netsis’te uygun tablo tasarlayın (veya mevcut local tabloyu Netsis DB’ye taşıyın). **Adım 3:** Migration script ile verileri taşıyın. **Adım 4:** API’yi Netsis veritabanına yönlendirin |

### 2.4 Diğer

| # | Sorun | Öneri |
|---|-------|-------|
| 10 | **Firebase referansları** | `firebase-admin` ve `check_db.js` kullanılmıyor; proje Netsis’e geçmiş | Gereksiz Firebase bağımlılıklarını kaldırın |
| 11 | **Scanner sayfası** | Barkod tarayıcı mock/simülasyon | Gerçek cihaz entegrasyonu için plan yapın |

---

## 3. Veri Kaynakları Haritası

| Modül | Netsis API | Local SQL | Mock/Boş |
|-------|------------|-----------|----------|
| Dashboard | ✓ | - | tempStats |
| Satışlar | ✓ | sales/orders | - |
| Stoklar | ✓ | plants (opsiyonel) | - |
| Satınalma | ✓ | - | - |
| Üretim | ✓ | batches | - |
| Raporlar | ✓ | - | - |
| Finans | ✓ | expenses | - |
| Firmalar | ✓ | - | - |
| Sera | - | TemperatureLogs | - |
| Operasyon | - | activity, recipes | - |
| Hareketler | - | production | - |
| Reçeteler | ✓ | recipes | - |
| Analizler | ✓ | - | - |
| Destek | - | support | - |
| Scanner | - | - | ✓ |

---

## 4. Uygulama Planı (Öncelik Sırasına Göre)

### Faz 1 – Kritik Düzeltmeler (Tamamlandı)
- [x] Satışlar ürün listesi endpoint düzeltmesi
- [x] Tüm stok endpoint’lerinin `netsis/stocks/list` olarak güncellenmesi
- [x] Raporlar sıcaklık/gübre API çağrılarının eklenmesi
- [x] API_SQL_DEBUG dokümantasyonunda INC_KEY → INCKEYNO düzeltmesi

### Faz 2 – Orta Öncelik (Önerilen)
1. **Gider dağılımı:** Raporlar’da `finans/expenses` API’sini kullan veya Netsis alış faturalarını kategori bazında gider olarak göster
2. **Dashboard sıcaklık:** `production/temperature-logs` ile veri çek veya bölümü kaldır
3. **Tedarikçi özeti filtresi:** Hizmet faturalarını hariç tutmak için fatura kalemlerinde `STOK_KODU NOT LIKE 'HIZ%'` filtresi ekle (isteğe bağlı)

### Faz 3 – Sera Firebase → Netsis Geçişi
1. Firebase’den sıcaklık ve yakıt verilerini export et
2. Netsis veritabanında tablo tasarla veya mevcut `TemperatureLogs` şemasını Netsis DB’ye taşı
3. Migration script yaz ve verileri taşı
4. `TemperatureService` / `ProductionController` bağlantısını Netsis DB’ye yönlendir

### Faz 4 – İyileştirmeler
1. Satış siparişlerinde PlantId / StokKodu eşlemesini netleştir
2. Gereksiz Firebase bağımlılıklarını kaldır
3. Scanner sayfası için gerçek cihaz entegrasyonu planı

---

## 5. API Endpoint Özeti

### Netsis (`/api/netsis/*`)
- `GET /netsis/stocks/list` – Stok listesi ✅
- `GET /netsis/stocks/list-with-suppliers` – Stok + tedarikçi
- `GET /netsis/stocks/movements` – Stok hareketleri
- `GET /netsis/customers` – Cari kartları
- `GET /netsis/invoices` – Faturalar (faturaTuru: 1=Satış, 2=Alış)
- `GET /netsis/invoices/:belgeNo/details` – Fatura kalemleri
- `GET /netsis/invoices/summary` – Özet
- `GET /netsis/invoices/tab-categories` – Tab kategorileri
- `GET /netsis/finance/*` – Banka, kasa, ödemeler
- `GET /netsis/dashboard/*` – Dashboard verileri

### Local / Hibrit
- `GET/POST /production` – Üretim partileri
- `GET/POST/DELETE /production/temperature-logs` – Sera sıcaklık
- `GET/POST/DELETE /production/fertilizer-logs` – Gübre kayıtları
- `GET/POST /sales/*` – Satış siparişleri
- `GET/POST /finans/expenses` – Giderler
- `GET/POST /recipes` – Reçeteler
- `GET/POST /activity` – Aktivite
- `GET/POST /support` – Destek talepleri

---

## 6. Sonuç

Kritik sorunlar (stok endpoint’leri, raporlar veri çekme) giderildi. Tedarikçi özetinde hizmet faturalarının görünmesi, fatura türü filtresinin sadece alış/satış ayrımı yapmasından kaynaklanıyor; istenirse kalem bazında HIZ filtresi eklenebilir. Sera verilerinin Netsis’e taşınması için Firebase export + migration + API güncellemesi gerekiyor.

Bu plan, proje genelinde tutarlılığı artırmak ve eksik veri akışlarını tamamlamak için kullanılabilir.
