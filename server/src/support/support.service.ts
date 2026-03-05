import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SupportService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        const tickets = await this.db.query(`SELECT * FROM SupportTickets WHERE TenantId = @tenantId ORDER BY CreatedAt DESC`, { tenantId }) as any[];

        const list: any[] = [];
        for (const t of tickets) {
            const history = await this.db.query(`SELECT Action as action, LogDate as date FROM SupportHistory WHERE TicketId = @tId ORDER BY LogDate DESC`, { tId: t.Id }) as any[];
            list.push({
                ...t,
                id: t.Id.toString(),
                history
            });
        }
        return list;
    }

    async create(tenantId: string, data: any) {
        const sql = `INSERT INTO SupportTickets (TenantId, Subject, Description, Status) OUTPUT INSERTED.Id VALUES (@tenantId, @subject, @desc, 'NEW')`;
        const results = await this.db.query(sql, {
            tenantId,
            subject: data.subject,
            desc: data.description || null
        });

        const ticketId = results[0].Id;

        await this.db.query(`INSERT INTO SupportHistory (TicketId, Action) VALUES (@tId, 'Talep oluşturuldu')`, { tId: ticketId });

        return { id: ticketId.toString(), ...data, status: 'NEW' };
    }

    async updateStatus(tenantId: string, id: string, status: string) {
        await this.db.query(`UPDATE SupportTickets SET Status = @status WHERE Id = @id AND TenantId = @tenantId`, { status, id, tenantId });
        await this.db.query(`INSERT INTO SupportHistory (TicketId, Action) VALUES (@tId, @action)`, {
            tId: id,
            action: `Durum güncellendi: ${status}`
        });
        return { id, status };
    }
}
