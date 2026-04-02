import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RecipesService {
    private readonly logger = new Logger(RecipesService.name);

    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        try {
            const recipes = await this.db.query(
                `SELECT Id, TenantId, Name, Description, CreatedBy, CreatedAt FROM Recipes WHERE TenantId = @tenantId ORDER BY CreatedAt DESC`,
                { tenantId }
            ) as any[];
            if (!Array.isArray(recipes)) return [];

            const list: any[] = [];
            for (const r of recipes) {
                const items = await this.db.query(`
                    SELECT ri.Id, ri.RecipeId, ri.MaterialCode, ri.MaterialName, ri.Amount, ri.Unit, ri.UnitPrice,
                           dbo.TRK(ss.STOK_ADI) AS netsisAdi, ss.STOK_KODU AS netsisKodu
                    FROM RecipeItems ri
                    LEFT JOIN TBLSTSABIT ss WITH (NOLOCK) ON ss.STOK_KODU = ri.MaterialCode
                    WHERE ri.RecipeId = @recipeId
                `, { recipeId: r.Id }) as any[];

                list.push({
                    id: r.Id.toString(),
                    name: r.Name,
                    description: r.Description || '',
                    createdBy: r.CreatedBy,
                    createdAt: r.CreatedAt,
                    items: Array.isArray(items) ? items.map(i => ({
                        id: i.Id,
                        materialCode: i.MaterialCode || i.netsisKodu,
                        materialName: i.netsisAdi || i.MaterialName || 'Bilinmeyen Malzeme',
                        amount: i.Amount,
                        unit: i.Unit || 'adet',
                        unitPrice: i.UnitPrice || 0
                    })) : [],
                    totalCost: Array.isArray(items) ? items.reduce((sum, i) => sum + (i.Amount || 0) * (i.UnitPrice || 0), 0) : 0
                });
            }
            return list;
        } catch (err) {
            this.logger.error('Recipes.findAll error:', err);
            return [];
        }
    }

    async findOne(tenantId: string, id: string) {
        try {
            const recipes = await this.db.query(
                `SELECT Id, TenantId, Name, Description, CreatedBy, CreatedAt FROM Recipes WHERE Id = @id AND TenantId = @tenantId`,
                { id, tenantId }
            ) as any[];
            if (!Array.isArray(recipes) || recipes.length === 0) return null;

            const r = recipes[0];
            const items = await this.db.query(`
                SELECT ri.Id, ri.RecipeId, ri.MaterialCode, ri.MaterialName, ri.Amount, ri.Unit, ri.UnitPrice,
                       dbo.TRK(ss.STOK_ADI) AS netsisAdi
                FROM RecipeItems ri
                LEFT JOIN TBLSTSABIT ss WITH (NOLOCK) ON ss.STOK_KODU = ri.MaterialCode
                WHERE ri.RecipeId = @recipeId
            `, { recipeId: r.Id }) as any[];

            return {
                id: r.Id.toString(),
                name: r.Name,
                description: r.Description || '',
                createdBy: r.CreatedBy,
                createdAt: r.CreatedAt,
                items: Array.isArray(items) ? items.map(i => ({
                    id: i.Id,
                    materialCode: i.MaterialCode,
                    materialName: i.netsisAdi || i.MaterialName || 'Bilinmeyen Malzeme',
                    amount: i.Amount,
                    unit: i.Unit || 'adet',
                    unitPrice: i.UnitPrice || 0
                })) : [],
                totalCost: Array.isArray(items) ? items.reduce((sum, i) => sum + (i.Amount || 0) * (i.UnitPrice || 0), 0) : 0
            };
        } catch (err) {
            this.logger.error('Recipes.findOne error:', err);
            return null;
        }
    }

    async create(tenantId: string, data: any) {
        const sql = `INSERT INTO Recipes (TenantId, Name, Description, CreatedBy) OUTPUT INSERTED.Id VALUES (@tenantId, @name, @description, @createdBy)`;
        const results = await this.db.query(sql, {
            tenantId,
            name: data.name,
            description: data.description || null,
            createdBy: data.createdBy || null
        });

        const recipeId = results[0].Id;

        if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
                await this.db.query(`
                    INSERT INTO RecipeItems (RecipeId, MaterialCode, MaterialName, Amount, Unit, UnitPrice)
                    VALUES (@recipeId, @materialCode, @materialName, @amount, @unit, @unitPrice)
                `, {
                    recipeId,
                    materialCode: item.materialCode || item.materialId || null,
                    materialName: item.materialName || null,
                    amount: Number(item.amount) || 0,
                    unit: item.unit || 'adet',
                    unitPrice: Number(item.unitPrice) || 0
                });
            }
        }

        return { id: recipeId.toString(), ...data };
    }

    async update(tenantId: string, id: string, data: any) {
        if (data.name || data.description !== undefined) {
            await this.db.query(`
                UPDATE Recipes SET
                    Name = ISNULL(@name, Name),
                    Description = @description
                WHERE Id = @id AND TenantId = @tenantId
            `, { name: data.name || null, description: data.description || null, id, tenantId });
        }

        if (data.items && Array.isArray(data.items)) {
            await this.db.query(`DELETE FROM RecipeItems WHERE RecipeId = @recipeId`, { recipeId: id });
            for (const item of data.items) {
                await this.db.query(`
                    INSERT INTO RecipeItems (RecipeId, MaterialCode, MaterialName, Amount, Unit, UnitPrice)
                    VALUES (@recipeId, @materialCode, @materialName, @amount, @unit, @unitPrice)
                `, {
                    recipeId: id,
                    materialCode: item.materialCode || item.materialId || null,
                    materialName: item.materialName || null,
                    amount: Number(item.amount) || 0,
                    unit: item.unit || 'adet',
                    unitPrice: Number(item.unitPrice) || 0
                });
            }
        }

        return this.findOne(tenantId, id);
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM RecipeItems WHERE RecipeId = @id`, { id });
        await this.db.query(`DELETE FROM Recipes WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true, message: 'Reçete başarıyla silindi.' };
    }
}
