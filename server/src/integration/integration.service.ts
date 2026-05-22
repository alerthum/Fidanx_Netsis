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
        this.logger.warn(
            `syncStocks çağrısı atlandı (tenant=${tenantId}). ` +
            `Stok/bitki kartlarında ana kaynak Netsis TBLSTSABIT/TBLSTHAR; lokal Plants tablosuna kopyalama yapılmaz.`
        );

        return {
            skipped: true,
            sourceOfTruth: 'Netsis',
            message: 'Stok kartları doğrudan Netsis veritabanından okunur; lokal Plants tablosuna senkron yapılmadı.'
        };
    }

    /**
     * @deprecated Netsis fatura yazımı `NetsisInvoicesService.createInvoice` ve
     * `syncFidanxPurchaseToNetsis` ile yapılır. Eski çağrılar için log bırakıldı.
     */
    async pushInvoice(tenantId: string, invoiceId: string, type: 'PURCHASE' | 'SALES') {
        this.logger.warn(
            `pushInvoice kullanımdan kalktı: ${type} #${invoiceId}. ` +
            `GET /api/netsis/invoices/push?tenantId=${tenantId}&invoiceId=${invoiceId}&type=${type} veya createInvoice kullanın.`
        );
        return { deprecated: true, tenantId, invoiceId, type };
    }

    async getNextErpCode(tenantId: string, module: 'CUSTOMER' | 'STOCK', prefix: string) {
        const table = module === 'CUSTOMER' ? 'TBLCASABIT' : 'TBLSTSABIT';
        const column = module === 'CUSTOMER' ? 'CARI_KOD' : 'STOK_KODU';

        const results = await this.db.query(
            `SELECT TOP 1 ${column} as LastCode
             FROM ${table} WITH (NOLOCK)
             WHERE ${column} LIKE @prefix + '%'
             ORDER BY ${column} DESC`,
            { prefix }
        );
        if (results.length === 0) return `${prefix}001`;

        const lastCode = results[0].LastCode;
        const numericPartMatch = lastCode.match(/\d+$/);
        if (!numericPartMatch) return `${lastCode}001`;

        const numericPart = numericPartMatch[0];
        const nextNumeric = (parseInt(numericPart) + 1).toString().padStart(numericPart.length, '0');
        return lastCode.replace(numericPart, nextNumeric);
    }
}
