import { Module } from '@nestjs/common';
import { FinansController } from './finans.controller';
import { ExpensesService } from './expenses.service';
import { CostingService } from './costing.service';

@Module({
    controllers: [FinansController],
    providers: [ExpensesService, CostingService],
})
export class FinansModule { }
