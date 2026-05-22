import { BadRequestException, Injectable } from '@nestjs/common';
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
        return Array.isArray(results) ? results.map(row => ({ ...row, id: row.Id.toString(), deprecated: true })) : [];
    }

    async findOne(tenantId: string, id: string) {
        const results = await this.db.query(`SELECT * FROM Plants WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return results[0] ? { ...results[0], id: results[0].Id.toString(), deprecated: true } : null;
    }

    async create(..._args: any[]) {
        throw new BadRequestException('Stok/bitki kartı FidanX içinde oluşturulmaz. Ana kaynak Netsis TBLSTSABIT tablosudur.');
    }

    async update(..._args: any[]) {
        throw new BadRequestException('Stok/bitki kartı FidanX içinde güncellenmez. Ana kaynak Netsis TBLSTSABIT tablosudur.');
    }

    async remove(..._args: any[]) {
        throw new BadRequestException('Stok/bitki kartı FidanX içinde silinmez. Ana kaynak Netsis TBLSTSABIT tablosudur.');
    }
}
