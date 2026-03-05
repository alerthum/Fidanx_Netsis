import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
    constructor(private readonly recipesService: RecipesService) { }

    @Get()
    findAll(@Query('tenantId') tenantId: string) {
        return this.recipesService.findAll(tenantId);
    }

    @Post()
    create(@Query('tenantId') tenantId: string, @Body() data: any) {
        return this.recipesService.create(tenantId, data);
    }

    @Patch(':id')
    update(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() data: any
    ) {
        return this.recipesService.update(tenantId, id, data);
    }

    @Delete(':id')
    remove(@Query('tenantId') tenantId: string, @Param('id') id: string) {
        return this.recipesService.remove(tenantId, id);
    }
}
