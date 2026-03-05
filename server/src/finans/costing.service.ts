import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CostingService {
    constructor(private db: DatabaseService) { }

    async calculateBatchCost(tenantId: string, batchId: string) {
        const results = await this.db.query(`SELECT * FROM ProductionBatches WHERE Id = @id AND TenantId = @tenantId`, { id: batchId, tenantId });
        if (results.length === 0) return null;
        const b = results[0];

        // Maliyet kalemlerini detaylandır
        const costHistory = await this.db.query(`SELECT Amount, Action as description, CostType as type FROM ProductionCostHistory WHERE BatchId = @batchId`, { batchId: b.Id }) as any[];

        const materialCost = costHistory.filter(h => h.type === 'HAMMADDE').reduce((sum, h) => sum + h.Amount, 0);
        const allocatedExpenses = costHistory.filter(h => h.type !== 'HAMMADDE').reduce((sum, h) => sum + h.Amount, 0);

        return {
            batchId: b.Id.toString(),
            lotId: b.LotId,
            plantName: b.PlantName,
            materialCost,
            allocatedExpenses,
            totalCost: b.AccumulatedCost,
            unitCost: b.Quantity > 0 ? b.AccumulatedCost / b.Quantity : 0,
            quantity: b.Quantity
        };
    }

    async getOverallAnalytics(tenantId: string) {
        const batches = await this.db.query(`SELECT Id FROM ProductionBatches WHERE TenantId = @tenantId`, { tenantId }) as any[];
        const analyticsList: any[] = [];

        for (const b of batches) {
            const costData = await this.calculateBatchCost(tenantId, b.Id.toString());
            if (costData) analyticsList.push(costData);
        }

        return analyticsList;
    }
}
