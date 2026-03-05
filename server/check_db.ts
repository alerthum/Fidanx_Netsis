
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function checkData() {
    const credPath = path.join(process.cwd(), 'firebase-admin.json');
    if (!fs.existsSync(credPath)) {
        console.error('Credentials file not found at:', credPath);
        return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const tenantId = 'demo-tenant';
    const tenantRef = db.collection('tenants').doc(tenantId);

    const doc = await tenantRef.get();
    if (!doc.exists) {
        console.log(`Tenant ${tenantId} does not exist.`);
    } else {
        console.log(`Tenant ${tenantId} exists:`, JSON.stringify(doc.data(), null, 2));
    }

    const collections = ['plants', 'production', 'recipes', 'customers', 'orders', 'expenses', 'activity_logs'];
    for (const col of collections) {
        const snap = await tenantRef.collection(col).get();
        console.log(`Collection ${col}: ${snap.size} documents found.`);
    }
}

checkData().catch(console.error);
