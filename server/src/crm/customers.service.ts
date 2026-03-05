import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CustomersService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string, type?: 'CUSTOMER' | 'SUPPLIER') {
        let sql = `SELECT * FROM Customers WHERE TenantId = @tenantId`;
        if (type === 'CUSTOMER') {
            sql += ` AND LEFT(ErpCode, 3) = '120'`;
        } else if (type === 'SUPPLIER') {
            sql += ` AND LEFT(ErpCode, 3) = '320'`;
        }
        const results = await this.db.query(sql, { tenantId });
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString() })) : [];
    }

    async getNextCode(tenantId: string, prefix: '120-01' | '320-01') {
        const results = await this.db.query(
            `SELECT TOP 1 ErpCode FROM Customers WHERE TenantId = @tenantId AND ErpCode LIKE @prefix + '%' ORDER BY ErpCode DESC`,
            { tenantId, prefix }
        );

        if (results.length === 0) return `${prefix}-001`;

        const lastCode = results[0].ErpCode;
        const parts = lastCode.split('-');
        const lastNum = parseInt(parts[parts.length - 1]);
        const nextNum = (lastNum + 1).toString().padStart(3, '0');
        return `${prefix}-${nextNum}`;
    }

    async create(tenantId: string, data: any) {
        const sql = `
            INSERT INTO Customers (TenantId, Name, Email, Phone, Address, ErpCode, TaxNumber) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @name, @email, @phone, @address, @erpCode, @taxNumber)`;

        const results = await this.db.query(sql, {
            tenantId,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            erpCode: data.erpCode || null,
            taxNumber: data.taxNumber || null
        });

        return { id: results[0].Id.toString(), ...data };
    }

    async update(tenantId: string, id: string, data: any) {
        const sql = `
            UPDATE Customers SET 
                Name = COALESCE(@name, Name),
                Email = COALESCE(@email, Email),
                Phone = COALESCE(@phone, Phone),
                Address = COALESCE(@address, Address),
                ErpCode = COALESCE(@erpCode, ErpCode),
                TaxNumber = COALESCE(@taxNumber, TaxNumber)
            WHERE Id = @id AND TenantId = @tenantId`;

        await this.db.query(sql, {
            id, tenantId,
            name: data.name || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            erpCode: data.erpCode || null,
            taxNumber: data.taxNumber || null
        });

        return { id, ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM Customers WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true };
    }
}
