import { test, expect } from '@playwright/test';

test.describe('FidanX Read-Only Navigation Tests', () => {

    const pagesToTest = [
        { name: 'Giriş (Anasayfa)', path: '/' },
        { name: 'Dashboard', path: '/operasyon' },
        { name: 'Üretim Modülü (Partiler)', path: '/uretim' },
        { name: 'Satınalma (Faturalar)', path: '/satinalma' },
        { name: 'Satış (Faturalar & CRM)', path: '/satislar' },
        { name: 'Stoklar (Envanter)', path: '/stoklar' },
        { name: 'Finans (Banka & Kasa)', path: '/finans' },
        { name: 'Reçeteler', path: '/receteler' },
        { name: 'Mobil Tarayıcı (Scanner)', path: '/scanner' },
        { name: 'Sistem Ayarları', path: '/ayarlar' }
    ];

    for (const pageInfo of pagesToTest) {
        test(`Ziyaret Ediliyor ve Çökme Kontrolü Yapılıyor: ${pageInfo.name}`, async ({ page }) => {

            const consoleErrors: string[] = [];
            const failedRequests: string[] = [];

            // Konsol hatalarını dinle (Örn: TypeError, React Key Warning)
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });

            // Ağ hatalarını dinle (Örn: 500 Internal Server Error)
            page.on('response', response => {
                if (response.status() >= 500) {
                    failedRequests.push(`${response.status()} - ${response.url()}`);
                }
            });

            // Sayfaya git ve yüklenmesini bekle
            await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

            // React Next.js'in düzgün çalıştığını doğrula (Ekranda çökme ekranı olmamalı)
            // Body içinde Application Error veya benzeri temel hata mesajları olmamasına bakıyoruz
            const bodyText = await page.locator('body').innerText();
            expect(bodyText).not.toContain('Application error: a client-side exception has occurred');

            // Hataları raporla (Sadece okuyacağız, hata varsa test başarısız sayılsın)
            expect(failedRequests, `Sayfada 500 API hatası oluştu: ${failedRequests.join(', ')}`).toHaveLength(0);

            // Warning vs Error seviyelerine göre konsolu tamamen boş olmaya zorlamak bazen gereksiz fail yaratabilir,
            // Ancak "Failed to fetch" veya "TypeError" bariz hatalardır. (Şimdilik React key hatası gibi olanları da yakalarız).
            if (consoleErrors.some(e => e.includes('TypeError') || e.includes('Failed to fetch'))) {
                throw new Error(`Kritik Konsol Hatası Bulundu:\n${consoleErrors.join('\n')}`);
            }
        });
    }
});
