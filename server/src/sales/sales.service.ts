import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { IntegrationService } from '../integration/integration.service';

@Injectable()
export class SalesService {
    constructor(
        private db: DatabaseService,
        private integration: IntegrationService
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

        this.integration.pushInvoice(tenantId, saleId.toString(), 'SALES').catch(err => {
            console.error('Failed to sync invoice to ERP:', err);
        });

        return { id: saleId.toString(), ...data, isSynced: false, date: new Date() };
    }

    async getCustomers(tenantId: string) {
        const results = await this.db.query(`SELECT * FROM Customers WHERE TenantId = @tenantId AND LEFT(ErpCode, 3) = '120'`, { tenantId });
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString() })) : [];
    }

    async createCustomer(tenantId: string, data: any) {
        // Otomatik kod üretimi (120-01-xxx)
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
        const sql = `SELECT * FROM Orders WHERE TenantId = @tenantId ORDER BY OrderDate DESC`;
        const orders = await this.db.query(sql, { tenantId }) as any[];
        if (!Array.isArray(orders)) return [];

        const list: any[] = [];
        for (const o of orders) {
            const items = await this.db.query(`SELECT oi.*, p.Name as plantName FROM OrderItems oi LEFT JOIN Plants p ON oi.PlantId = p.Id WHERE oi.OrderId = @orderId`, { orderId: o.Id }) as any[];
            list.push({
                ...o,
                id: o.Id.toString(),
                items: Array.isArray(items) ? items : []
            });
        }
        return list;
    }

    async createOrder(tenantId: string, data: any) {
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
                await this.db.query(`INSERT INTO OrderItems (OrderId, PlantId, Quantity, UnitPrice) VALUES (@orderId, @plantId, @qty, @price)`, {
                    orderId,
                    plantId: item.plantId || item.id,
                    qty: Number(item.qty || item.quantity) || 0,
                    price: Number(item.price || item.unitPrice) || 0
                });
            }
        }

        return { id: orderId.toString(), ...data };
    }

    async updateOrderStatus(tenantId: string, orderId: string, status: string) {
        const results = await this.db.query(`SELECT * FROM Orders WHERE Id = @id AND TenantId = @tenantId`, { id: orderId, tenantId });
        if (results.length === 0) throw new Error('Sipariş bulunamadı.');

        const order = results[0];

        if (status === 'Tamamlandı' && order.Status !== 'Tamamlandı') {
            await this.fulfillOrder(tenantId, orderId);
        }

        await this.db.query(`UPDATE Orders SET Status = @status, CompletedAt = @compAt WHERE Id = @id`, {
            status,
            compAt: status === 'Tamamlandı' ? new Date() : null,
            id: orderId
        });

        return { id: orderId, status };
    }

    private async fulfillOrder(tenantId: string, orderId: string) {
        const items = await this.db.query(`SELECT * FROM OrderItems WHERE OrderId = @orderId`, { orderId }) as any[];
        if (!Array.isArray(items)) return;

        for (const item of items) {
            if (item.PlantId) {
                await this.db.query(`UPDATE Plants SET CurrentStock = CASE WHEN CurrentStock - @qty < 0 THEN 0 ELSE CurrentStock - @qty END WHERE Id = @plantId AND TenantId = @tenantId`, {
                    qty: item.Quantity,
                    plantId: item.PlantId,
                    tenantId
                });
            }
        }
    }
}
