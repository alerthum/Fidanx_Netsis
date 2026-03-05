import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TemperatureService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        const sqlNew = `
            SELECT 
                Id as id, 
                Konum as konum,
                OlcumTarihi as date,
                OlcumPeriyodu as periyot,
                IcSicaklik as icSicaklik,
                DisSicaklik as disSicaklik,
                Nem as nem,
                MazotLt as mazot,
                Not_ as note,
                'NEW' as type
            FROM FDX_SicaklikKayitlari 
            WHERE TenantId = @tenantId 
            ORDER BY OlcumTarihi DESC`;

        let results: any[] = [];
        try {
            const newRecords = await this.db.query(sqlNew, { tenantId });
            if (Array.isArray(newRecords)) results = [...newRecords];
        } catch (e) { }

        // Eski logları geriye dönük destek için formatlayıp ekleyelim
        try {
            const oldLogs = await this.db.query('SELECT * FROM TemperatureLogs WHERE TenantId = @tenantId', { tenantId });
            if (Array.isArray(oldLogs)) {
                for (const log of oldLogs) {
                    if (log.SeraIciSabah != null || log.SeraDisiSabah != null) {
                        results.push({ id: `OLD_S_${log.Id}`, konum: 'Eski Kayıt', date: log.LogDate, periyot: 'SABAH', icSicaklik: log.SeraIciSabah, disSicaklik: log.SeraDisiSabah, mazot: log.MazotLt, note: log.Note, type: 'OLD' });
                    }
                    if (log.SeraIciOgle != null || log.SeraDisiOgle != null) {
                        results.push({ id: `OLD_O_${log.Id}`, konum: 'Eski Kayıt', date: log.LogDate, periyot: 'OGLE', icSicaklik: log.SeraIciOgle, disSicaklik: log.SeraDisiOgle, mazot: null, note: null, type: 'OLD' });
                    }
                    if (log.SeraIciAksam != null || log.SeraDisiAksam != null) {
                        results.push({ id: `OLD_A_${log.Id}`, konum: 'Eski Kayıt', date: log.LogDate, periyot: 'AKSAM', icSicaklik: log.SeraIciAksam, disSicaklik: log.SeraDisiAksam, mazot: null, note: null, type: 'OLD' });
                    }
                }
            }
        } catch (e) { }

        // Tarihe göre sırala
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return results;
    }

    async create(tenantId: string, data: any) {
        const sql = `
            INSERT INTO FDX_SicaklikKayitlari (
                TenantId, Konum, OlcumTarihi, OlcumPeriyodu, 
                IcSicaklik, DisSicaklik, Nem, MazotLt, Not_
            ) VALUES (
                @tenantId, @konum, @date, @periyot,
                @icSicaklik, @disSicaklik, @nem, @mazot, @note
            )`;

        await this.db.query(sql, {
            tenantId,
            konum: data.konum || 'Bilinmiyor',
            date: data.date ? new Date(data.date) : new Date(),
            periyot: data.periyot || 'SABAH', // SABAH, OGLE, AKSAM
            icSicaklik: Number(data.icSicaklik) || null,
            disSicaklik: Number(data.disSicaklik) || null,
            nem: Number(data.nem) || null,
            mazot: Number(data.mazot) || null,
            note: data.note || null
        });

        return { success: true, ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM FDX_SicaklikKayitlari WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true };
    }
}
