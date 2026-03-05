-- ============================================
-- FidanX v2 — Müşteri Veritabanı Migration Script
-- Tarih: 2026-02-27
-- Hedef: SASERA2025 (192.168.1.100)
-- NOT: Netsis tabloları (TBL*) kesinlikle dokunulmaz!
-- Sadece FDX_ ve Tenants tabloları oluşturulur.
-- ============================================

USE SASERA2025;
GO

-- ============================================
-- 1. Tenants (Ayarlar) Tablosu
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Tenants')
BEGIN
    CREATE TABLE Tenants (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NULL,
        Name NVARCHAR(MAX) NULL,
        SettingsJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NULL DEFAULT (GETDATE())
    );
    PRINT 'Tenants tablosu oluşturuldu.';
END
ELSE
    PRINT 'Tenants tablosu zaten mevcut.';
GO

-- ============================================
-- 2. FDX_BitkiPartileri (Üretim Partileri)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_BitkiPartileri')
BEGIN
    CREATE TABLE FDX_BitkiPartileri (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiNo NVARCHAR(50) NOT NULL,
        NetsisStokKodu NVARCHAR(50) NOT NULL,
        BitkiAdi NVARCHAR(200) NULL,
        Safha NVARCHAR(100) NOT NULL,
        Konum NVARCHAR(200) NULL,
        BaslangicMiktar INT NOT NULL,
        MevcutMiktar INT NOT NULL,
        FireMiktar INT NULL DEFAULT (0),
        SatilanMiktar INT NULL DEFAULT (0),
        BirimMaliyet FLOAT NULL DEFAULT (0),
        ToplamMaliyet FLOAT NULL DEFAULT (0),
        KaynakPartiId INT NULL,
        AlisFaturaNo NVARCHAR(50) NULL,
        Durum NVARCHAR(50) NULL DEFAULT ('AKTIF'),
        BaslangicTarihi DATETIME NULL DEFAULT (GETDATE()),
        CreatedAt DATETIME NULL DEFAULT (GETDATE())
    );
    PRINT 'FDX_BitkiPartileri tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_BitkiPartileri tablosu zaten mevcut.';
GO

-- ============================================
-- 3. FDX_PartiIslemleri (Parti İşlem Geçmişi)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_PartiIslemleri')
BEGIN
    CREATE TABLE FDX_PartiIslemleri (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiId INT NOT NULL,
        IslemTipi NVARCHAR(50) NOT NULL,
        Aciklama NVARCHAR(MAX) NULL,
        Miktar INT NULL,
        MaliyetTutar FLOAT NULL DEFAULT (0),
        BirimMaliyetEtkisi FLOAT NULL DEFAULT (0),
        KullanilanMalzeme NVARCHAR(200) NULL,
        KullanilanMiktar FLOAT NULL,
        HedefKonum NVARCHAR(200) NULL,
        HedefSafha NVARCHAR(100) NULL,
        HedefPartiId INT NULL,
        IslemYapan NVARCHAR(100) NULL,
        IslemTarihi DATETIME NULL DEFAULT (GETDATE())
    );
    PRINT 'FDX_PartiIslemleri tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_PartiIslemleri tablosu zaten mevcut.';
GO

-- ============================================
-- 4. FDX_SicaklikKayitlari (Sera Sıcaklık Ölçümleri)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_SicaklikKayitlari')
BEGIN
    CREATE TABLE FDX_SicaklikKayitlari (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Konum NVARCHAR(200) NOT NULL,
        OlcumTarihi DATETIME NOT NULL,
        IcSicaklik FLOAT NULL,
        DisSicaklik FLOAT NULL,
        Nem FLOAT NULL,
        MazotLt FLOAT NULL,
        Not_ NVARCHAR(MAX) NULL,
        OlcumPeriyodu NVARCHAR(20) NULL,
        CreatedAt DATETIME NULL DEFAULT (GETDATE())
    );
    PRINT 'FDX_SicaklikKayitlari tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_SicaklikKayitlari tablosu zaten mevcut.';
GO

-- ============================================
-- 5. FDX_Barkodlar (Barkod Sistemi)
-- ============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FDX_Barkodlar')
BEGIN
    CREATE TABLE FDX_Barkodlar (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BarkodNo NVARCHAR(100) NOT NULL,
        PartiId INT NOT NULL,
        NetsisStokKodu NVARCHAR(50) NULL,
        Durum NVARCHAR(50) NULL DEFAULT ('AKTIF'),
        BasimTarihi DATETIME NULL DEFAULT (GETDATE())
    );
    PRINT 'FDX_Barkodlar tablosu oluşturuldu.';
END
ELSE
    PRINT 'FDX_Barkodlar tablosu zaten mevcut.';
GO

-- ============================================
-- 6. Varsayılan Tenant Ayarlarını Ekle
-- ============================================
IF NOT EXISTS (SELECT * FROM Tenants WHERE TenantId = 'demo-tenant')
BEGIN
    INSERT INTO Tenants (TenantId, Name, SettingsJson)
    VALUES (
        'demo-tenant',
        N'FidanX Üretim',
        N'{"categories":["Meyve","Süs","Endüstriyel"],"users":[{"name":"Admin Kullanıcı","role":"Süper Yetkili","email":"admin@fidanx.com"}],"productionStages":["TEPSİ","KÖK_SAKSI","BÜYÜK_SAKSI","SATIŞA_HAZIR"],"locations":["Sera 1","Sera 2","Açık Alan"],"expenseTypes":["Gübre","İlaç","Mazot","İşçilik","Nakliye"],"measurementParams":["Sıcaklık","Nem","Toprak pH","Işık"],"invoiceCategories":[]}'
    );
    PRINT 'Varsayılan tenant ayarları eklendi.';
END
ELSE
    PRINT 'Tenant ayarları zaten mevcut.';
GO

PRINT '';
PRINT '============================================';
PRINT 'FidanX Migration tamamlandı!';
PRINT '============================================';
GO
