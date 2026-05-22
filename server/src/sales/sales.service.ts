import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NetsisInvoicesService } from '../netsis/invoices/invoices.service';

@Injectable()
export class SalesService {
    constructor(
        private db: DatabaseService,
        private netsisInvoices: NetsisInvoicesService
    ) { }

    async createInvoice(tenantId: string, data: { customerId: string, totalAmount: number, invoiceNo: string }) {
        const sql = `
            INSERT INTO Sales (TenantId, CustomerId, InvoiceNo, TotalAmount, IsSynced) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @customerId, @invoiceNo, @totalAmount, 0)`;

        const results = await this.db.query(sql, {
            tenantId,
            customerId: data.customerId,
            invoiceNo: data.invoiceNo,
            totalAmount: data.totalAmount
        });

        const saleId = results[0].Id;

        this.netsisInvoices.syncFidanxSaleToNetsis(tenantId, saleId.toString()).catch((err) => {
            console.error('Netsis satış senkron bilgisi:', err);
        });

        return { id: saleId.toString(), ...data, isSynced: false, date: new Date() };
    }

    async getCustomers(tenantId: string) {
        const results = await this.db.query(`SELECT * FROM Customers WHERE TenantId = @tenantId AND LEFT(ErpCode, 3) = '120'`, { tenantId });
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString() })) : [];
    }

    async createCustomer(tenantId: string, data: any) {
        const prefix = '120-01';
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

    async getOrders(tenantId: string) {
        await this.ensureOrderItemNetsisColumns();

        const orders = await this.db.query(`SELECT * FROM Orders WHERE TenantId = @tenantId ORDER BY OrderDate DESC`, { tenantId }) as any[];
        if (!Array.isArray(orders)) return [];

        const list: any[] = [];
        for (const o of orders) {
            const items = await this.db.query(
                `SELECT
                    oi.*,
                    COALESCE(oi.StokAdi, oi.StokKodu, CAST(oi.PlantId AS NVARCHAR(50))) as plantName,
                    oi.StokKodu as stokKodu
                 FROM OrderItems oi
                 WHERE oi.OrderId = @orderId`,
                { orderId: o.Id }
            ) as any[];
            list.push({
                ...o,
                id: o.Id.toString(),
                items: Array.isArray(items) ? items : []
            });
        }
        return list;
    }

    async createOrder(tenantId: string, data: any) {
        await this.ensureOrderItemNetsisColumns();

        const sql = `
            INSERT INTO Orders (TenantId, CustomerId, OrderDate, Status, TotalAmount) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @customerId, @orderDate, @status, @totalAmount)`;

        const results = await this.db.query(sql, {
            tenantId,
            customerId: data.customerId || null,
            orderDate: new Date(),
            status: data.status || 'Bekliyor',
            totalAmount: Number(data.totalAmount) || 0
        });

        const orderId = results[0].Id;

        if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
                const stokKodu = String(item.stokKodu || item.StokKodu || item.sku || item.plantId || item.id || '').trim();
                const stokAdi = item.stokAdi || item.StokAdi || item.name || item.plantName || null;

                await this.db.query(
                    `INSERT INTO OrderItems (OrderId, PlantId, StokKodu, StokAdi, Quantity, UnitPrice)
                     VALUES (@orderId, NULL, @stokKodu, @stokAdi, @qty, @price)`,
                    {
                        orderId,
                        stokKodu: stokKodu || null,
                        stokAdi,
                        qty: Number(item.qty || item.quantity) || 0,
                        price: Number(item.price || item.unitPrice) || 0
                    }
                );
            }
        }

        return { id: orderId.toString(), ...data };
    }

    async updateOrderStatus(tenantId: string, orderId: string, status: string) {
        const results = await this.db.query(`SELECT * FROM Orders WHERE Id = @id AND TenantId = @tenantId`, { id: orderId, tenantId });
        if (results.length === 0) throw new Error('Sipariş bulunamadı.');

        const order = results[0];

        if (status === 'Tamamlandı' && order.Status !== 'Tamamlandı') {
            await this.fulfillOrder(orderId);
        }

        await this.db.query(`UPDATE Orders SET Status = @status, CompletedAt = @compAt WHERE Id = @id`, {
            status,
            compAt: status === 'Tamamlandı' ? new Date() : null,
            id: orderId
        });

        return { id: orderId, status };
    }

    private async fulfillOrder(orderId: string) {
        await this.ensureOrderItemNetsisColumns();

        const items = await this.db.query(`SELECT StokKodu, Quantity FROM OrderItems WHERE OrderId = @orderId`, { orderId }) as any[];
        if (!Array.isArray(items)) return;

        // Stok ana kaynağı Netsis'tir. Lokal Plants.CurrentStock düşülmez.
        // Gerçek stok çıkışı satış faturası / Netsis TBLSTHAR üzerinden yapılır.
        const missingCodes = items.filter(i => !String(i.StokKodu || '').trim()).length;
        if (missingCodes > 0) {
            console.warn(`Sipariş #${orderId}: ${missingCodes} kalemde Netsis STOK_KODU eksik.`);
        }
    }

    private async ensureOrderItemNetsisColumns() {
        await this.db.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'StokKodu')
                ALTER TABLE OrderItems ADD StokKodu NVARCHAR(50) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'StokAdi')
                ALTER TABLE OrderItems ADD StokAdi NVARCHAR(200) NULL;
        `);
    }
}
