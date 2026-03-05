import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ExpensesService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        const sql = `SELECT Id as id, Title as title, Amount as amount, ExpenseType as type, LogDate as date FROM Expenses WHERE TenantId = @tenantId ORDER BY LogDate DESC`;
        return await this.db.query(sql, { tenantId });
    }

    async create(tenantId: string, data: any) {
        const sql = `
            INSERT INTO Expenses (TenantId, Title, Amount, ExpenseType, LogDate) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @title, @amount, @type, @date)`;

        const results = await this.db.query(sql, {
            tenantId,
            title: data.title || '',
            amount: Number(data.amount) || 0,
            type: data.type || 'GENEL',
            date: data.date ? new Date(data.date) : new Date()
        });

        return { id: results[0]?.Id.toString(), ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM Expenses WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true };
    }
}
