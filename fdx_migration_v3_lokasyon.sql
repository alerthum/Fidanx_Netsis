-- ============================================
-- FidanX v3 — Lokasyon & Stok Dönüşüm Tabloları
-- Tarih: 2026-05-23
-- Hedef: SASERA2025
-- NOT: Netsis tabloları (TBL*) kesinlikle dokunulmaz!
-- ============================================

USE SASERA2025;
GO

-- ============================================
-- 1. FDX_Lokasyonlar (Sabit Arazi Lokasyonları)
-- Sera 1, Sera 2, Açık Bahçe, Kapalı Bahçe vb.
-- Her lokasyona sabit QR kodu atanır.
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_Lokasyonlar')
BEGIN
    CREATE TABLE FDX_Lokasyonlar (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        LokasyonKodu NVARCHAR(50) NOT NULL,       -- Örn: SERA-01, ACIK-01, KAPALI-01
        LokasyonAdi NVARCHAR(200) NOT NULL,        -- Örn: Sera 1, Açık Bahçe Blok A
        LokasyonTipi NVARCHAR(50) NOT NULL,        -- SERA, ACIK_BAHCE, KAPALI_BAHCE, DEPO, TARLA
        Kapasite INT NULL DEFAULT(0),               -- Maksimum bitki sayısı (0 = sınırsız)
        QRKodu NVARCHAR(200) NULL,                  -- Sabit QR barkod değeri (UUID)
        AktifMi BIT NOT NULL DEFAULT(1),
        Notlar NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME NULL DEFAULT(GETDATE())
    );
    PRINT 'FDX_Lokasyonlar tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_Lokasyonlar tablosu zaten mevcut.';
GO

-- ============================================
-- 2. FDX_PartiLokasyon (Parti-Lokasyon Eşleştirmesi)
-- Bir parti birden fazla lokasyonda olabilir!
-- Örn: PRT-001 partisinin 200 tanesi Sera 1'de, 100'ü Açık Bahçe'de
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_PartiLokasyon')
BEGIN
    CREATE TABLE FDX_PartiLokasyon (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiId INT NOT NULL,                       -- FK: FDX_BitkiPartileri.Id
        LokasyonId INT NOT NULL,                    -- FK: FDX_Lokasyonlar.Id
        Miktar INT NOT NULL DEFAULT(0),             -- Bu lokasyondaki adet
        YerlestirmeTarihi DATETIME NULL DEFAULT(GETDATE()),
        Notlar NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NULL DEFAULT(GETDATE())
    );
    PRINT 'FDX_PartiLokasyon tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_PartiLokasyon tablosu zaten mevcut.';
GO

-- ============================================
-- 3. FDX_StokDonusum (Sayım Geçiş / Stok Dönüşüm Kayıtları)
-- Eski düzensiz stoklardan yeni yapıya geçiş fiş kayıtları
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_StokDonusum')
BEGIN
    CREATE TABLE FDX_StokDonusum (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        DonusumFisNo NVARCHAR(50) NOT NULL,         -- DVR202600001 gibi
        EskiStokKodu NVARCHAR(50) NOT NULL,         -- Netsis eski stok kodu
        EskiStokAdi NVARCHAR(200) NULL,
        Durum NVARCHAR(50) NOT NULL DEFAULT('BEKLIYOR'), -- BEKLIYOR, TAMAMLANDI, IPTAL
        ToplamEskiMiktar INT NOT NULL DEFAULT(0),   -- Eski stoktan düşülen miktar
        FireMiktar INT NOT NULL DEFAULT(0),         -- Ölen bitki sayısı
        Aciklama NVARCHAR(MAX) NULL,
        IslemTarihi DATETIME NULL DEFAULT(GETDATE()),
        TamamlanmaTarihi DATETIME NULL,
        CreatedAt DATETIME NULL DEFAULT(GETDATE())
    );
    PRINT 'FDX_StokDonusum tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_StokDonusum tablosu zaten mevcut.';
GO

-- ============================================
-- 4. FDX_StokDonusumKalem (Dönüşümün hedef kalemleri)
-- Her bir eski stoktan kaç adet hangi yeni stoka dönüştürüldüğü
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_StokDonusumKalem')
BEGIN
    CREATE TABLE FDX_StokDonusumKalem (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DonusumId INT NOT NULL,                     -- FK: FDX_StokDonusum.Id
        YeniStokKodu NVARCHAR(50) NOT NULL,         -- Netsis yeni stok kodu (saksı boyutlu)
        YeniStokAdi NVARCHAR(200) NULL,
        SaksiBoyutu NVARCHAR(50) NULL,              -- 1L, 2L, 5L, 15L, 30L
        Miktar INT NOT NULL DEFAULT(0),
        BirimMaliyet FLOAT NULL DEFAULT(0),
        PartiNo NVARCHAR(50) NULL,                  -- Atanan parti no
        LokasyonId INT NULL,                        -- FK: FDX_Lokasyonlar.Id (Nerede yerleştirildi)
        NetsisFisNo NVARCHAR(50) NULL,              -- Netsis giriş fiş numarası
        CreatedAt DATETIME NULL DEFAULT(GETDATE())
    );
    PRINT 'FDX_StokDonusumKalem tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_StokDonusumKalem tablosu zaten mevcut.';
GO

PRINT '';
PRINT '============================================';
PRINT 'FidanX v3 Lokasyon & Dönüşüm Migration tamamlandı!';
PRINT '============================================';
GO
