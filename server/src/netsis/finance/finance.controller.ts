import { Controller, Get, Param, Query } from '@nestjs/common';
import { NetsisFinanceService } from './finance.service';

@Controller('netsis/finance')
export class NetsisFinanceController {
    constructor(private readonly financeService: NetsisFinanceService) { }

    @Get('banks')
    async getAllBanks() {
        return this.financeService.getAllBanks();
    }

    @Get('banks/:code/transactions')
    async getBankTransactions(@Param('code') code: string) {
        return this.financeService.getBankTransactions(code);
    }

    @Get('cash-boxes')
    async getAllCashBoxes() {
        return this.financeService.getAllCashBoxes();
    }

    @Get('cash-boxes/:code/transactions')
    async getCashBoxTransactions(@Param('code') code: string) {
        return this.financeService.getCashBoxTransactions(code);
    }

    @Get('cheques/customer')
    async getCustomerCheques(@Query('yeri') yeri: string) {
        return this.financeService.getCustomerCheques(yeri);
    }

    @Get('cheques/own')
    async getOwnCheques() {
        return this.financeService.getOwnCheques();
    }

    @Get('payments')
    async getPayments(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('cariAdi') cariAdi: string,
        @Query('period') period: string
    ) {
        return this.financeService.getPayments({ startDate, endDate, cariAdi, period });
    }

    @Get('payments/summary')
    async getPaymentSummary() {
        return this.financeService.getPaymentSummary();
    }

    @Get('projection')
    async getFinanceProjection() {
        return this.financeService.getFinanceProjection();
    }
}
