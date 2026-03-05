import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TenantsService {
    constructor(private db: DatabaseService) { }

    async findOne(tenantId: string) {
        const results = await this.db.query(`SELECT * FROM Tenants WHERE TenantId = @tenantId`, { tenantId });
        if (results.length === 0) return { id: tenantId, settings: { locations: [] } };

        const tenant = results[0];
        return {
            ...tenant,
            id: tenant.Id.toString(),
            settings: tenant.SettingsJson ? JSON.parse(tenant.SettingsJson) : {}
        };
    }

    async updateSettings(tenantId: string, settings: any) {
        const results = await this.db.query(`SELECT * FROM Tenants WHERE TenantId = @tenantId`, { tenantId });

        if (results.length > 0) {
            await this.db.query(`UPDATE Tenants SET SettingsJson = @settings WHERE TenantId = @tenantId`, {
                settings: JSON.stringify(settings),
                tenantId
            });
        } else {
            await this.db.query(`INSERT INTO Tenants (TenantId, SettingsJson) VALUES (@tenantId, @settings)`, {
                tenantId,
                settings: JSON.stringify(settings)
            });
        }

        return { success: true, settings };
    }
}
