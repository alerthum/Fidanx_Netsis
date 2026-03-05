import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PlantsService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string, categoryPrefix?: string) {
        let sql = `SELECT * FROM Plants WHERE TenantId = @tenantId`;
        const params: any = { tenantId };

        if (categoryPrefix) {
            sql += ` AND LEFT(ErpCode, 6) = @prefix`;
            params.prefix = categoryPrefix;
        }

        const results = await this.db.query(sql, params);
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString() })) : [];
    }

    async findOne(tenantId: string, id: string) {
        const results = await this.db.query(`SELECT * FROM Plants WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return results[0] ? { ...results[0], id: results[0].Id.toString() } : null;
    }

    async create(tenantId: string, data: any) {
        // Otomatik kod üretimi (150-01, 150-02, 150-03)
        // Kategoriye göre prefix belirle
        let prefix = '150-01';
        if (data.category === 'Ambalaj' || data.category === 'Saksı') prefix = '150-02';
        else if (data.category === 'Hammadde') prefix = '150-03';

        const lastCodes = await this.db.query(
            `SELECT TOP 1 ErpCode FROM Plants WHERE TenantId = @tenantId AND ErpCode LIKE @prefix + '%' ORDER BY ErpCode DESC`,
            { tenantId, prefix }
        );

        let nextCode = `${prefix}-001`;
        if (lastCodes && lastCodes.length > 0) {
            const lastCode = lastCodes[0].ErpCode;
            const parts = lastCode.split('-');
            const lastNum = parseInt(parts[parts.length - 1]);
            nextCode = `${prefix}-${(lastNum + 1).toString().padStart(3, '0')}`;
        }

        const sql = `
            INSERT INTO Plants (TenantId, Name, Category, Type, CurrentStock, WholesalePrice, RetailPrice, ViyolCount, CuttingCount, SupplierId, ErpCode) 
            OUTPUT INSERTED.Id
            VALUES (@tenantId, @name, @category, @type, @stock, @wPrice, @rPrice, @vCount, @cCount, @sId, @code)`;

        const results = await this.db.query(sql, {
            tenantId,
            name: data.name,
            category: data.category || null,
            type: data.type || 'LOCAL',
            stock: Number(data.currentStock) || 0,
            wPrice: Number(data.wholesalePrice) || 0,
            rPrice: Number(data.retailPrice) || 0,
            vCount: Number(data.viyolCount) || 0,
            cCount: Number(data.cuttingCount) || 0,
            sId: data.supplierId || null,
            code: nextCode
        });

        return { id: results[0].Id.toString(), ...data, erpCode: nextCode };
    }

    async update(tenantId: string, id: string, data: any) {
        const sql = `
            UPDATE Plants SET 
                Name = COALESCE(@name, Name),
                Category = COALESCE(@category, Category),
                Type = COALESCE(@type, Type),
                CurrentStock = COALESCE(@stock, CurrentStock),
                WholesalePrice = COALESCE(@wPrice, WholesalePrice),
                RetailPrice = COALESCE(@rPrice, RetailPrice),
                ViyolCount = COALESCE(@vCount, ViyolCount),
                CuttingCount = COALESCE(@cCount, CuttingCount),
                SupplierId = COALESCE(@sId, SupplierId)
            WHERE Id = @id AND TenantId = @tenantId`;

        await this.db.query(sql, {
            id, tenantId,
            name: data.name || null,
            category: data.category || null,
            type: data.type || null,
            stock: data.currentStock !== undefined ? Number(data.currentStock) : null,
            wPrice: data.wholesalePrice !== undefined ? Number(data.wholesalePrice) : null,
            rPrice: data.retailPrice !== undefined ? Number(data.retailPrice) : null,
            vCount: data.viyolCount !== undefined ? Number(data.viyolCount) : null,
            cCount: data.cuttingCount !== undefined ? Number(data.cuttingCount) : null,
            sId: data.supplierId || null
        });

        return { id, ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM Plants WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true };
    }
}
