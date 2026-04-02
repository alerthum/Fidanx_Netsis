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

    private static readonly WIN1252_TO_BYTE: Record<number, number> = {
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
        0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
        0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
        0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
        0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
        0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
    };

    private fixEncodingStr(str: string): string {
        try {
            const bytes: number[] = [];
            for (let i = 0; i < str.length; i++) {
                const cp = str.codePointAt(i)!;
                if (cp <= 0xFF) {
                    bytes.push(cp);
                } else if (TenantsService.WIN1252_TO_BYTE[cp] !== undefined) {
                    bytes.push(TenantsService.WIN1252_TO_BYTE[cp]);
                } else if (cp > 0xFFFF) {
                    i++;
                    return str;
                } else {
                    return str;
                }
            }
            const buf = Buffer.from(bytes);
            const fixed = buf.toString('utf8');
            if (fixed !== str && !fixed.includes('\ufffd')) {
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
        const results = await this.db.query(`SELECT * FROM Tenants WHERE TenantId = @tenantId`, { tenantId });
        if (results.length === 0) {
            return { success: false, message: 'Tenant bulunamadı' };
        }

        const tenant = results[0];
        const settings = tenant.SettingsJson ? JSON.parse(tenant.SettingsJson) : {};
        const originalName = tenant.Name || '';

        const fixedSettings = this.fixEncodingDeep(settings);
        const fixedName = this.fixEncodingStr(originalName);
        const fixedSettingsStr = JSON.stringify(fixedSettings);
        const originalSettingsStr = JSON.stringify(settings);

        const nameChanged = fixedName !== originalName;
        const settingsChanged = fixedSettingsStr !== originalSettingsStr;

        if (!nameChanged && !settingsChanged) {
            return { success: true, message: 'Encoding zaten doğru', settings: fixedSettings, name: fixedName };
        }

        if (nameChanged) {
            await this.db.query(
                `UPDATE Tenants SET Name = @name WHERE TenantId = @tenantId`,
                { name: fixedName, tenantId }
            );
        }

        if (settingsChanged) {
            await this.db.query(
                `UPDATE Tenants SET SettingsJson = @settings WHERE TenantId = @tenantId`,
                { settings: fixedSettingsStr, tenantId }
            );
        }

        this.logger.log(`Encoding onarımı tamamlandı. Name: ${originalName} → ${fixedName}`);
        return {
            success: true,
            message: 'Encoding düzeltildi',
            nameFixed: nameChanged,
            settingsFixed: settingsChanged,
            name: fixedName,
            settings: fixedSettings
        };
    }
}
