/**
 * Firebase (Fidanx) tenants/.../temperature_logs verilerini
 * Fidanx_Netsis SQL TemperatureLogs tablosuna aktarir.
 *
 * Kullanim:
 *   cd server
 *   FIREBASE_CREDENTIALS="..\Fidanx\server\firebase-admin.json" node scripts/migrate-firebase-temperature-to-sql.js
 *
 * Gereksinimler:
 *   - .env icinde DB_HOST, DB_USER, DB_PASS, DB_NAME (ve istege bagli DB_PORT) tanimli olmali
 *   - Firebase service account JSON (Fidanx firebase-admin.json)
 *   - TemperatureLogs tablosu olusturulmus olmali (create_tables.sql)
 */

const path = require('path');
const fs = require('fs');

// .env yükle (server klasöründen çalıştırıldığında)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const m = line.match(/^\s*([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
}

const FIREBASE_CREDENTIALS = process.env.FIREBASE_CREDENTIALS || path.resolve(__dirname, '..', '..', '..', 'Fidanx', 'server', 'firebase-admin.json');

async function main() {
    if (!fs.existsSync(FIREBASE_CREDENTIALS)) {
        console.error('Firebase credentials bulunamadı. FIREBASE_CREDENTIALS ile yol verin:', FIREBASE_CREDENTIALS);
        process.exit(1);
    }

    const admin = require('firebase-admin');
    const mssql = require('mssql');

    if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_CREDENTIALS, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    const db = admin.firestore();

    const dbConfig = {
        server: process.env.DB_HOST || '',
        user: process.env.DB_USER || '',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || '',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        options: { encrypt: false, trustServerCertificate: true },
    };

    if (!dbConfig.server || !dbConfig.user || !dbConfig.database) {
        console.error('SQL bağlantı bilgileri eksik. .env içinde DB_HOST, DB_USER, DB_PASS, DB_NAME tanımlayın.');
        process.exit(1);
    }

    console.log('Firebase\'den temperature_logs okunuyor...');

    const tenantsSnap = await db.collection('tenants').get();
    const allRows = [];

    for (const tenantDoc of tenantsSnap.docs) {
        const tenantId = tenantDoc.id;
        const tempSnap = await tenantDoc.ref.collection('temperature_logs').get();

        tempSnap.docs.forEach(doc => {
            const d = doc.data();
            let logDate = d.date;
            if (logDate && typeof logDate.toDate === 'function') logDate = logDate.toDate();
            else if (typeof logDate === 'string') logDate = new Date(logDate);
            else if (!logDate) return;

            const seraIci = d.seraIci || {};
            const seraDisi = d.seraDisi || {};

            allRows.push({
                TenantId: tenantId,
                LogDate: logDate,
                SeraIciSabah: seraIci.sabah != null ? Number(seraIci.sabah) : null,
                SeraIciOgle: seraIci.ogle != null ? Number(seraIci.ogle) : null,
                SeraIciAksam: seraIci.aksam != null ? Number(seraIci.aksam) : null,
                SeraDisiSabah: seraDisi.sabah != null ? Number(seraDisi.sabah) : null,
                SeraDisiOgle: seraDisi.ogle != null ? Number(seraDisi.ogle) : null,
                SeraDisiAksam: seraDisi.aksam != null ? Number(seraDisi.aksam) : null,
                MazotLt: d.mazot != null ? Number(d.mazot) : null,
                Note: d.note || null,
            });
        });

        console.log(`  Tenant "${tenantId}": ${tempSnap.size} kayıt`);
    }

    console.log(`Toplam ${allRows.length} sıcaklık kaydı. SQL\'e yazılıyor...`);

    if (allRows.length === 0) {
        console.log('Yazılacak kayıt yok. Çıkılıyor.');
        process.exit(0);
    }

    const pool = await mssql.connect(dbConfig);

    const insertSql = `
        INSERT INTO TemperatureLogs (TenantId, LogDate, SeraIciSabah, SeraIciOgle, SeraIciAksam, SeraDisiSabah, SeraDisiOgle, SeraDisiAksam, MazotLt, Note)
        VALUES (@TenantId, @LogDate, @SeraIciSabah, @SeraIciOgle, @SeraIciAksam, @SeraDisiSabah, @SeraDisiOgle, @SeraDisiAksam, @MazotLt, @Note)
    `;

    let inserted = 0;
    for (const row of allRows) {
        try {
            await pool.request()
                .input('TenantId', mssql.NVarChar(50), row.TenantId)
                .input('LogDate', mssql.DateTime, row.LogDate)
                .input('SeraIciSabah', mssql.Float, row.SeraIciSabah)
                .input('SeraIciOgle', mssql.Float, row.SeraIciOgle)
                .input('SeraIciAksam', mssql.Float, row.SeraIciAksam)
                .input('SeraDisiSabah', mssql.Float, row.SeraDisiSabah)
                .input('SeraDisiOgle', mssql.Float, row.SeraDisiOgle)
                .input('SeraDisiAksam', mssql.Float, row.SeraDisiAksam)
                .input('MazotLt', mssql.Float, row.MazotLt)
                .input('Note', mssql.NVarChar(mssql.MAX), row.Note)
                .query(insertSql);
            inserted++;
        } catch (err) {
            console.error('Satır yazılırken hata:', row.LogDate, row.TenantId, err.message);
        }
    }

    await pool.close();
    console.log('Tamamlandı. ' + inserted + '/' + allRows.length + ' kayıt TemperatureLogs tablosuna eklendi.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
