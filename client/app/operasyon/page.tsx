"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

export default function OperationsPage() {
    const [activeTab, setActiveTab] = useState('app'); // 'app' | 'maintenance' | 'consumption'
    const [logs, setLogs] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<any>({
        locations: [],
        recipeId: '',
        expenseType: '',
        description: '',
        cost: 0,
        measurements: {},
        operationDate: new Date().toISOString().split('T')[0]
    });

    // Toplu Sarf Tab State
    const [consumptionItems, setConsumptionItems] = useState<Array<{ stokKodu: string; name: string; miktar: number; birimFiyat: number }>>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [materialAmount, setMaterialAmount] = useState(1);
    const [materialSearchQuery, setMaterialSearchQuery] = useState('');

    const API_URL = '/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const setRes = await fetch(`${API_URL}/tenants/demo-tenant`);
            if (setRes.ok) {
                const setData = await setRes.json().catch(() => ({}));
                if (setData.settings) setSettings(setData.settings);
            }

            const recRes = await fetch(`${API_URL}/recipes?tenantId=demo-tenant`);
            if (recRes.ok) {
                const recData = await recRes.json().catch(() => []);
                setRecipes(Array.isArray(recData) ? recData : []);
            }

            const stockRes = await fetch(`${API_URL}/netsis/stocks/list?tenantId=demo-tenant`);
            if (stockRes.ok) {
                const stockData = await stockRes.json().catch(() => []);
                setStocks(Array.isArray(stockData) ? stockData : []);
            }

            fetchLogs();
        } catch (err) { console.error(err); }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/activity?tenantId=demo-tenant`);
            if (res.ok) {
                const data = await res.json().catch(() => []);
                setLogs(Array.isArray(data) ? data : []);
            }
        } catch (err) { console.error(err); }
    };

    const handleLocationToggle = (loc: string) => {
        const current = formData.locations || [];
        if (current.includes(loc)) {
            setFormData({ ...formData, locations: current.filter((l: string) => l !== loc) });
        } else {
            setFormData({ ...formData, locations: [...current, loc] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        let title = '';
        let icon = '';
        let color = '';
        let details = '';

        if (activeTab === 'app') {
            const recipe = recipes.find(r => r.id === formData.recipeId);
            title = recipe ? `Uygulama: ${recipe.name}` : 'Reçetesiz Uygulama';
            icon = '💧';
            color = 'bg-blue-50 text-blue-600 border-blue-200';
            details = `Kullanılan Reçete: ${recipe?.name || '-'}`;
        } else if (activeTab === 'maintenance') {
            title = `Bakım: ${formData.expenseType || 'Genel'}`;
            icon = '🚜';
            color = 'bg-amber-50 text-amber-600 border-amber-200';
            details = formData.description;
        }

        const selectedRecipe = activeTab === 'app' ? recipes.find(r => r.id === formData.recipeId) : null;
        const recipeCost = selectedRecipe?.totalCost || 0;
        const totalCost = (parseFloat(formData.cost) || 0) + recipeCost;

        const payload = {
            action: activeTab.toUpperCase(),
            title,
            icon,
            color,
            details: details + (selectedRecipe ? ` | Reçete Maliyeti: ₺${recipeCost}` : ''),
            locations: formData.locations,
            cost: totalCost,
            recipeId: formData.recipeId || null,
            userDate: formData.operationDate || null
        };

        try {
            const res = await fetch(`${API_URL}/activity?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (selectedRecipe?.items?.length) {
                    try {
                        await fetch(`${API_URL}/netsis/stocks/consumption`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                aciklama: `FidanX Operasyon: ${selectedRecipe.name} (${formData.locations.join(', ')})`,
                                tarih: formData.operationDate,
                                items: selectedRecipe.items.map((it: any) => ({
                                    stokKodu: it.materialCode,
                                    miktar: it.amount || 0,
                                    birimFiyat: it.unitPrice || 0
                                }))
                            })
                        });
                    } catch { }
                }
                setFormData({ locations: [], recipeId: '', expenseType: '', description: '', cost: 0, measurements: {}, operationDate: new Date().toISOString().split('T')[0] });
                fetchLogs();
            } else {
                alert('Hata oluştu.');
            }
        } catch (err) {
            alert('Sunucu hatası.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkConsumptionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.locations || formData.locations.length === 0) {
            return alert('Lütfen en az bir sera veya konum seçin.');
        }
        if (consumptionItems.length === 0) {
            return alert('Lütfen en az bir tüketilecek malzeme kalemi ekleyin.');
        }

        setIsLoading(true);

        const payload = {
            locations: formData.locations,
            items: consumptionItems.map(it => ({
                stokKodu: it.stokKodu,
                miktar: it.miktar,
                birimFiyat: it.birimFiyat
            })),
            aciklama: formData.description || 'Toplu Gübreleme/İlaçlama Malzeme Tüketimi',
            tarih: formData.operationDate
        };

        try {
            const res = await fetch(`${API_URL}/production/bulk-consumption?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Toplu Sarf Fişi başarıyla kesildi.\nNetsis Fiş No: ${data.fisNo}\nToplam Tutar: ₺${data.totalCost.toLocaleString('tr-TR')}\nEtkilenen Parti Sayısı: ${data.processedBatches}`);
                
                // Clear state
                setConsumptionItems([]);
                setFormData({ 
                    locations: [], 
                    recipeId: '', 
                    expenseType: '', 
                    description: '', 
                    cost: 0, 
                    measurements: {}, 
                    operationDate: new Date().toISOString().split('T')[0] 
                });
                fetchLogs();
            } else {
                const errText = await res.text();
                alert('Tüketim kaydedilirken hata oluştu: ' + errText);
            }
        } catch (err) {
            alert('Sunucu bağlantı hatası.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 sticky top-0 z-30 shadow-sm">
                    <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Günlük Bahçe İşleri & Operasyon</h1>
                    <p className="text-xs lg:text-sm text-slate-500 font-medium">Sera ve bahçelerde yapılan işlemleri kayıt altına alın.</p>
                </header>

                <div className="p-4 lg:p-8 grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-8">
                    {/* LEFT COLUMN: ACTION FORM */}
                    <div className="xl:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="flex border-b border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('app')}
                                    className={`flex-1 py-3 lg:py-4 text-xs font-black uppercase tracking-widest transition ${activeTab === 'app' ? 'bg-blue-50 text-blue-600 font-extrabold border-b-2 border-blue-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    💧 Reçete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('maintenance')}
                                    className={`flex-1 py-3 lg:py-4 text-xs font-black uppercase tracking-widest transition ${activeTab === 'maintenance' ? 'bg-amber-50 text-amber-600 font-extrabold border-b-2 border-amber-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    🚜 Gider
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('consumption')}
                                    className={`flex-1 py-3 lg:py-4 text-xs font-black uppercase tracking-widest transition ${activeTab === 'consumption' ? 'bg-rose-50 text-rose-600 font-extrabold border-b-2 border-rose-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    📦 Toplu Sarf
                                </button>
                            </div>

                            <div className="p-4 lg:p-6">
                                <form onSubmit={activeTab === 'consumption' ? handleBulkConsumptionSubmit : handleSubmit} className="space-y-5 lg:space-y-6">

                                    {/* DATE PICKER */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 lg:mb-3">📅 İşlem Tarihi</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-sm font-bold bg-slate-50"
                                            value={formData.operationDate}
                                            onChange={e => setFormData({ ...formData, operationDate: e.target.value })}
                                        />
                                    </div>

                                    {/* LOCATION SELECTOR */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 lg:mb-3">Uygulama Konumu (Çoklu Seçim)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(settings.locations || ['Sera 1', 'Sera 2', 'Açık Alan']).map((loc: string) => (
                                                <button
                                                    type="button"
                                                    key={loc}
                                                    onClick={() => handleLocationToggle(loc)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${formData.locations.includes(loc) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    {formData.locations.includes(loc) && '✓ '} {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CONDITIONAL FIELDS */}
                                    {activeTab === 'app' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reçete / Karışım Seçin</label>
                                            <select
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm bg-slate-50 font-medium"
                                                value={formData.recipeId}
                                                onChange={e => setFormData({ ...formData, recipeId: e.target.value })}
                                            >
                                                <option value="">Seçiniz...</option>
                                                {Array.isArray(recipes) && recipes.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            {formData.recipeId && (() => {
                                                const rec = recipes.find(r => r.id === formData.recipeId);
                                                return rec ? (
                                                    <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs space-y-1">
                                                        <div className="flex justify-between font-bold text-blue-700">
                                                            <span>Reçete Maliyeti:</span>
                                                            <span>₺{(rec.totalCost || 0).toLocaleString('tr-TR')}</span>
                                                        </div>
                                                        {rec.items?.slice(0, 3).map((i: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-blue-500">
                                                                <span>{i.materialName}</span>
                                                                <span>{i.amount} {i.unit}</span>
                                                            </div>
                                                        ))}
                                                        {(rec.items?.length || 0) > 3 && <p className="text-blue-400 text-center">+{rec.items.length - 3} kalem daha</p>}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}

                                    {activeTab === 'maintenance' && (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">İşlem Tipi / Gider Kalemi</label>
                                                <select
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 text-sm bg-slate-50 font-medium"
                                                    value={formData.expenseType}
                                                    onChange={e => setFormData({ ...formData, expenseType: e.target.value })}
                                                >
                                                    <option value="">Seçiniz...</option>
                                                    {(settings.expenseTypes || ['İşçilik', 'Enerji']).map((t: string) => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Açıklama</label>
                                                <textarea
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 text-sm"
                                                    rows={3}
                                                    placeholder="Yapılan işlem detayları..."
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'consumption' && (
                                        <div className="space-y-4 border-t border-slate-100 pt-4">
                                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-medium">
                                                ℹ️ <strong>Toplu Sarf Fişi:</strong> Seçtiğiniz konumlardaki <strong>tüm aktif bitki partilerine</strong>, eklediğiniz malzemelerin toplam tutarı otomatik olarak mevcut miktarları oranında dağıtılır ve Netsis'te Sarf Fişi kesilir.
                                            </div>

                                            {/* Malzeme Arama & Ekleme */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">📦 Malzeme Ekle</span>
                                                
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Malzeme adı veya kodu ara..."
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-rose-500 font-bold bg-white"
                                                        value={materialSearchQuery}
                                                        onChange={e => setMaterialSearchQuery(e.target.value)}
                                                    />
                                                    
                                                    {materialSearchQuery.trim() && (
                                                        <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 text-xs shadow-md">
                                                            {stocks
                                                                .filter(s => 
                                                                    (s.STOK_ADI || '').toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
                                                                    (s.STOK_KODU || '').toLowerCase().includes(materialSearchQuery.toLowerCase())
                                                                )
                                                                .slice(0, 5)
                                                                .map(s => (
                                                                    <button
                                                                        type="button"
                                                                        key={s.STOK_KODU}
                                                                        onClick={() => {
                                                                            setSelectedMaterialId(s.STOK_KODU);
                                                                            setMaterialSearchQuery('');
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left hover:bg-rose-50/50 flex flex-col transition"
                                                                    >
                                                                        <span className="font-bold text-slate-700">{s.STOK_ADI}</span>
                                                                        <span className="text-[10px] text-slate-400">{s.STOK_KODU} (Maliyet: ₺{s.BIRIM_MALIYET || s.BIRIM_FIYAT || s.STHAR_NF || 0})</span>
                                                                    </button>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedMaterialId && (() => {
                                                    const mat = stocks.find(s => s.STOK_KODU === selectedMaterialId);
                                                    if (!mat) return null;
                                                    return (
                                                        <div className="space-y-3 pt-2 border-t border-slate-200">
                                                            <div className="text-xs bg-white p-2 rounded border border-slate-200">
                                                                <p className="font-bold text-slate-700">{mat.STOK_ADI}</p>
                                                                <p className="text-[10px] text-slate-400">{mat.STOK_KODU}</p>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Miktar</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="any"
                                                                        className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs font-bold"
                                                                        value={materialAmount}
                                                                        onChange={e => setMaterialAmount(parseFloat(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Birim Fiyat (₺)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs font-bold"
                                                                        defaultValue={mat.BIRIM_MALIYET || mat.BIRIM_FIYAT || mat.STHAR_NF || 0}
                                                                        id="bulk_unit_price"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const priceInput = document.getElementById('bulk_unit_price') as HTMLInputElement;
                                                                    const price = priceInput ? parseFloat(priceInput.value) || 0 : (mat.BIRIM_MALIYET || mat.BIRIM_FIYAT || mat.STHAR_NF || 0);
                                                                    
                                                                    if (materialAmount <= 0) return alert('Miktar sıfırdan büyük olmalıdır.');
                                                                    
                                                                    // Check if already in list
                                                                    const existing = consumptionItems.find(it => it.stokKodu === mat.STOK_KODU);
                                                                    if (existing) {
                                                                        setConsumptionItems(consumptionItems.map(it => 
                                                                            it.stokKodu === mat.STOK_KODU ? { ...it, miktar: it.miktar + materialAmount } : it
                                                                        ));
                                                                    } else {
                                                                        setConsumptionItems([...consumptionItems, {
                                                                            stokKodu: mat.STOK_KODU,
                                                                            name: mat.STOK_ADI,
                                                                            miktar: materialAmount,
                                                                            birimFiyat: price
                                                                        }]);
                                                                    }
                                                                    
                                                                    setSelectedMaterialId('');
                                                                    setMaterialAmount(1);
                                                                }}
                                                                className="w-full bg-slate-800 text-white text-xs py-2 rounded-lg font-bold hover:bg-slate-700 transition"
                                                            >
                                                                + Listeye Ekle
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Tüketim Listesi */}
                                            {consumptionItems.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tüketilecek Malzemeler</label>
                                                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                                                        {consumptionItems.map((it, idx) => (
                                                            <div key={idx} className="p-3 flex justify-between items-center text-xs">
                                                                <div className="min-w-0 pr-2">
                                                                    <p className="font-bold text-slate-700 truncate">{it.name}</p>
                                                                    <p className="text-[10px] text-slate-400">{it.stokKodu} • {it.miktar} adet x ₺{it.birimFiyat.toLocaleString('tr-TR')}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-bold text-rose-600">₺{(it.miktar * it.birimFiyat).toLocaleString('tr-TR')}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setConsumptionItems(consumptionItems.filter((_, i) => i !== idx))}
                                                                        className="text-slate-400 hover:text-red-500 transition p-1"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                                        <span className="text-xs font-black text-rose-800 uppercase tracking-wide">Toplam Maliyet:</span>
                                                        <span className="text-sm font-black text-rose-800">
                                                            ₺{consumptionItems.reduce((sum, it) => sum + (it.miktar * it.birimFiyat), 0).toLocaleString('tr-TR')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">İşlem Açıklaması</label>
                                                <textarea
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-rose-500 text-sm bg-slate-50"
                                                    rows={3}
                                                    placeholder="Örn: Sera 1 genel gübreleme ve mineral sarfiyatı..."
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab !== 'consumption' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ek Maliyet (TL)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-500 text-sm font-bold"
                                                placeholder="0.00"
                                                value={formData.cost || ''}
                                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-xl font-bold shadow-lg text-white transition active:scale-95 text-base lg:text-lg uppercase tracking-wide
                                            ${activeTab === 'app' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                                              activeTab === 'maintenance' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
                                              'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
                                    >
                                        {isLoading ? 'Kaydediliyor...' : activeTab === 'consumption' ? 'Netsis & FidanX Sarfı Gerçekleştir' : 'İşlemi Kaydet'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]">
                            <div className="p-4 lg:p-6 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-bold text-slate-700">Son İşlem Kayıtları</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0">
                                {logs.length === 0 ? (
                                    <div className="p-10 text-center text-slate-400 italic">Henüz kayıt bulunamadı.</div>
                                ) : (
                                    <>
                                        {/* Desktop Table - hidden on mobile */}
                                        <table className="hidden lg:table w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-4">Tarih</th>
                                                    <th className="px-6 py-4">İşlem</th>
                                                    <th className="px-6 py-4">Konum</th>
                                                    <th className="px-6 py-4">Detay</th>
                                                    <th className="px-6 py-4 text-right">Maliyet</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {logs.map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                                                            {new Date(log.date || log.timestamp).toLocaleString('tr-TR')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${log.color || 'bg-slate-100'}`}>
                                                                    {log.icon || '📝'}
                                                                </span>
                                                                <span className="font-bold text-slate-700">{log.title}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {log.locations?.map((l: string) => (
                                                                <span key={l} className="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded mr-1 font-bold">{l}</span>
                                                            ))}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                                            {log.recipeName && <span className="inline-block bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded font-bold mr-2">{log.recipeName}</span>}
                                                            {log.details || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                            {log.cost ? `${log.cost} ₺` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Mobile Card View */}
                                        <div className="lg:hidden divide-y divide-slate-100">
                                            {logs.map(log => (
                                                <div key={log.id} className="p-4 hover:bg-slate-50/80 transition">
                                                    <div className="flex items-start gap-3">
                                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${log.color || 'bg-slate-100'}`}>
                                                            {log.icon || '📝'}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-slate-700 text-sm">{log.title}</p>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                                {new Date(log.date || log.timestamp).toLocaleString('tr-TR')}
                                                            </p>
                                                            {log.details && (
                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{log.details}</p>
                                                            )}
                                                            <div className="flex items-center justify-between mt-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {log.locations?.map((l: string) => (
                                                                        <span key={l} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold">{l}</span>
                                                                    ))}
                                                                </div>
                                                                {log.cost && (
                                                                    <span className="font-bold text-emerald-600 text-sm">{log.cost} ₺</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
