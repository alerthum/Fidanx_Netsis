# Firebase → SQL Sera Verisi Taşıma

Firebase (convert/Fidanx) projesindeki **sera sıcaklık ölçümleri** ve **yakıt tüketim** kayıtları (`tenants/{tenantId}/temperature_logs`), Fidanx_Netsis SQL veritabanındaki `TemperatureLogs` tablosuna bu script ile aktarılır.

## Gereksinimler

1. **Fidanx Firebase credentials**  
   Fidanx projesindeki `firebase-admin.json` dosyası (convert/Fidanx/server/firebase-admin.json).

2. **Fidanx_Netsis .env**  
   SQL Server bağlantısı için `server/.env` içinde:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASS`
   - `DB_NAME`
   - (isteğe bağlı) `DB_PORT` (varsayılan: 1433)

3. **TemperatureLogs tablosu**  
   `server/src/database/create_tables.sql` çalıştırılmış olmalı (tablo zaten bu dosyada tanımlı).

## Çalıştırma

**Server klasöründen** (Fidanx_Netsis/server):

```bash
# Firebase credentials yolunu verin (Fidanx projesindeki firebase-admin.json)
# Windows (PowerShell)
$env:FIREBASE_CREDENTIALS = "C:\Users\...\Desktop\convert\Fidanx\server\firebase-admin.json"
npm run migrate:firebase-temp

# Windows (CMD)
set FIREBASE_CREDENTIALS=C:\Users\...\Desktop\convert\Fidanx\server\firebase-admin.json
npm run migrate:firebase-temp
```

Script, credentials dosyasını şu sırayla arar:
1. Ortam değişkeni `FIREBASE_CREDENTIALS`
2. Varsayılan: `Fidanx_Netsis/server/../../Fidanx/server/firebase-admin.json`

## Ne yapar?

1. Firebase Firestore’a bağlanır.
2. `tenants` koleksiyonundaki her tenant için `temperature_logs` alt koleksiyonunu okur.
3. Her belgeyi `TemperatureLogs` satırına çevirir:
   - `date` → LogDate
   - `seraIci.sabah/ogle/aksam` → SeraIciSabah, SeraIciOgle, SeraIciAksam
   - `seraDisi.sabah/ogle/aksam` → SeraDisiSabah, SeraDisiOgle, SeraDisiAksam
   - `mazot` → MazotLt
   - `note` → Note
4. Tüm satırları SQL Server’daki `TemperatureLogs` tablosuna INSERT eder.

## Tekrar çalıştırma

Script her çalıştırmada **yeni kayıt ekler**; mevcut kayıtları silmez. Aynı veriyi tekrar taşımak istemezseniz önce `TemperatureLogs` tablosunu temizleyebilir veya scripti tek seferlik kullanabilirsiniz.

## Tablo yapısı (referans)

`create_tables.sql` içinde:

```sql
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
```
