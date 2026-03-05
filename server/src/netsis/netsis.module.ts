import { Module } from '@nestjs/common';
import { NetsisStocksService } from './stocks/stocks.service';
import { NetsisStocksController } from './stocks/stocks.controller';
import { NetsisCustomersService } from './customers/customers.service';
import { NetsisCustomersController } from './customers/customers.controller';
import { NetsisFinanceService } from './finance/finance.service';
import { NetsisFinanceController } from './finance/finance.controller';
import { NetsisInvoicesService } from './invoices/invoices.service';
import { NetsisInvoicesController } from './invoices/invoices.controller';
import { NetsisDashboardService } from './dashboard/dashboard.service';
import { NetsisDashboardController } from './dashboard/dashboard.controller';
import { IntegrationModule } from '../integration/integration.module';

@Module({
    imports: [IntegrationModule],
    providers: [NetsisStocksService, NetsisCustomersService, NetsisFinanceService, NetsisInvoicesService, NetsisDashboardService],
    controllers: [NetsisStocksController, NetsisCustomersController, NetsisFinanceController, NetsisInvoicesController, NetsisDashboardController],
    exports: [NetsisStocksService, NetsisCustomersService, NetsisFinanceService, NetsisInvoicesService, NetsisDashboardService],
})
export class NetsisModule { }
