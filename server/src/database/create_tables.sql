-- FidanX MSSQL Tablo Yapıları

-- 1. Sıcaklık Kayıtları (TemperatureLogs)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TemperatureLogs')
BEGIN
    CREATE TABLE TemperatureLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        LogDate DATETIME NOT NULL,
        SeraIciSabah FLOAT,
        SeraIciOgle FLOAT,
        SeraIciAksam FLOAT,
        SeraDisiSabah FLOAT,
        SeraDisiOgle FLOAT,
        SeraDisiAksam FLOAT,
        MazotLt FLOAT,
        Note NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 2. Gübreleme Kayıtları (FertilizerLogs)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FertilizerLogs')
BEGIN
    CREATE TABLE FertilizerLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        LogDate DATETIME NOT NULL,
        Fungusit BIT DEFAULT 0,
        AminoAsit BIT DEFAULT 0,
        StartFert BIT DEFAULT 0,
        Note NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 3. Aktivite Kayıtları (ActivityLogs)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ActivityLogs')
BEGIN
    CREATE TABLE ActivityLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Action NVARCHAR(100),
        Title NVARCHAR(MAX),
        Icon NVARCHAR(50),
        Color NVARCHAR(100),
        LogDate DATETIME DEFAULT GETDATE(),
        Cost FLOAT DEFAULT 0
    );
END

-- 4. Giderler (Expenses)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses')
BEGIN
    CREATE TABLE Expenses (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        BatchId INT, -- ProductionBatches.Id
        Title NVARCHAR(MAX),
        Amount FLOAT NOT NULL,
        ExpenseType NVARCHAR(50), -- GENEL, ISÇILIK, ENERJI vb.
        LogDate DATETIME DEFAULT GETDATE(),
        ReferenceId NVARCHAR(100) -- Eğer bir aktivite veya faturaya bağlıysa
    );
END

-- 5. Üretim Partileri (ProductionBatches)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductionBatches')
BEGIN
    CREATE TABLE ProductionBatches (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        LotId NVARCHAR(100) NOT NULL,
        PlantName NVARCHAR(MAX),
        RecipeId INT,
        Quantity FLOAT DEFAULT 0,
        ViyolCount INT DEFAULT 0,
        StartDate DATETIME DEFAULT GETDATE(),
        EndDate DATETIME,
        Stage NVARCHAR(50), -- VIYOL, SAKSI vb.
        Location NVARCHAR(100),
        Status NVARCHAR(50) DEFAULT 'AKTIF',
        AccumulatedCost FLOAT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 6. Üretim Geçmişi (ProductionHistory)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductionHistory')
BEGIN
    CREATE TABLE ProductionHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BatchId INT NOT NULL,
        LogDate DATETIME DEFAULT GETDATE(),
        Action NVARCHAR(MAX),
        Note NVARCHAR(MAX)
    );
END

-- 7. Üretim Maliyet Geçmişi (ProductionCostHistory)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductionCostHistory')
BEGIN
    CREATE TABLE ProductionCostHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BatchId INT NOT NULL,
        Amount FLOAT NOT NULL,
        CostPerUnit FLOAT,
        Action NVARCHAR(MAX),
        CostType NVARCHAR(50),
        LogDate DATETIME DEFAULT GETDATE()
    );
END

-- 8. Reçeteler (Recipes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Recipes')
BEGIN
    CREATE TABLE Recipes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Name NVARCHAR(MAX) NOT NULL,
        CreatedBy NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 9. Reçete Kalemleri (RecipeItems)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RecipeItems')
BEGIN
    CREATE TABLE RecipeItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        RecipeId INT NOT NULL,
        MaterialId INT, -- Plants.Id
        Amount FLOAT NOT NULL,
        Unit NVARCHAR(50)
    );
END

-- 9b. Reçete şema genişletme (Faz B)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Recipes') AND name = 'Description')
    ALTER TABLE Recipes ADD Description NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RecipeItems') AND name = 'MaterialCode')
    ALTER TABLE RecipeItems ADD MaterialCode NVARCHAR(50);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RecipeItems') AND name = 'MaterialName')
    ALTER TABLE RecipeItems ADD MaterialName NVARCHAR(200);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RecipeItems') AND name = 'UnitPrice')
    ALTER TABLE RecipeItems ADD UnitPrice FLOAT DEFAULT 0;

-- 3b. ActivityLogs genişletme (Faz B)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ActivityLogs') AND name = 'Details')
    ALTER TABLE ActivityLogs ADD Details NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ActivityLogs') AND name = 'Locations')
    ALTER TABLE ActivityLogs ADD Locations NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ActivityLogs') AND name = 'UserDate')
    ALTER TABLE ActivityLogs ADD UserDate DATETIME;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ActivityLogs') AND name = 'RecipeId')
    ALTER TABLE ActivityLogs ADD RecipeId INT;

-- Netsis Karakter Dönüşümü (Türkçe Karakter Desteği)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TRK]') AND type in (N'FN', N'IF', N'TF', N'FS', N'FT'))
BEGIN
    EXEC('CREATE FUNCTION [dbo].[TRK] (@Metin NVARCHAR(MAX))
    RETURNS NVARCHAR(MAX)
    AS
    BEGIN
        DECLARE @Sonuc NVARCHAR(MAX)
        SET @Sonuc = @Metin
        SET @Sonuc = REPLACE(@Sonuc, CHAR(208), ''Ğ'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(220), ''Ü'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(222), ''Ş'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(221), ''İ'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(214), ''Ö'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(199), ''Ç'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(240), ''ğ'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(252), ''ü'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(254), ''ş'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(253), ''ı'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(246), ''ö'')
        SET @Sonuc = REPLACE(@Sonuc, CHAR(231), ''ç'')
        RETURN @Sonuc
    END')
END;
GO

-- 10. Kiracılar / İşletmeler (Tenants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenants')
BEGIN
    CREATE TABLE Tenants (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) UNIQUE,
        Name NVARCHAR(MAX),
        SettingsJson NVARCHAR(MAX), -- JSON settings
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 11. Bitkiler / Ürünler (Plants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Plants')
BEGIN
    CREATE TABLE Plants (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Name NVARCHAR(MAX) NOT NULL,
        Category NVARCHAR(100),
        Type NVARCHAR(50),
        CurrentStock FLOAT DEFAULT 0,
        WholesalePrice FLOAT DEFAULT 0,
        RetailPrice FLOAT DEFAULT 0,
        ViyolCount INT DEFAULT 0,
        CuttingCount INT DEFAULT 0,
        SupplierId NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 12. Müşteriler (Customers)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Name NVARCHAR(MAX) NOT NULL,
        Email NVARCHAR(100),
        Phone NVARCHAR(50),
        Address NVARCHAR(MAX),
        ErpCode NVARCHAR(50), -- Netsis/Logo ERP kodu
        TaxNumber NVARCHAR(50),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 13. Satışlar / Faturalar (Sales)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Sales')
BEGIN
    CREATE TABLE Sales (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        CustomerId INT,
        InvoiceNo NVARCHAR(50),
        TotalAmount FLOAT DEFAULT 0,
        IsSynced BIT DEFAULT 0,
        LogDate DATETIME DEFAULT GETDATE()
    );
END

-- 14. Siparişler (Orders)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        CustomerId INT,
        OrderDate DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(50), -- Bekliyor, Tamamlandı vb.
        TotalAmount FLOAT DEFAULT 0,
        CompletedAt DATETIME,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 15. Sipariş Kalemleri (OrderItems)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems')
BEGIN
    CREATE TABLE OrderItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        PlantId INT, -- Eski lokal Plants referansı; yeni akışta kullanılmaz
        StokKodu NVARCHAR(50), -- Netsis TBLSTSABIT.STOK_KODU
        StokAdi NVARCHAR(200),
        Quantity FLOAT DEFAULT 0,
        UnitPrice FLOAT DEFAULT 0
    );
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'StokKodu')
    ALTER TABLE OrderItems ADD StokKodu NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'StokAdi')
    ALTER TABLE OrderItems ADD StokAdi NVARCHAR(200) NULL;

-- 16. Satınalmalar (Purchases)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Purchases')
BEGIN
    CREATE TABLE Purchases (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        SupplierId NVARCHAR(100),
        SupplierName NVARCHAR(MAX),
        OrderDate DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(50),
        ReceivedDate DATETIME,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 17. Satınalma Kalemleri (PurchaseItems)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseItems')
BEGIN
    CREATE TABLE PurchaseItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PurchaseId INT NOT NULL,
        MaterialId NVARCHAR(100), -- Netsis TBLSTSABIT.STOK_KODU
        MaterialName NVARCHAR(200),
        Amount FLOAT DEFAULT 0,
        UnitPrice FLOAT DEFAULT 0
    );
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseItems') AND name = 'MaterialName')
    ALTER TABLE PurchaseItems ADD MaterialName NVARCHAR(200) NULL;

-- 18. Destek Talepleri (SupportTickets)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportTickets')
BEGIN
    CREATE TABLE SupportTickets (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Subject NVARCHAR(MAX),
        Description NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'NEW',
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

-- 19. Destek Geçmişi (SupportHistory)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportHistory')
BEGIN
    CREATE TABLE SupportHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TicketId INT NOT NULL,
        Action NVARCHAR(MAX),
        LogDate DATETIME DEFAULT GETDATE()
    );
END

-- 20. FDX_BitkiPartileri (Yeni Üretim Modülü)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FDX_BitkiPartileri')
BEGIN
    CREATE TABLE FDX_BitkiPartileri (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiNo NVARCHAR(50) NOT NULL UNIQUE,    
        KokPartiNo NVARCHAR(50),
        NetsisStokKodu NVARCHAR(50) NOT NULL,     
        StokAdi NVARCHAR(200),
        BitkiAdi NVARCHAR(200),
        Safha NVARCHAR(100) NOT NULL,             
        SaksiBoyutu NVARCHAR(50),
        Konum NVARCHAR(200),                      
        BaslangicMiktar INT NOT NULL,
        MevcutMiktar INT NOT NULL,
        Miktar INT,
        FireMiktar INT DEFAULT 0,
        SatilanMiktar INT DEFAULT 0,
        BirimMaliyet FLOAT DEFAULT 0,             
        ToplamMaliyet FLOAT DEFAULT 0,            
        KaynakPartiId INT, 
        AlisFaturaNo NVARCHAR(50),                
        Durum NVARCHAR(50) DEFAULT 'AKTIF',       
        BaslangicTarihi DATETIME DEFAULT GETDATE(),
        OlusturmaTarihi DATETIME DEFAULT GETDATE(),
        KaynakNetsisInckeyNo INT,
        KaynakSeriNo NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_FDX_BitkiPartileri_Kaynak FOREIGN KEY (KaynakPartiId) REFERENCES FDX_BitkiPartileri(Id)
    );
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'KokPartiNo')
    ALTER TABLE FDX_BitkiPartileri ADD KokPartiNo NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'StokAdi')
    ALTER TABLE FDX_BitkiPartileri ADD StokAdi NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'SaksiBoyutu')
    ALTER TABLE FDX_BitkiPartileri ADD SaksiBoyutu NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'Miktar')
    ALTER TABLE FDX_BitkiPartileri ADD Miktar INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'OlusturmaTarihi')
    ALTER TABLE FDX_BitkiPartileri ADD OlusturmaTarihi DATETIME DEFAULT GETDATE();
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'KaynakNetsisInckeyNo')
    ALTER TABLE FDX_BitkiPartileri ADD KaynakNetsisInckeyNo INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_BitkiPartileri') AND name = 'KaynakSeriNo')
    ALTER TABLE FDX_BitkiPartileri ADD KaynakSeriNo NVARCHAR(100) NULL;

-- 21. FDX_PartiIslemleri
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FDX_PartiIslemleri')
BEGIN
    CREATE TABLE FDX_PartiIslemleri (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiId INT NOT NULL,
        PartiNo NVARCHAR(50),
        IslemTipi NVARCHAR(50) NOT NULL,          
        Aciklama NVARCHAR(MAX),
        KaynakStokKodu NVARCHAR(50),
        HedefStokKodu NVARCHAR(50),
        Miktar INT,                               
        FireMiktari INT,
        MaliyetTutar FLOAT DEFAULT 0,             
        BirimMaliyetEtkisi FLOAT DEFAULT 0,       
        KullanilanMalzeme NVARCHAR(200),          
        KullanilanMiktar FLOAT,                   
        KullanilanYardimciMalzemeler NVARCHAR(MAX),
        IscilikMaliyeti FLOAT DEFAULT 0,
        EkMaliyet FLOAT DEFAULT 0,
        ToplamMaliyetEtkisi FLOAT DEFAULT 0,
        NetsisCikisInckeyNo INT,
        NetsisGirisInckeyNo INT,
        HedefKonum NVARCHAR(200),                 
        HedefSafha NVARCHAR(100),                 
        HedefPartiId INT,
        IslemYapan NVARCHAR(100),
        IslemTarihi DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_FDX_PartiIslemleri_Parti FOREIGN KEY (PartiId) REFERENCES FDX_BitkiPartileri(Id),
        CONSTRAINT FK_FDX_PartiIslemleri_HedefParti FOREIGN KEY (HedefPartiId) REFERENCES FDX_BitkiPartileri(Id)
    );
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'PartiNo')
    ALTER TABLE FDX_PartiIslemleri ADD PartiNo NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'KaynakStokKodu')
    ALTER TABLE FDX_PartiIslemleri ADD KaynakStokKodu NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'HedefStokKodu')
    ALTER TABLE FDX_PartiIslemleri ADD HedefStokKodu NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'FireMiktari')
    ALTER TABLE FDX_PartiIslemleri ADD FireMiktari INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'KullanilanYardimciMalzemeler')
    ALTER TABLE FDX_PartiIslemleri ADD KullanilanYardimciMalzemeler NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'IscilikMaliyeti')
    ALTER TABLE FDX_PartiIslemleri ADD IscilikMaliyeti FLOAT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'EkMaliyet')
    ALTER TABLE FDX_PartiIslemleri ADD EkMaliyet FLOAT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'ToplamMaliyetEtkisi')
    ALTER TABLE FDX_PartiIslemleri ADD ToplamMaliyetEtkisi FLOAT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'NetsisCikisInckeyNo')
    ALTER TABLE FDX_PartiIslemleri ADD NetsisCikisInckeyNo INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FDX_PartiIslemleri') AND name = 'NetsisGirisInckeyNo')
    ALTER TABLE FDX_PartiIslemleri ADD NetsisGirisInckeyNo INT NULL;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FDX_PartiMaliyetleri')
BEGIN
    CREATE TABLE FDX_PartiMaliyetleri (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        PartiId INT NOT NULL,
        PartiNo NVARCHAR(50) NOT NULL,
        MaliyetTipi NVARCHAR(50) NOT NULL,
        Tutar FLOAT DEFAULT 0,
        Miktar FLOAT DEFAULT 0,
        BirimMaliyet FLOAT DEFAULT 0,
        NetsisInckeyNo INT NULL,
        Aciklama NVARCHAR(MAX),
        Tarih DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_FDX_PartiMaliyetleri_Parti FOREIGN KEY (PartiId) REFERENCES FDX_BitkiPartileri(Id)
    );
END

-- 22. FDX_Barkodlar
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FDX_Barkodlar')
BEGIN
    CREATE TABLE FDX_Barkodlar (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BarkodNo NVARCHAR(100) NOT NULL UNIQUE,   
        PartiId INT NOT NULL,
        NetsisStokKodu NVARCHAR(50),
        Durum NVARCHAR(50) DEFAULT 'AKTIF',       
        BasimTarihi DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_FDX_Barkodlar_Parti FOREIGN KEY (PartiId) REFERENCES FDX_BitkiPartileri(Id)
    );
END

-- 23. FDX_SicaklikKayitlari
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FDX_SicaklikKayitlari')
BEGIN
    CREATE TABLE FDX_SicaklikKayitlari (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(50) NOT NULL,
        Konum NVARCHAR(200) NOT NULL,              
        OlcumTarihi DATETIME NOT NULL,
        IcSicaklik FLOAT,
        DisSicaklik FLOAT,
        Nem FLOAT,
        MazotLt FLOAT,
        Not_ NVARCHAR(MAX),
        OlcumPeriyodu NVARCHAR(20),               
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END

