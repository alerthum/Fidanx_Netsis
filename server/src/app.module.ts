import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';


import { TenantsModule } from './tenants/tenants.module';
import { PlantsModule } from './plants/plants.module';
import { ProductionModule } from './production/production.module';
import { RecipesModule } from './recipes/recipes.module';
import { SalesModule } from './sales/sales.module';
import { FinansModule } from './finans/finans.module';
import { ActivityModule } from './activity/activity.module';
import { IntegrationModule } from './integration/integration.module';
import { NetsisModule } from './netsis/netsis.module';
import { SeedController } from './seed/seed.controller';
import { PurchasesModule } from './purchases/purchases.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,

    TenantsModule,
    PlantsModule,
    ProductionModule,
    RecipesModule,
    SalesModule,
    FinansModule,
    ActivityModule,
    IntegrationModule,
    PurchasesModule,
    SupportModule,
    NetsisModule,
  ],
  controllers: [AppController, SeedController],
  providers: [AppService],
})
export class AppModule { }
