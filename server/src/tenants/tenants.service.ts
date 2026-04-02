import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TenantsService {
    private readonly logger = new Logger(TenantsService.name);
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

    private fixEncodingStr(str: string): string {
        try {
            const buf = Buffer.from(str, 'latin1');
            const fixed = buf.toString('utf8');
            if (fixed.length < str.length && !fixed.includes('\ufffd')) {
                return fixed;
            }
        } catch { }
        return str;
    }

    private fixEncodingDeep(obj: any): any {
        if (typeof obj === 'string') return this.fixEncodingStr(obj);
        if (Array.isArray(obj)) return obj.map(item => this.fixEncodingDeep(item));
        if (obj && typeof obj === 'object') {
            const fixed: any = {};
            for (const [k, v] of Object.entries(obj)) {
                fixed[k] = this.fixEncodingDeep(v);
            }
            return fixed;
        }
        return obj;
    }

    async repairEncoding(tenantId: string) {
        const tenant = await this.findOne(tenantId);
        if (!tenant.settings || Object.keys(tenant.settings).length === 0) {
            return { success: false, message: 'Ayar bulunamadı' };
        }

        const original = JSON.stringify(tenant.settings);
        const fixed = this.fixEncodingDeep(tenant.settings);
        const fixedStr = JSON.stringify(fixed);

        if (original === fixedStr) {
            return { success: true, message: 'Encoding zaten doğru', settings: fixed };
        }

        this.logger.log(`Encoding onarımı: ${original.substring(0, 200)} → ${fixedStr.substring(0, 200)}`);
        await this.updateSettings(tenantId, fixed);
        return { success: true, message: 'Encoding düzeltildi', settings: fixed };
    }
}
