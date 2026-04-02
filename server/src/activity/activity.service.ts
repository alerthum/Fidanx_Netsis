import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProductionService } from '../production/production.service';

@Injectable()
export class ActivityService {
    private readonly logger = new Logger(ActivityService.name);

    constructor(
        private db: DatabaseService,
        @Inject(forwardRef(() => ProductionService))
        private production: ProductionService
    ) { }

    async log(tenantId: string, data: any) {
        try {
            const sql = `
                INSERT INTO ActivityLogs (TenantId, Action, Title, Icon, Color, Cost, Details, Locations, UserDate, RecipeId) 
                OUTPUT INSERTED.Id
                VALUES (@tenantId, @action, @title, @icon, @color, @cost, @details, @locations, @userDate, @recipeId)`;

            const results = await this.db.query(sql, {
                tenantId,
                action: data.action || null,
                title: data.title || null,
                icon: data.icon || null,
                color: data.color || null,
                cost: Number(data.cost) || 0,
                details: data.details || null,
                locations: data.locations ? JSON.stringify(data.locations) : null,
                userDate: data.userDate || data.date || null,
                recipeId: data.recipeId ? Number(data.recipeId) : null
            });

            const logId = results[0]?.Id.toString();

            if (data.cost && data.cost > 0 && data.locations && Array.isArray(data.locations)) {
                this.production.distributeOperationCost(tenantId, data.locations, Number(data.cost), { id: logId, ...data })
                    .catch(err => this.logger.error('Maliyet dağıtımı hatası:', err));
            }

            return { id: logId, ...data };
        } catch (error) {
            this.logger.error('ActivityService.log hatası:', error.message);
            throw error;
        }
    }

    async findAll(tenantId: string, limit = 50) {
        try {
            const sql = `
                SELECT TOP (@limit)
                    a.Id as id, a.Action as action, a.Title as title,
                    a.Icon as icon, a.Color as color,
                    ISNULL(a.UserDate, a.LogDate) as date,
                    a.Cost as cost, a.Details as details,
                    a.Locations as locations, a.RecipeId as recipeId,
                    r.Name as recipeName
                FROM ActivityLogs a
                LEFT JOIN Recipes r ON r.Id = a.RecipeId
                WHERE a.TenantId = @tenantId
                ORDER BY a.LogDate DESC`;
            const rows = await this.db.query(sql, { tenantId, limit });
            return Array.isArray(rows) ? rows.map(r => ({
                ...r,
                locations: r.locations ? JSON.parse(r.locations) : []
            })) : [];
        } catch (error) {
            this.logger.error('ActivityService.findAll hatası:', error.message);
            return [];
        }
    }
}
