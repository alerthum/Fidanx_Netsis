import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RecipesService {
    constructor(private db: DatabaseService) { }

    async findAll(tenantId: string) {
        try {
            const recipes = await this.db.query(`SELECT * FROM Recipes WHERE TenantId = @tenantId`, { tenantId }) as any[];
            if (!Array.isArray(recipes)) return [];

            const list: any[] = [];
            for (const r of recipes) {
                const items = await this.db.query(`SELECT ri.*, p.Name as materialName, p.ErpCode FROM RecipeItems ri LEFT JOIN Plants p ON ri.MaterialId = p.Id WHERE ri.RecipeId = @recipeId`, { recipeId: r.Id }) as any[];
                list.push({
                    ...r,
                    id: r.Id.toString(),
                    items: Array.isArray(items) ? items.map(i => ({
                        ...i,
                        materialName: i.materialName || 'Bilinmeyen Malzeme'
                    })) : []
                });
            }
            return list;
        } catch (err) {
            console.error('Recipes.findAll error:', err);
            return [];
        }
    }

    async create(tenantId: string, data: any) {
        const sql = `INSERT INTO Recipes (TenantId, Name, CreatedBy) OUTPUT INSERTED.Id VALUES (@tenantId, @name, @createdBy)`;
        const results = await this.db.query(sql, {
            tenantId,
            name: data.name,
            createdBy: data.createdBy || null
        });

        const recipeId = results[0].Id;

        if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
                await this.db.query(`INSERT INTO RecipeItems (RecipeId, MaterialId, Amount, Unit) VALUES (@recipeId, @matId, @amount, @unit)`, {
                    recipeId,
                    matId: item.materialId,
                    amount: Number(item.amount),
                    unit: item.unit || 'adet'
                });
            }
        }

        return { id: recipeId.toString(), ...data };
    }

    async update(tenantId: string, id: string, data: any) {
        if (data.name) {
            await this.db.query(`UPDATE Recipes SET Name = @name WHERE Id = @id AND TenantId = @tenantId`, { name: data.name, id, tenantId });
        }

        if (data.items && Array.isArray(data.items)) {
            await this.db.query(`DELETE FROM RecipeItems WHERE RecipeId = @recipeId`, { recipeId: id });
            for (const item of data.items) {
                await this.db.query(`INSERT INTO RecipeItems (RecipeId, MaterialId, Amount, Unit) VALUES (@recipeId, @matId, @amount, @unit)`, {
                    recipeId: id,
                    matId: item.materialId,
                    amount: Number(item.amount),
                    unit: item.unit || 'adet'
                });
            }
        }

        return { id, ...data };
    }

    async remove(tenantId: string, id: string) {
        await this.db.query(`DELETE FROM RecipeItems WHERE RecipeId = @id`, { id });
        await this.db.query(`DELETE FROM Recipes WHERE Id = @id AND TenantId = @tenantId`, { id, tenantId });
        return { success: true, message: 'Reçete başarıyla silindi.' };
    }
}
