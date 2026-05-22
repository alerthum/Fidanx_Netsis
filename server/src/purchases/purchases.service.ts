import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ActivityService } from '../activity/activity.service';
import { NetsisInvoicesService } from '../netsis/invoices/invoices.service';

@Injectable()
export class PurchasesService {
    private readonly logger = new Logger(PurchasesService.name);

    constructor(
        private db: DatabaseService,
        private activity: ActivityService,
        private netsisInvoices: NetsisInvoicesService
    ) { }

    async create(tenantId: string, data: any) {
        await this.ensurePurchaseItemNetsisColumns();

        const sql = `
            INSERT INTO Purchases (TenantId, SupplierId, SupplierName, OrderDate, Status, Category) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @sId, @sName, @date, @status, @category)`;

        const results = await this.db.query(sql, {
            tenantId,
            sId: data.supplierId || null,
            sName: data.supplier || null,
            date: new Date(),
            status: data.status || 'Bekliyor',
            category: data.category || 'Diğer'
        });

        const purchaseId = results[0].Id;

        if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
                const stokKodu = String(item.materialId || item.stokKodu || item.StokKodu || item.sku || item.id || '').trim();
                const stokAdi = item.materialName || item.stokAdi || item.StokAdi || item.name || null;

                await this.db.query(
                    `INSERT INTO PurchaseItems (PurchaseId, MaterialId, MaterialName, Amount, UnitPrice)
                     VALUES (@pId, @mId, @mName, @amount, @price)`,
                    {
                        pId: purchaseId,
                        mId: stokKodu || null,
                        mName: stokAdi,
                        amount: Number(item.amount),
                        price: Number(item.unitPrice) || 0
                    }
                );
            }
        }

        try {
            const sync = await this.netsisInvoices.syncFidanxPurchaseToNetsis(tenantId, purchaseId.toString());
            if (!sync?.ok) {
                this.logger.warn(`Netsis alış faturası oluşturulamadı: ${sync?.reason || 'bilinmeyen'}`);
            }
        } catch (err) {
            this.logger.error('Netsis alış faturası senkron hatası:', err);
        }

        await this.activity.log(tenantId, {
            action: 'Satınalma',
            title: `Yeni satınalma siparişi oluşturuldu: ${data.supplier || 'Bilinmeyen'}`,
            icon: '🛒',
            color: 'bg-blue-50 text-blue-600'
        });

        return { id: purchaseId.toString(), ...data };
    }

    async findAll(tenantId: string) {
        await this.ensurePurchaseItemNetsisColumns();

        const purchases = await this.db.query(`SELECT * FROM Purchases WHERE TenantId = @tenantId ORDER BY OrderDate DESC`, { tenantId }) as any[];
        if (!Array.isArray(purchases)) return [];

        const list: any[] = [];
        for (const p of purchases) {
            const items = await this.db.query(
                `SELECT
                    pi.*,
                    COALESCE(pi.MaterialName, pi.MaterialId) as materialName,
                    pi.MaterialId as stokKodu
                 FROM PurchaseItems pi
                 WHERE pi.PurchaseId = @pId`,
                { pId: p.Id }
            );
            list.push({
                ...p,
                id: p.Id.toString(),
                items: Array.isArray(items) ? items : []
            });
        }
        return list;
    }

    async getSuppliers(tenantId: string) {
        const results = await this.db.query(`SELECT * FROM Customers WHERE TenantId = @tenantId AND LEFT(ErpCode, 3) = '320'`, { tenantId });
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString() })) : [];
    }

    async createSupplier(tenantId: string, data: any) {
        const prefix = '320-01';
        const results = await this.db.query(
            `SELECT TOP 1 ErpCode FROM Customers WHERE TenantId = @tenantId AND ErpCode LIKE @prefix + '%' ORDER BY ErpCode DESC`,
            { tenantId, prefix }
        );

        let nextCode = `${prefix}-001`;
        if (results && results.length > 0) {
            const lastCode = results[0].ErpCode;
            const parts = lastCode.split('-');
            const lastNum = parseInt(parts[parts.length - 1]);
            nextCode = `${prefix}-${(lastNum + 1).toString().padStart(3, '0')}`;
        }

        const sql = `INSERT INTO Customers (TenantId, Name, ErpCode) OUTPUT INSERTED.Id VALUES (@tenantId, @name, @code)`;
        const insertRes = await this.db.query(sql, { tenantId, name: data.name, code: nextCode });
        return { id: insertRes[0].Id.toString(), ...data, erpCode: nextCode };
    }

    async updateStatus(tenantId: string, id: string, status: string) {
        const results = await this.db.query(`SELECT * FROM Purchases WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        if (results.length === 0) throw new NotFoundException('Sipariş bulunamadı.');
        const order = results[0];

        if (status === 'Tamamlandı' && order.Status !== 'Tamamlandı') {
            await this.fulfillOrder(id);
        }

        await this.db.query(`UPDATE Purchases SET Status = @status, ReceivedDate = @recAt WHERE Id = @id`, {
            status,
            recAt: status === 'Tamamlandı' ? new Date() : null,
            id
        });

        await this.activity.log(tenantId, {
            action: 'Satınalma Durumu',
            title: `Sipariş durumu güncellendi: ${status}`,
            icon: '📦',
            color: 'bg-purple-50 text-purple-600'
        });

        return { id, status };
    }

    private async fulfillOrder(purchaseId: string) {
        await this.ensurePurchaseItemNetsisColumns();

        const items = await this.db.query(`SELECT MaterialId, Amount FROM PurchaseItems WHERE PurchaseId = @pId`, { pId: purchaseId }) as any[];
        if (!Array.isArray(items)) return;

        // Stok ana kaynağı Netsis'tir. Lokal Plants.CurrentStock artırılmaz.
        // Gerçek stok girişi alış faturası / Netsis TBLSTHAR üzerinden yapılır.
        const missingCodes = items.filter(i => !String(i.MaterialId || '').trim()).length;
        if (missingCodes > 0) {
            this.logger.warn(`Satınalma #${purchaseId}: ${missingCodes} kalemde Netsis STOK_KODU eksik.`);
        }
    }

    async delete(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM PurchaseItems WHERE PurchaseId = @id`, { id });
        await this.db.query(`DELETE FROM Purchases WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { id };
    }

    private async ensurePurchaseItemNetsisColumns() {
        await this.db.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseItems') AND name = 'MaterialName')
                ALTER TABLE PurchaseItems ADD MaterialName NVARCHAR(200) NULL;
        `);
    }
}
