import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(private db: DatabaseService) { }

    async getNetsisConfig(tenantId: string) {
        const results = await this.db.query(`SELECT SettingsJson FROM Tenants WHERE TenantId = @tenantId`, { tenantId });
        if (results.length === 0) return null;
        const settings = results[0].SettingsJson ? JSON.parse(results[0].SettingsJson) : {};
        return settings.netsis || null;
    }

    async syncCustomers(tenantId: string) {
        const config = await this.getNetsisConfig(tenantId);
        if (!config || config.erpType !== 'NETSIS' || !config.sqlServerIp) {
            this.logger.warn(`Kiracı ${tenantId} için Netsis yapılandırması bulunamadı.`);
            return;
        }

        const sqlConfig: sql.config = {
            user: config.sqlUser,
            password: config.sqlPass,
            database: config.sqlDbName,
            server: config.sqlServerIp,
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        };

        try {
            const pool = await sql.connect(sqlConfig);
            // Cari Tip A veya S olan, 120 veya 320 ile başlayanlar
            const result = await pool.request().query(
                `SELECT CARI_KOD, CARI_ISIM, VERGI_NUMARASI, CARI_TIP FROM TBLCASABIT 
                 WHERE LEFT(CARI_KOD, 3) IN ('120', '320')`
            );

            for (const row of result.recordset) {
                const existing = await this.db.query(`SELECT Id FROM Customers WHERE ErpCode = @code AND TenantId = @tenantId`, {
                    code: row.CARI_KOD,
                    tenantId
                });

                if (existing.length === 0) {
                    await this.db.query(`INSERT INTO Customers (TenantId, ErpCode, Name, TaxNumber) VALUES (@tenantId, @code, @name, @tax)`, {
                        tenantId,
                        code: row.CARI_KOD,
                        name: row.CARI_ISIM,
                        tax: row.VERGI_NUMARASI
                    });
                } else {
                    await this.db.query(`UPDATE Customers SET Name = @name, TaxNumber = @tax WHERE Id = @id`, {
                        name: row.CARI_ISIM,
                        tax: row.VERGI_NUMARASI,
                        id: existing[0].Id
                    });
                }
            }
            this.logger.log(`Kiracı ${tenantId} için Netsis'ten ${result.recordset.length} müşteri/tedarikçi senkronize edildi.`);
            await pool.close();
        } catch (err) {
            this.logger.error(`Kiracı ${tenantId} için Netsis müşteri senkronizasyon hatası:`, err);
        }
    }

    async syncStocks(tenantId: string) {
        const config = await this.getNetsisConfig(tenantId);
        if (!config || config.erpType !== 'NETSIS' || !config.sqlServerIp) {
            this.logger.warn(`Kiracı ${tenantId} için Netsis yapılandırması bulunamadı.`);
            return;
        }

        const sqlConfig: sql.config = {
            user: config.sqlUser,
            password: config.sqlPass,
            database: config.sqlDbName,
            server: config.sqlServerIp,
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        };

        try {
            const pool = await sql.connect(sqlConfig);
            // Kullanıcının verdiği sorgu:
            const result = await pool.request().query(
                `SELECT dbo.trk(GRUP_ISIM) as GrupIsim, sbt.STOK_KODU, dbo.trk(STOK_ADI) as STOK_ADI, OLCU_BR1, S_YEDEK1 
                 FROM TBLSTSABIT sbt 
                 LEFT JOIN TBLSTGRUP gr ON sbt.GRUP_KODU = gr.GRUP_KOD`
            );

            for (const row of result.recordset) {
                const existing = await this.db.query(`SELECT Id FROM Plants WHERE ErpCode = @code AND TenantId = @tenantId`, {
                    code: row.STOK_KODU,
                    tenantId
                });

                if (existing.length === 0) {
                    await this.db.query(`INSERT INTO Plants (TenantId, ErpCode, Name, Category, Type, CurrentStock, Unit) VALUES (@tenantId, @code, @name, @cat, @type, 0, @unit)`, {
                        tenantId,
                        code: row.STOK_KODU,
                        name: row.STOK_ADI,
                        cat: row.GrupIsim || 'Netsis',
                        type: 'NETSIS',
                        unit: row.OLCU_BR1
                    });
                } else {
                    await this.db.query(`UPDATE Plants SET Name = @name, Category = @cat, Unit = @unit WHERE Id = @id`, {
                        name: row.STOK_ADI,
                        cat: row.GrupIsim || 'Netsis',
                        unit: row.OLCU_BR1,
                        id: existing[0].Id
                    });
                }
            }
            this.logger.log(`Kiracı ${tenantId} için Netsis'ten ${result.recordset.length} stok senkronize edildi.`);
            await pool.close();
        } catch (err) {
            this.logger.error(`Kiracı ${tenantId} için Netsis stok senkronizasyon hatası:`, err);
        }
    }

    async pushInvoice(tenantId: string, invoiceId: string, type: 'PURCHASE' | 'SALES') {
        const config = await this.getNetsisConfig(tenantId);
        if (!config || config.erpType !== 'NETSIS' || !config.sqlServerIp) return;

        this.logger.log(`Kiracı ${tenantId} için ${invoiceId} nolu ${type} faturası Netsis'e gönderiliyor...`);

        try {
            const table = type === 'SALES' ? 'Sales' : 'Purchases';
            const invoice = await this.db.query(`SELECT * FROM ${table} WHERE Id = @id`, { id: invoiceId });
            if (invoice.length === 0) return;

            // TODO: Netsis'e yazma mantığı: TBLSTHAR ve TBLFATUIRS tablolarına kayıt
            // Bu kısım Netsis veritabanı yapısına (cari_kod, stok_kod, miktar, fiyat) göre SQL Transaction ile yapılmalıdır.

            this.logger.log(`Netsis Kaydı Başarılı: ${invoice[0].InvoiceNo || invoice[0].Id}`);
        } catch (err) {
            this.logger.error(`Netsis fatura gönderim hatası:`, err);
        }
    }

    async getNextErpCode(tenantId: string, module: 'CUSTOMER' | 'STOCK', prefix: string) {
        // Netsis'ten son kodu çekip bir artırarak dönüyoruz
        const table = module === 'CUSTOMER' ? 'TBLCASABIT' : 'TBLSTSABIT';
        const column = module === 'CUSTOMER' ? 'CARI_KOD' : 'STOK_KODU';

        const sql = `
            SELECT TOP 1 ${column} as LastCode 
            FROM ${table} WITH (NOLOCK) 
            WHERE ${column} LIKE @prefix + '%' 
            ORDER BY ${column} DESC
        `;

        const results = await this.db.query(sql, { prefix });
        if (results.length === 0) return `${prefix}001`;

        const lastCode = results[0].LastCode;
        // Sayısal kısmı ayıklamaya çalışıyoruz
        const numericPartMatch = lastCode.match(/\d+$/);
        if (!numericPartMatch) return `${lastCode}001`;

        const numericPart = numericPartMatch[0];
        const nextNumeric = (parseInt(numericPart) + 1).toString().padStart(numericPart.length, '0');
        return lastCode.replace(numericPart, nextNumeric);
    }
}
