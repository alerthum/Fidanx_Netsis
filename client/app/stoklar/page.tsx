"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';
import StokDonusumModal from '@/components/stoklar/StokDonusumModal';

interface Plant {
    id: string;
    name: string;
    category?: string;
    grupIsim?: string;
    sku?: string;
    kod1?: string;
    kod2?: string;
    kod3?: string;
    kod4?: string;
    kod5?: string;
    type?: string;
    volume?: string;
    dimensions?: string;
    potType?: string; // Saksı Tipi (Yeni)
    supplierId?: string; // Tedarikçi ID (Yeni)
    unit?: string;
    image?: string;
    turkishName?: string; // Türkçe İsim (Yeni)
    currentStock?: number;
    wholesalePrice?: number;
    retailPrice?: number;
    purchasePrice?: number;
    criticalStock?: number;
    viyolCount?: number;
    cuttingCount?: number;
    createdAt: string;
}

export default function StoklarPage() {
    const [plants, setPlants] = useState<Plant[]>([]);
    const [companies, setCompanies] = useState<any[]>([]); // For Supplier Dropdown
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [isDonusumModalOpen, setIsDonusumModalOpen] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [selectedPlantName, setSelectedPlantName] = useState('');
    const [selectedStock, setSelectedStock] = useState<{ id: string; name: string; sku: string; currentStock?: number } | null>(null);

    const [stockSupplierData, setStockSupplierData] = useState<any[]>([]);
    const [grouping, setGrouping] = useState<'NONE' | 'CATEGORY' | 'SUPPLIER' | 'STOCK_SUPPLIER'>('NONE');
    const [stockFilters, setStockFilters] = useState({ arama: '', tedarikci: '', grupKodu: '' });
    /** Hareket modalı için; liste yüklemesi ile karışmasın */
    const [movementsLoading, setMovementsLoading] = useState(false);

    const API_URL = '/api';

    const fetchPlants = async () => {
        setIsLoading(true);
        setError(null);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 45000);
        try {
            // Netsis'ten gerçek stok verilerini çekiyoruz
            const params = new URLSearchParams();
            if (stockFilters.arama) params.set('arama', stockFilters.arama);
            if (stockFilters.tedarikci) params.set('tedarikci', stockFilters.tedarikci);
            if (stockFilters.grupKodu) params.set('grupKodu', stockFilters.grupKodu);
            const qs = params.toString();
            const res = await fetch(`${API_URL}/netsis/stocks/list${qs ? '?' + qs : ''}`, { signal: controller.signal });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Sunucu hatası');
            }
            const data = await res.json();

            // Netsis verilerini Plant arayüzüne eşliyoruz
            const mappedData = Array.isArray(data) ? data.map((s: any) => ({
                id: s.StokKodu,
                name: s.StokAdi,
                sku: s.StokKodu,
                category: s.Tip || 'DİĞER',
                grupIsim: s.GrupIsim,
                kod1: s.Kod1,
                kod2: s.Kod2,
                kod3: s.Kod3,
                kod4: s.Kod4,
                kod5: s.Kod5,
                unit: s.Birim || 'Adet',
                currentStock: s.Bakiye,
                type: s.Tip,
                supplierId: '',
                tedarikciAdi: '',
                potType: s.S_YEDEK1 || undefined,
                createdAt: new Date().toISOString()
            })) : [];

            setPlants(mappedData);
        } catch (err: any) {
            console.error('Stoklar yüklenemedi:', err);
            const msg = err?.name === 'AbortError' ? 'İstek zaman aşımı (API yanıt vermedi).' : (err.message || 'Sunucuya bağlanılamadı.');
            setError(msg);
            setPlants([]);
        } finally {
            clearTimeout(t);
            setIsLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            // Tedarikçileri Satış Modülünden çekiyoruz (Netsis Cariler)
            const res = await fetch(`${API_URL}/netsis/customers`);
            const data = await res.json();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (err) { }
    };



    const fetchStockSupplierData = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/stocks/list-with-suppliers?tenantId=demo-tenant`);
            const data = await res.json();
            setStockSupplierData(Array.isArray(data) ? data : []);
        } catch (err) { }
    };

    useEffect(() => {
        fetchCompanies();
        fetchStockSupplierData();
    }, []);

    useEffect(() => {
        fetchPlants();
    }, [stockFilters.arama, stockFilters.tedarikci, stockFilters.grupKodu]);

    const fetchMovements = async (stokKodu: string, name: string) => {
        if (!stokKodu?.trim()) return;
        setMovementsLoading(true);
        setSelectedPlantName(name);
        try {
            const res = await fetch(`${API_URL}/netsis/stocks/movements?stokKodu=${encodeURIComponent(stokKodu.trim())}`);
            const data = await res.ok ? await res.json() : [];
            setMovements(Array.isArray(data) ? data : []);
            setIsMovementsModalOpen(true);
        } catch (err) {
            setMovements([]);
            setIsMovementsModalOpen(true);
        } finally {
            setMovementsLoading(false);
        }
    };



    // Grouping Logic
    const getGroupedPlants = () => {
        if (grouping === 'STOCK_SUPPLIER') {
            // Netsis alış faturalarından stok-cari eşleşmeleri (cari adı ve stok adına göre)
            const sortedList = stockSupplierData.map((row: any) => ({
                id: `${row.StokKodu}-${row.CariKodu}`,
                plantId: row.StokKodu,
                supplierId: row.CariKodu,
                name: row.StokAdi,
                category: plants.find(p => p.id === row.StokKodu)?.category,
                sku: row.StokKodu,
                type: plants.find(p => p.id === row.StokKodu)?.type,
                supplierName: row.CariAdi,
                totalPurchased: Number(row.ToplamMiktar) || 0,
                lastPrice: Number(row.SonBirimFiyat) || 0,
                lastDate: row.SonTarih,
                currentStock: plants.find(p => p.id === row.StokKodu)?.currentStock,
                unit: 'Adet',
                image: undefined,
                potType: undefined,
                turkishName: undefined
            })).sort((a: any, b: any) => {
                const nameCompare = (a.name || '').localeCompare(b.name || '', 'tr');
                if (nameCompare !== 0) return nameCompare;
                return (a.supplierName || '').localeCompare(b.supplierName || '', 'tr');
            });

            const groups: Record<string, any[]> = {};
            sortedList.forEach((item: any) => {
                const key = item.name || 'İsimsiz';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            const sortedGroups: Record<string, any[]> = {};
            Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr')).forEach(key => {
                sortedGroups[key] = groups[key];
            });
            return sortedGroups;
        }

        // TEDARİKÇİ grubu: Stok/Cari ile aynı veri kaynağı (stockSupplierData), cari adına göre grupla → Cari/Stok (önce cari, altında stoklar)
        if (grouping === 'SUPPLIER') {
            const sortedList = stockSupplierData.map((row: any) => ({
                id: `${row.StokKodu}-${row.CariKodu}`,
                plantId: row.StokKodu,
                supplierId: row.CariKodu,
                name: row.StokAdi,
                category: plants.find(p => p.id === row.StokKodu)?.category,
                sku: row.StokKodu,
                type: plants.find(p => p.id === row.StokKodu)?.type,
                supplierName: row.CariAdi,
                totalPurchased: Number(row.ToplamMiktar) || 0,
                lastPrice: Number(row.SonBirimFiyat) || 0,
                lastDate: row.SonTarih,
                currentStock: plants.find(p => p.id === row.StokKodu)?.currentStock,
                unit: 'Adet',
                image: undefined,
                potType: undefined,
                turkishName: undefined
            })).sort((a: any, b: any) => {
                const supplierCompare = (a.supplierName || '').localeCompare(b.supplierName || '', 'tr');
                if (supplierCompare !== 0) return supplierCompare;
                return (a.name || '').localeCompare(b.name || '', 'tr');
            });

            const groups: Record<string, any[]> = {};
            sortedList.forEach((item: any) => {
                const key = item.supplierName || 'Tedarikçisiz';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            const sortedGroups: Record<string, any[]> = {};
            Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr')).forEach(key => {
                sortedGroups[key] = groups[key];
            });
            return sortedGroups;
        }


        if (grouping === 'NONE') return { 'Tümü': plants };

        const groups: Record<string, Plant[]> = {};
        plants.forEach(plant => {
            let key = 'Di?er';
            if (grouping === 'CATEGORY') key = plant.grupIsim || plant.category || 'Kategorisiz';

            if (!groups[key]) groups[key] = [];
            groups[key].push(plant);
        });
        return groups;
    };

    const groupedPlants = getGroupedPlants();

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center sticky top-0 lg:top-0 z-30 shadow-sm gap-4 lg:py-0 lg:h-[88px] shrink-0">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Stok Listesi</h1>
                        <p className="text-xs lg:text-sm text-slate-500">Stok kartları ve miktarlar Netsis veritabanından anlık okunur.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
                        <div className="flex flex-wrap gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Stok/Cari ara..."
                                value={stockFilters.arama}
                                onChange={(e) => setStockFilters(f => ({ ...f, arama: e.target.value }))}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-40"
                            />
                            <input
                                type="text"
                                placeholder="Tedarikçi ara..."
                                value={stockFilters.tedarikci}
                                onChange={(e) => setStockFilters(f => ({ ...f, tedarikci: e.target.value }))}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-40"
                            />
                            <input
                                type="text"
                                placeholder="Grup kodu..."
                                value={stockFilters.grupKodu}
                                onChange={(e) => setStockFilters(f => ({ ...f, grupKodu: e.target.value }))}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-32"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Grupla:</span>
                            <button onClick={() => setGrouping('NONE')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition ${grouping === 'NONE' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>YOK</button>
                            <button onClick={() => setGrouping('CATEGORY')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition ${grouping === 'CATEGORY' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>KATEGORİ</button>
                            <button onClick={() => setGrouping('SUPPLIER')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition ${grouping === 'SUPPLIER' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>TEDARİKÇİ</button>
                            <button onClick={() => setGrouping('STOCK_SUPPLIER')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition ${grouping === 'STOCK_SUPPLIER' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>STOK/CARİ</button>
                        </div>
                        <ExportButton title="Mevcut Stok Durumu" tableId="stok-table" />
                        <button
                            type="button"
                            onClick={() => alert('Stok kartı ana kaynağı Netsis veritabanıdır. Yeni bitki, saksı veya hammadde kartını Netsis tarafında açın; FidanX stok listesini anlık Netsis verisinden okur.')}
                            className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 shadow-md transition active:scale-95"
                        >
                            Netsis'te Stok Aç
                        </button>
                    </div>
                </header>

                {/* Critical Stock Alert Banner */}
                {plants.filter(p => (p.criticalStock ?? 0) > 0 && (p.currentStock || 0) <= (p.criticalStock ?? 0)).length > 0 && (
                    <div className="mx-4 lg:mx-8 mt-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-xl shadow-inner">⚠️</div>
                            <div>
                                <h4 className="text-sm font-black text-rose-800 uppercase tracking-wide">Kritik Stok Uyarısı</h4>
                                <p className="text-xs text-rose-600 font-medium mt-0.5">
                                    Toplam <span className="font-bold underline">{plants.filter(p => (p.criticalStock ?? 0) > 0 && (p.currentStock || 0) <= (p.criticalStock ?? 0)).length} ürün</span> kritik seviyenin altında. Tedarik planlaması yapmanız önerilir.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 p-4 md:p-8 space-y-8">
                    {/* Error display omitted for brevity */}

                    {Object.entries(groupedPlants).map(([groupTitle, groupPlants]) => (
                        <div key={groupTitle} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                            {grouping !== 'NONE' && (
                                <div className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 border-b border-emerald-700 flex justify-between items-center">
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{groupTitle}</h3>
                                    <span className="text-xs font-bold text-emerald-100 bg-emerald-700/40 px-2.5 py-1 rounded-md border border-emerald-400/30">{groupPlants.length} Kayıt</span>
                                </div>
                            )}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]" id="stok-table">
                                    <thead className="bg-transparent text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b-2 border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Fidan Adı & Tip</th>
                                            <th className="px-6 py-4">Kategori / SKU</th>
                                            {grouping !== 'NONE' && (
                                                <th className="px-6 py-4">Tedarikçi / Saksı</th>
                                            )}
                                            {(grouping === 'STOCK_SUPPLIER' || grouping === 'SUPPLIER') ? (
                                                <>
                                                    <th className="px-6 py-4 text-center">Toplam Alınan</th>
                                                    <th className="px-6 py-4 text-center">Son Alış Fiyatı</th>
                                                    <th className="px-6 py-4 text-center">Son Alış Tarihi</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4 text-center">Mevcut Stok</th>
                                                    <th className="px-6 py-4 text-center">Birim Fiyat (Alış/Satış)</th>
                                                    <th className="px-6 py-4 text-center">Viyol / Çelik</th>
                                                </>
                                            )}
                                            <th className="px-6 py-4 text-center">Kod 1-5 (Grup)</th>
                                            <th className="px-6 py-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {groupPlants.map((plant: any) => { // Type 'any' because of mixed structure in STOCK_SUPPLIER
                                            const supplierName = (grouping === 'STOCK_SUPPLIER' || grouping === 'SUPPLIER')
                                                ? plant.supplierName
                                                : (companies.find(c => c.id === plant.supplierId)?.name || '-');

                                            // STOCK_SUPPLIER = salt okunur. SUPPLIER = cari/stok, aynı sütunlar + HAREKET/BARKOD/DÜZENLE
                                            const isStockSupplierMode = grouping === 'STOCK_SUPPLIER';
                                            const showSupplierStockColumns = grouping === 'STOCK_SUPPLIER' || grouping === 'SUPPLIER';

                                            return (
                                                <tr key={plant.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">
                                                                {plant.type === 'MOTHER_TREE' ? '🌳' : plant.type === 'PACKAGING' ? '📦' : plant.type === 'RAW_MATERIAL' ? '🧱' : '🌱'}
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-[13px] group-hover:text-orange-600 transition-colors">
                                                                    {plant.name}
                                                                    {plant.turkishName && <span className="text-slate-500 font-medium ml-1 text-[11px] group-hover:text-orange-500 transition-colors">({plant.turkishName})</span>}
                                                                </p>
                                                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">
                                                                    {plant.type === 'MOTHER_TREE' ? '• ANA AĞAÇ' : plant.type === 'PACKAGING' ? '• AMBALAJ / SAKSI' : plant.type === 'RAW_MATERIAL' ? '• HAMMADDE / GÜBRE' : '• ÜRETİM MATERYALİ'}
                                                                </p>
                                                                {(plant.volume || plant.dimensions) && (
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                        {plant.volume && `[${plant.volume}]`} {plant.dimensions && `(${plant.dimensions})`}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-700 text-[12px] group-hover:text-orange-500 transition-colors">{(plant.grupIsim || plant.category) || '-'}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase mt-1">{plant.sku || 'SKU-YOK'}</p>
                                                    </td>
                                                    {grouping !== 'NONE' && (
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-700 text-xs">{supplierName}</span>
                                                                {!isStockSupplierMode && (
                                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1 border border-slate-200 text-center">
                                                                        {plant.potType || 'Saksısız'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}

                                                    {showSupplierStockColumns ? (
                                                        <>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="font-bold text-[12px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                                    {plant.totalPurchased?.toLocaleString()} {plant.unit || 'Adet'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="font-mono font-black text-slate-900 group-hover:text-orange-500 transition-colors text-[13px]">
                                                                    ₺{plant.lastPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-[12px] text-slate-500 font-mono group-hover:text-orange-500 transition-colors">
                                                                {plant.lastDate ? new Date(plant.lastDate).toLocaleDateString() : '-'}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className={`font-black text-[13px] ${(plant.criticalStock ?? 0) > 0 && (plant.currentStock || 0) <= (plant.criticalStock ?? 0) ? 'text-rose-600' : 'text-slate-900 group-hover:text-orange-600 transition-colors'}`}>
                                                                        {plant.currentStock !== undefined ? plant.currentStock : '-'}
                                                                    </span>
                                                                    {(plant.currentStock || 0) <= (plant.criticalStock ?? 0) && (plant.criticalStock ?? 0) > 0 && (
                                                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tight bg-rose-50 px-1.5 py-0.5 rounded mt-0.5 border border-rose-100 flex items-center gap-1">
                                                                            <span>⚠️</span> Kritik ({plant.criticalStock ?? 0})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="font-black text-slate-900 group-hover:text-orange-500 transition-colors text-[13px]" title="Toptan Satış Fiyatı">
                                                                        {plant.wholesalePrice ? `S: ₺${plant.wholesalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                                                                    </span>
                                                                    <span className="text-[10px] text-emerald-600 font-bold" title="Alış Fiyatı (Maliyet)">
                                                                        {plant.purchasePrice ? `A: ₺${plant.purchasePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : ''}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {plant.viyolCount ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[11px] font-bold border border-green-100">
                                                                            🧫 {plant.viyolCount} viyol
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono group-hover:text-orange-500 transition-colors">
                                                                            {plant.cuttingCount?.toLocaleString()} çelik
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                                )}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center gap-1">
                                                            {[plant.kod1, plant.kod2, plant.kod3, plant.kod4, plant.kod5].map((k: string, i: number) => (
                                                                <span key={i} title={`Kod ${i + 1}`} className={`px-2 py-1 rounded text-[9px] font-bold ${k ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-300'}`}>
                                                                    {k || '-'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 items-center h-full">
                                                            {!isStockSupplierMode && (
                                                                <>
                                                                    <button
                                                                        onClick={() => alert(`Barkod Basılıyor: ${plant.sku || plant.id}`)}
                                                                        className="text-slate-700 font-bold text-[10px] bg-white hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-xl transition-all border border-slate-200 hover:border-orange-500 shadow-sm"
                                                                    >
                                                                        BARKOD
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedStock({ id: plant.id, name: plant.name, sku: plant.sku || plant.id, currentStock: plant.currentStock });
                                                                            setIsDonusumModalOpen(true);
                                                                        }}
                                                                        className="text-white font-bold text-[10px] bg-slate-900 hover:bg-orange-500 px-3 py-1.5 rounded-xl transition-all border border-transparent shadow-sm"
                                                                        title="Eski stoğu saksı boyutlarına göre yeni stoklara böl (Sayım Geçiş)"
                                                                    >
                                                                        DÖNÜŞÜM
                                                                    </button>
                                                                    <button
                                                                        onClick={() => fetchMovements((plant as any).plantId || plant.sku || plant.id, plant.name)}
                                                                        className="text-slate-700 font-bold text-[10px] bg-slate-100 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-orange-500"
                                                                    >
                                                                        HAREKET
                                                                    </button>
                                                                </>
                                                            )}
                                                            {isStockSupplierMode && (
                                                                <span className="text-xs text-slate-400 italic">Salt Okunur</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-slate-100">
                                {groupPlants.map((plant: any) => {
                                    const supplierName = (grouping === 'STOCK_SUPPLIER' || grouping === 'SUPPLIER')
                                        ? plant.supplierName
                                        : (companies.find(c => c.id === plant.supplierId)?.name || '-');
                                    const isStockSupplierMode = grouping === 'STOCK_SUPPLIER';
                                    const showSupplierStockColumns = grouping === 'STOCK_SUPPLIER' || grouping === 'SUPPLIER';

                                    return (
                                        <div key={plant.id} className="p-4">
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl mt-0.5">
                                                    {plant.type === 'MOTHER_TREE' ? '🌳' : plant.type === 'PACKAGING' ? '📦' : plant.type === 'RAW_MATERIAL' ? '🧱' : '🌱'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-700 text-sm truncate">
                                                        {plant.name}
                                                        {plant.turkishName && <span className="text-slate-500 font-medium ml-1 text-xs">({plant.turkishName})</span>}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase">
                                                            {plant.type === 'MOTHER_TREE' ? 'ANA AĞAÇ' : plant.type === 'PACKAGING' ? 'AMBALAJ' : plant.type === 'RAW_MATERIAL' ? 'HAMMADDE' : 'ÜRETİM'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-mono">{plant.sku || ''}</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                        {showSupplierStockColumns ? (
                                                            <>
                                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{plant.totalPurchased?.toLocaleString()} {plant.unit || 'Adet'}</span>
                                                                <span className="text-xs font-mono font-bold text-slate-700">₺{plant.lastPrice?.toLocaleString()}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${(plant.criticalStock ?? 0) > 0 && (plant.currentStock || 0) <= (plant.criticalStock ?? 0) ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
                                                                    Stok: {plant.currentStock ?? '-'}
                                                                </span>
                                                                {plant.wholesalePrice && <span className="text-[10px] text-slate-600">S:₺{plant.wholesalePrice.toLocaleString('tr-TR')}</span>}
                                                                {plant.purchasePrice && <span className="text-[10px] text-emerald-600">A:₺{plant.purchasePrice.toLocaleString('tr-TR')}</span>}
                                                            </>
                                                        )}
                                                    </div>

                                                    {grouping !== 'NONE' && (
                                                        <p className="text-[10px] text-slate-400 mt-1">Tedarikçi: {supplierName}</p>
                                                    )}

                                                    {!isStockSupplierMode && (
                                                        <div className="flex gap-2 mt-3">
                                                            <button onClick={() => alert(`Barkod Basılıyor: ${plant.sku || plant.id}`)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-black active:scale-95">BARKOD</button>
                                                            <button onClick={() => alert('Stok düzenleme FidanX içinde yapılmaz. Ana stok kartını Netsis tarafında güncelleyin.')} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded text-[10px] font-black active:scale-95">NETSIS</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {(!Array.isArray(plants) || (plants.length === 0 && !isLoading)) && (
                        <div className="py-24 text-center space-y-4">
                            <div className="text-4xl text-slate-200">
                                {error ? '📡' : '📭'}
                            </div>
                            <p className="text-slate-400 font-medium italic">
                                {error ? 'Veriler sunucu hatası nedeniyle gösterilemiyor.' : 'Henüz stok kaydı bulunmuyor.'}
                            </p>
                        </div>
                    )}
                    {isLoading && (
                        <div className="py-24 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 mt-4 font-bold text-[10px] uppercase tracking-widest">Veriler Yükleniyor...</p>
                        </div>
                    )}
                </div>


                {/* Movements Modal */}
                {isMovementsModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-none shadow-2xl w-full max-w-4xl p-0 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Stok Hareketleri</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedPlantName}</p>
                                </div>
                                <button onClick={() => setIsMovementsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl transition">×</button>
                            </div>

                            <div className="flex-1 overflow-auto p-0">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-transparent text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b-2 border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 bg-white">Tarih</th>
                                            <th className="px-6 py-4 bg-white">Belge No</th>
                                            <th className="px-6 py-4 bg-white">Açıklama</th>
                                            <th className="px-6 py-4 text-center bg-white">İşlem</th>
                                            <th className="px-6 py-4 text-right bg-white">Miktar</th>
                                            <th className="px-6 py-4 text-right bg-white">Fiyat</th>
                                            <th className="px-6 py-4 text-right bg-slate-50">Bakiye</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {movementsLoading ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center font-sans not-italic text-slate-500">
                                                    <span className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin align-middle mr-2" />
                                                    Hareketler yükleniyor…
                                                </td>
                                            </tr>
                                        ) : movements.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-[12px] text-slate-500 group-hover:text-orange-500 transition-colors">
                                                    {(m.Tarih || m.tarih) ? new Date(m.Tarih || m.tarih).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-800 text-[13px] group-hover:text-orange-600 transition-colors">{m.BelgeNo ?? m.belgeNo ?? '-'}</td>
                                                <td className="px-6 py-4 text-slate-600 font-bold group-hover:text-orange-500 transition-colors">{(m.Aciklama ?? m.aciklama) || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(m.GCKodu || m.gcKodu) === 'G' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {(m.GCKodu || m.gcKodu) === 'G' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                                        </span>
                                                        {(m.HareketTuru ?? m.hareketTuru) === 'E' && (
                                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Stok miktarını etkilemez; maliyet dağıtımında kullanılır (nakliye/işçilik)">
                                                                Nakliye
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 group-hover:text-orange-500 transition-colors text-[13px]">{(m.Miktar ?? m.miktar)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 group-hover:text-orange-500 transition-colors text-[13px]">{(m.BirimFiyat ?? m.birimFiyat ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-[11px] text-slate-400 font-medium ml-0.5">₺</span></td>
                                                <td className="px-6 py-4 text-right font-black bg-slate-50/50 text-slate-900 group-hover:bg-orange-50/50 group-hover:text-orange-600 transition-colors text-[14px]">{(m.Bakiye ?? m.bakiye)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                        {movements.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Hareket kaydı bulunamadı.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setIsMovementsModalOpen(false)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition shadow-lg active:scale-95">Kapat</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stok Dönüşüm Modalı */}
                <StokDonusumModal
                    isOpen={isDonusumModalOpen}
                    onClose={() => setIsDonusumModalOpen(false)}
                    selectedStock={selectedStock}
                    onComplete={() => {
                        setIsDonusumModalOpen(false);
                        fetchPlants();
                    }}
                />
            </main>
        </div>
    );
}

