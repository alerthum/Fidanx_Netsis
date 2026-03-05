-- ERP Integration Phase 2 - Migration Script
-- Date: 2026-02-23

-- Add ErpCode to Plants to support string identifiers from Netsis
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Plants') AND name = 'ErpCode')
BEGIN
    ALTER TABLE Plants ADD ErpCode NVARCHAR(100);
END

-- Update PurchaseItems to support string MaterialId (StokKodu)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseItems') AND name = 'MaterialId' AND TYPE_NAME(user_type_id) != 'nvarchar')
BEGIN
    ALTER TABLE PurchaseItems ALTER COLUMN MaterialId NVARCHAR(100);
END

-- Add Category to Purchases for classification (Gıda, Enerji, etc.)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Purchases') AND name = 'Category')
BEGIN
    ALTER TABLE Purchases ADD Category NVARCHAR(100);
END
