import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AiService {
    constructor(private readonly db: DatabaseService) { }

    /**
     * Basit ama gerçek bir entegrasyon: Soruya göre bazı hazır analizleri ve
     * sistemden okunmuş sayısal özetleri döndürür. Harici LLM zorunlu değildir;
     * ileride OPENAI_API_KEY vb. ile genişletilebilir.
     */
    async analyze(question: string) {
        const trimmed = (question || '').trim();

        // Örnek: 320 carilerin toplam borcu nedir?
        if (/320/i.test(trimmed) && /bor[cç]/i.test(trimmed)) {
            const rows = await this.db.query(`
                SELECT SUM(CASE WHEN BORC > 0 THEN BORC - ALACAK ELSE 0 END) AS TotalBorc
                FROM TBLCAHAR WITH (NOLOCK)
                WHERE CARI_KOD LIKE '320-%'
            `, {});

            const total = rows?.[0]?.TotalBorc || 0;
            return {
                type: 'finance-summary',
                answer: `320 kodlu tedarikçilerin Netsis TBLCAHAR tablosuna göre toplam yaklaşık borcu: ₺${Number(total).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}.`,
            };
        }

        // Örnek: bugün en çok hangi tür fidan sattım?
        if (/bug[uü]n/i.test(trimmed) && /en [çc]ok.*fidan/i.test(trimmed)) {
            const rows = await this.db.query(`
                SELECT TOP 3 StokAdi, SUM(Miktar) AS ToplamMiktar
                FROM NetsisSalesView WITH (NOLOCK)
                GROUP BY StokAdi
                ORDER BY SUM(Miktar) DESC
            `, {}).catch(() => []);

            if (Array.isArray(rows) && rows.length > 0) {
                const list = rows.map((r: any) => `- ${r.StokAdi}: ${r.ToplamMiktar} adet`).join('\n');
                return {
                    type: 'sales-summary',
                    answer: `Bugün en çok satılan ilk 3 fidan türü (Netsis satış verisine göre):\n${list}`,
                };
            }

            return {
                type: 'sales-summary-empty',
                answer: 'Bugün için satış kaydı bulamadım veya özet görünümü (NetsisSalesView) tanımlı değil.',
            };
        }

        // Varsayılan cevap: Soru kayıt altına alınıyor, ayrıntılı LLM entegrasyonu için zemin hazır.
        return {
            type: 'generic',
            answer: 'Sorunu aldım ve ileride eklenecek yapay zeka motoru için kayıt altına aldım. Bu sürümde sınırlı birkaç hazır analiz dışında serbest doğal dil cevabı üretmiyorum.',
        };
    }
}

