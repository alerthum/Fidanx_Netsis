import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

@Injectable()
export class LocationsService {
    private readonly logger = new Logger(LocationsService.name);

    constructor(private readonly db: DatabaseService) { }

    async findAll(tenantId: string) {
        return this.db.query(`
            SELECT * FROM FDX_Lokasyonlar WITH (NOLOCK)
            WHERE TenantId = @tenantId AND AktifMi = 1
            ORDER BY LokasyonAdi ASC
        `, { tenantId });
    }

    async findOne(tenantId: string, id: string | number) {
        const rows = await this.db.query(`
            SELECT * FROM FDX_Lokasyonlar WITH (NOLOCK)
            WHERE Id = @id AND TenantId = @tenantId
        `, { id, tenantId });
        return rows[0] || null;
    }

    async findByQr(tenantId: string, qr: string) {
        const rows = await this.db.query(`
            SELECT * FROM FDX_Lokasyonlar WITH (NOLOCK)
            WHERE QRKodu = @qr AND TenantId = @tenantId AND AktifMi = 1
        `, { qr, tenantId });
        return rows[0] || null;
    }

    async create(tenantId: string, data: {
        lokasyonKodu: string;
        lokasyonAdi: string;
        lokasyonTipi: string;
        kapasite?: number;
        notlar?: string;
    }) {
        const uuid = crypto.randomUUID(); // Barkod/QR kodu olarak kullanılacak
        
        await this.db.query(`
            INSERT INTO FDX_Lokasyonlar (TenantId, LokasyonKodu, LokasyonAdi, LokasyonTipi, Kapasite, QRKodu, Notlar)
            VALUES (@tenantId, @kodu, @adi, @tipi, @kapasite, @qr, @notlar)
        `, {
            tenantId,
            kodu: data.lokasyonKodu,
            adi: data.lokasyonAdi,
            tipi: data.lokasyonTipi,
            kapasite: data.kapasite || 0,
            qr: uuid,
            notlar: data.notlar || ''
        });

        this.logger.log(`Yeni lokasyon eklendi: ${data.lokasyonAdi} [${data.lokasyonKodu}]`);
        return { success: true, uuid };
    }

    async update(tenantId: string, id: number, data: any) {
        await this.db.query(`
            UPDATE FDX_Lokasyonlar 
            SET LokasyonAdi = @adi, LokasyonTipi = @tipi, Kapasite = @kapasite, Notlar = @notlar, UpdatedAt = GETDATE()
            WHERE Id = @id AND TenantId = @tenantId
        `, {
            tenantId,
            id,
            adi: data.lokasyonAdi,
            tipi: data.lokasyonTipi,
            kapasite: data.kapasite || 0,
            notlar: data.notlar || ''
        });
        return { success: true };
    }

    async remove(tenantId: string, id: number) {
        await this.db.query(`
            UPDATE FDX_Lokasyonlar SET AktifMi = 0, UpdatedAt = GETDATE()
            WHERE Id = @id AND TenantId = @tenantId
        `, { id, tenantId });
        return { success: true };
    }

    // Belirli bir lokasyonda bulunan partilerin durumunu getir
    async getInventoryAtLocation(tenantId: string, lokasyonId: number) {
        return this.db.query(`
            SELECT 
                PL.Miktar, PL.YerlestirmeTarihi,
                P.PartiNo, P.BitkiAdi, P.NetsisStokKodu, P.Safha, P.MevcutMiktar,
                L.LokasyonAdi
            FROM FDX_PartiLokasyon PL WITH (NOLOCK)
            INNER JOIN FDX_BitkiPartileri P WITH (NOLOCK) ON P.Id = PL.PartiId
            INNER JOIN FDX_Lokasyonlar L WITH (NOLOCK) ON L.Id = PL.LokasyonId
            WHERE PL.TenantId = @tenantId AND PL.LokasyonId = @lokasyonId AND PL.Miktar > 0
            ORDER BY P.BitkiAdi ASC
        `, { tenantId, lokasyonId });
    }

    // QR taraması ile Partiyi Lokasyona bağla (Ekle veya Güncelle)
    async assignBatchToLocation(tenantId: string, lokasyonId: number, partiId: number, miktar: number) {
        // Lokasyon var mı?
        const lokasyon = await this.findOne(tenantId, lokasyonId);
        if (!lokasyon) throw new Error('Lokasyon bulunamadı.');

        // Daha önce bu lokasyonda bu parti var mıydı?
        const existing = await this.db.query(`
            SELECT Id, Miktar FROM FDX_PartiLokasyon WITH (NOLOCK)
            WHERE TenantId = @tenantId AND PartiId = @partiId AND LokasyonId = @lokasyonId
        `, { tenantId, partiId, lokasyonId });

        if (existing.length > 0) {
            // Varsa miktarı güncelle
            await this.db.query(`
                UPDATE FDX_PartiLokasyon 
                SET Miktar = Miktar + @miktar, YerlestirmeTarihi = GETDATE()
                WHERE Id = @id
            `, { miktar, id: existing[0].Id });
            this.logger.log(`Parti [${partiId}] lokasyonda güncellendi: ${lokasyon.LokasyonAdi} (+${miktar})`);
        } else {
            // Yoksa yeni kayıt at
            await this.db.query(`
                INSERT INTO FDX_PartiLokasyon (TenantId, PartiId, LokasyonId, Miktar, YerlestirmeTarihi)
                VALUES (@tenantId, @partiId, @lokasyonId, @miktar, GETDATE())
            `, { tenantId, partiId, lokasyonId, miktar });
            this.logger.log(`Parti [${partiId}] lokasyona yerleştirildi: ${lokasyon.LokasyonAdi} (Adet: ${miktar})`);
        }

        return { success: true, lokasyonId, partiId, aktarilanMiktar: miktar };
    }
}
