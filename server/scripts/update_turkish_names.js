// using native fetch
const API_URL = 'http://127.0.0.1:3201/api';
const TENANT_ID = 'demo-tenant';

const nameMapping = {
    "Ligustrum jonandrum": "Kurtbağrı",
    "Photinia Fraseri Red Robin": "Alev Çalısı",
    "Cupressocyparis leylandii": "Leylandi",
    "Thuja occidentalis 'Smaragd'": "Zümrüt Mazı",
    "Viburnum tinus": "Defne Yapraklı Kartopu",
    "Pittosporum tobira 'Nana'": "Bodur Pitos",
    "Picea glauca 'Conica'": "Konik Ladin",
    "Cupressus sempervirens": "Akdeniz Servisi",
    "Buxus sempervirens": "Şimşir",
    "Juniperus squamata 'Blue Star'": "Mavi Ardıç",
    "Liquidambar styraciflua": "Sığla Ağacı",
    "Platanus occidentalis": "Batı Çınarı",
    "Euonymus japonica bravo": "Alacalı Taflan",
    "Juniperus horizontalis prince of wales": "Yatay Ardıç",
    "Nandina jeika": "Cennet Bambusu",
    "Himalaya": "Himalaya Sediri",
    "Abelia grandiflora": "Güzellik Çalısı",
    "Nerium oleander": "Zakkum",
    "Lagerstroemia indica": "Oya Ağacı",
    "Cercis siliquastrum": "Erguvan",
    "Akuba": "Japon Defnesi",
    "Gaura": "Sihirbaz Çiçeği",
    "Berberis": "Kadıntuzluğu",
    "Sierria": "Keçi Sakalı", // Assuming Spiraea
    "Taflan": "Karayemiş",
    "Mazı": "Mazı",
    "Limon çamı": "Limon Servi",
    "Alev": "Alev Çalısı",
    "Abelya": "Güzellik Çalısı",
    "Ardıç": "Ardıç",
    "Defne": "Akdeniz Defnesi",
    "Kartopu": "Kartopu",
    "Pitos": "Pitos",
    "Nandina domestica": "Cennet Bambusu",
    "Altuni taflan": "Altuni Taflan",
    "Mavi ladin": "Mavi Ladin",
    "Yıldız yasemin": "Yıldız Yasemin",
    "Süsen": "Süsen",
    "Lavanta": "Lavanta",
    "Biberiye": "Biberiye",
    "Kekik": "Kekik",
    "Adaçayı": "Adaçayı",
    "Nane": "Nane",
    "Fesleğen": "Fesleğen"
};

async function updatePlants() {
    try {
        // 1. Fetch Plants
        console.log('Fetching plants...');
        const res = await fetch(`${API_URL}/plants?tenantId=${TENANT_ID}`);
        if (!res.ok) throw new Error(await res.text());
        const plants = await res.json();
        console.log(`Found ${plants.length} plants.`);

        // 2. Update Loop
        let updatedCount = 0;
        for (const plant of plants) {
            const turkishName = nameMapping[plant.name];

            // Should we update if turkishName is already set? 
            // Maybe yes, to enforce the new standard.
            // Or only if missing? User said "bulup ekler misin".
            // Let's update if we have a mapping.

            if (turkishName) {
                if (plant.turkishName === turkishName) continue; // Skip if already correct

                console.log(`Updating ${plant.name} -> ${turkishName}`);

                const updateRes = await fetch(`${API_URL}/plants/${plant.id}?tenantId=${TENANT_ID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...plant, turkishName: turkishName })
                });

                if (updateRes.ok) {
                    updatedCount++;
                } else {
                    console.error(`Failed to update ${plant.name}: ${await updateRes.text()}`);
                }
            }
        }

        console.log(`Finished. Updated ${updatedCount} plants.`);

    } catch (err) {
        console.error('Error:', err);
    }
}

updatePlants();
