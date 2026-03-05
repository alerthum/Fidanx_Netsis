import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProductionService } from '../production/production.service';

@Injectable()
export class ActivityService {
    constructor(
        private db: DatabaseService,
        @Inject(forwardRef(() => ProductionService))
        private production: ProductionService
    ) { }

    async log(tenantId: string, data: any) {
        try {
            const sql = `
                INSERT INTO ActivityLogs (TenantId, Action, Title, Icon, Color, Cost) 
                OUTPUT INSERTED.Id
                VALUES (@tenantId, @action, @title, @icon, @color, @cost)`;

            const results = await this.db.query(sql, {
                tenantId,
                action: data.action || null,
                title: data.title || null,
                icon: data.icon || null,
                color: data.color || null,
                cost: Number(data.cost) || 0
            });

            const logId = results[0]?.Id.toString();

            // Eğer işlemde maliyet ve konum bilgisi varsa, maliyeti fidanlara dağıt
            if (data.cost && data.cost > 0 && data.locations && Array.isArray(data.locations)) {
                this.production.distributeOperationCost(tenantId, data.locations, Number(data.cost), { id: logId, ...data })
                    .catch(err => console.error('Maliyet dağıtımı hatası:', err));
            }

            return { id: logId, ...data };
        } catch (error) {
            console.error('ActivityService.log hatası:', error.message);
            throw error;
        }
    }

    async findAll(tenantId: string) {
        try {
            const sql = `SELECT TOP 10 Id as id, Action as action, Title as title, Icon as icon, Color as color, LogDate as date, Cost as cost FROM ActivityLogs WHERE TenantId = @tenantId ORDER BY LogDate DESC`;
            return await this.db.query(sql, { tenantId });
        } catch (error) {
            console.error('ActivityService.findAll hatası:', error.message);
            throw error;
        }
    }
}
