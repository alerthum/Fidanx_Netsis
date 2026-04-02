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
                await this.db.query(`INSERT INTO PurchaseItems (PurchaseId, MaterialId, Amount, UnitPrice) VALUES (@pId, @mId, @amount, @price)`, {
                    pId: purchaseId,
                    mId: item.materialId,
                    amount: Number(item.amount),
                    price: Number(item.unitPrice) || 0
                });
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
        const purchases = await this.db.query(`SELECT * FROM Purchases WHERE TenantId = @tenantId ORDER BY OrderDate DESC`, { tenantId }) as any[];
        if (!Array.isArray(purchases)) return [];

        const list: any[] = [];
        for (const p of purchases) {
            const items = await this.db.query(`SELECT pi.*, p.Name as materialName FROM PurchaseItems pi LEFT JOIN Plants p ON pi.MaterialId = p.ErpCode WHERE pi.PurchaseId = @pId`, { pId: p.Id });
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
        // Otomatik kod üretimi (320-01-xxx)
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
            await this.fulfillOrder(tenantId, id);
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

    private async fulfillOrder(tenantId: string, purchaseId: string) {
        const items = await this.db.query(`SELECT pi.*, p.SupplierId FROM PurchaseItems pi JOIN Purchases p ON pi.PurchaseId = p.Id WHERE pi.PurchaseId = @pId`, { pId: purchaseId }) as any[];
        if (!Array.isArray(items)) return;

        for (const item of items) {
            if (item.MaterialId) {
                await this.db.query(`UPDATE Plants SET CurrentStock = CurrentStock + @amount, SupplierId = COALESCE(@sId, SupplierId) WHERE Id = @mId AND TenantId = @tenantId`, {
                    amount: item.Amount,
                    sId: item.SupplierId || null,
                    mId: item.MaterialId,
                    tenantId
                });
            }
        }

        await this.activity.log(tenantId, {
            action: 'Stok Girişi',
            title: `Satınalma tamamlandı. Stoklar güncellendi.`,
            icon: '📥',
            color: 'bg-emerald-50 text-emerald-600'
        });
    }

    async delete(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM PurchaseItems WHERE PurchaseId = @id`, { id });
        await this.db.query(`DELETE FROM Purchases WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { id };
    }
}
