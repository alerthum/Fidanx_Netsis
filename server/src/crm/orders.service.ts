import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        const results = await this.db.query(`SELECT * FROM Orders WHERE TenantId = @tenantId ORDER BY OrderDate DESC`, { tenantId });
        return results.map(row => ({ ...row, id: row.Id.toString() }));
    }

    async create(tenantId: string, data: any) {
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

        return { id: results[0].Id.toString(), ...data };
    }

    async updateStatus(tenantId: string, id: string, status: string) {
        await this.db.query(`UPDATE Orders SET Status = @status WHERE Id = @id AND TenantId = @tenantId`, { status, id, tenantId });
        return { id, status };
    }
}
