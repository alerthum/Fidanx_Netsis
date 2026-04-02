import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mssql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private pool: mssql.ConnectionPool;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.close();
            this.logger.log('MS SQL bağlantısı kapatıldı.');
        }
    }

    private async connect() {
        const config: mssql.config = {
            server: this.configService.get<string>('DB_HOST') || '',
            user: this.configService.get<string>('DB_USER') || '',
            password: this.configService.get<string>('DB_PASS') || '',
            database: this.configService.get<string>('DB_NAME') || '',
            port: parseInt(this.configService.get<string>('DB_PORT') || '1433'),
            connectionTimeout: 30000,
            options: {
                encrypt: false,
                trustServerCertificate: true,
                requestTimeout: 30000
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
            },
        };

        try {
            this.pool = await new mssql.ConnectionPool(config).connect();
            this.logger.log(`MS SQL bağlantısı başarılı: ${config.server}`);
        } catch (err) {
            this.logger.error('MS SQL bağlantı hatası:', err);
        }
    }

    async executeTransaction<T = any>(callback: (tx: mssql.Transaction) => Promise<T>): Promise<T> {
        if (!this.pool || !this.pool.connected) await this.connect();
        if (!this.pool) throw new Error('Veritabanı bağlantısı kurulamadı.');

        const tx = new mssql.Transaction(this.pool);
        await tx.begin();
        try {
            const result = await callback(tx);
            await tx.commit();
            return result;
        } catch (err) {
            try { await tx.rollback(); } catch { }
            this.logger.error('Transaction hatası:', err);
            throw err;
        }
    }

    createRequest(tx: mssql.Transaction, params: Record<string, any> = {}): mssql.Request {
        const request = new mssql.Request(tx);
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value === 'string') {
                request.input(key, mssql.NVarChar, value);
            } else if (typeof value === 'number') {
                request.input(key, Number.isInteger(value) ? mssql.Int : mssql.Decimal(18, 4), value);
            } else if (value instanceof Date) {
                request.input(key, mssql.DateTime, value);
            } else if (typeof value === 'boolean') {
                request.input(key, mssql.Bit, value);
            } else {
                request.input(key, value);
            }
        });
        return request;
    }

    async query<T = any>(sql: string, params: Record<string, any> = {}): Promise<T[]> {
        try {
            if (!this.pool || !this.pool.connected) {
                await this.connect();
            }

            if (!this.pool) {
                throw new Error('Veritabanı bağlantısı kurulamadı. Lütfen .env ayarlarını kontrol edin.');
            }

            const request = this.pool.request();

            Object.entries(params).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    request.input(key, mssql.NVarChar, value);
                } else if (typeof value === 'number') {
                    request.input(key, Number.isInteger(value) ? mssql.Int : mssql.Decimal(18, 4), value);
                } else if (value instanceof Date) {
                    request.input(key, mssql.DateTime, value);
                } else if (typeof value === 'boolean') {
                    request.input(key, mssql.Bit, value);
                } else {
                    request.input(key, value);
                }
            });

            const result = await request.query(sql);
            return result.recordset;
        } catch (err) {
            this.logger.error(`Sorgu hatası: ${sql}`, err);
            throw err;
        }
    }
}
