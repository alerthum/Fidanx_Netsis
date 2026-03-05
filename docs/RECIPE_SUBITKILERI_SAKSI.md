# Reçete Yapısı – Süs Bitkileri (Plan)

**Tarih:** Şubat 2025  
**Amaç:** Ana ürünlerimiz süs bitkileri; reçetede hangi saksıda, hangi toprak ve bitki ilacı kullanıldığı bilgisinin tutulması.

---

## 1. Ürün / Stok Yapısı

- **Ana ürünler:** Süs bitkileri (bitkiler saksılara konur).
- **Saksılar:** Satınalma modülünde **saksı grubu** stoklarından alınır (Netsis stok kodu).
- **Saksı bilgisi (bitki bazında):** Netsis **S_YEDEK1** alanında tutulur. Stok listesinde “Saksı” sütunu buradan gelir; sadece süs bitkileri için anlamlıdır.

---

## 2. Reçete Tarafında Olması Planlanan Bilgiler

Reçetede aşağıdaki alanların yer alması hedeflenir:

| Bilgi            | Açıklama |
|------------------|----------|
| **Saksı**        | Bitkinin konulduğu saksı (Netsis S_YEDEK1 / saksı grubu stok kodu). |
| **Toprak türü**  | Hangi toprak türü kullanıldığı ve miktarı. |
| **Bitki ilacı**  | Kullanılan bitki koruma / ilaç bilgisi. |

Bu yapı ile:

- Hangi saksıda satışa hazır ürün olduğu,
- Hangi topraktan ne kadar kullanıldığı,
- Hangi bitki ilacının uygulandığı

reçete üzerinden takip edilebilecek.

---

## 3. Mevcut Reçete Modülü

- **Backend:** `Recipes` + `RecipeItems` (malzeme, miktar, birim).
- **Genişletme (ileride):** Reçete başlığına veya kalemlere saksı (S_YEDEK1), toprak türü/miktar ve bitki ilacı alanları eklenebilir; şema ve API buna göre güncellenir.

---

## 4. Özet

- Saksı bilgisi stok kartında **S_YEDEK1** ile geliyor; stok listesinde “Saksı” sütununda gösteriliyor.
- Reçete tarafında saksı, toprak türü/miktar ve bitki ilacı bilgilerinin tutulması planlanıyor; detay şema ve ekranlar ihtiyaca göre netleştirilecek.
