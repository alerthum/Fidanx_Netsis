import { Controller, Post, Query } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('integration')
export class IntegrationController {
    constructor(private readonly integrationService: IntegrationService) { }

    @Post('sync-customers')
    syncCustomers(@Query('tenantId') tenantId: string) {
        return this.integrationService.syncCustomers(tenantId);
    }

    @Post('sync-stocks')
    syncStocks(@Query('tenantId') tenantId: string) {
        return this.integrationService.syncStocks(tenantId);
    }
}
