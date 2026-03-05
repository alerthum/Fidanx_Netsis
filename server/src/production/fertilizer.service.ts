import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FertilizerService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        const sql = `SELECT Id as id, LogDate as date, Fungusit, AminoAsit, StartFert as start, Note FROM FertilizerLogs WHERE TenantId = @tenantId ORDER BY LogDate DESC`;
        const results = await this.db.query(sql, { tenantId });
        return results.map(row => ({
            ...row,
            fungusit: !!row.Fungusit,
            aminoAsit: !!row.AminoAsit,
            start: !!row.start
        }));
    }

    async create(tenantId: string, data: any) {
        const sql = `
            INSERT INTO FertilizerLogs (
                TenantId, LogDate, Fungusit, AminoAsit, StartFert, Note
            ) VALUES (
                @tenantId, @date, @fungusit, @aminoAsit, @start, @note
            )`;

        await this.db.query(sql, {
            tenantId,
            date: data.date ? new Date(data.date) : new Date(),
            fungusit: data.fungusit ? 1 : 0,
            aminoAsit: data.aminoAsit ? 1 : 0,
            start: data.start ? 1 : 0,
            note: data.note || null
        });

        return { success: true, ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM FertilizerLogs WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true };
    }
}
