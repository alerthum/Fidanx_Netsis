import { Controller, Get } from '@nestjs/common';
import { NetsisDashboardService } from './dashboard.service';

@Controller('netsis/dashboard')
export class NetsisDashboardController {
    constructor(private readonly dashboardService: NetsisDashboardService) { }

    @Get('stock-summary')
    async getStockSummary() {
        return this.dashboardService.getStockSummary();
    }

    @Get('critical-stocks')
    async getCriticalStocks() {
        return this.dashboardService.getCriticalStocks();
    }

    @Get('top-customers')
    async getTopCustomers() {
        return this.dashboardService.getTopCustomers();
    }

    @Get('sales-comparison')
    async getMonthlySalesComparison() {
        return this.dashboardService.getMonthlySalesComparison();
    }
}
