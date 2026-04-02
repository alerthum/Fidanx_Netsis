"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TabNavigation from '@/components/uretim/TabNavigation';
import PartilerTab from '@/components/uretim/PartilerTab';
import TopluIslemlerTab from '@/components/uretim/TopluIslemlerTab';
import SeraTab from '@/components/uretim/SeraTab';
import { ModalWrapper, Input, Label, Select, TransplantModal, SatisModal, FireModal, CostHistoryModal } from '@/components/uretim/Modals';
import MaliyetTab from '@/components/uretim/MaliyetTab';

export default function UretimPage() {
    const [activeTab, setActiveTab] = useState('partiler');
    const [batches, setBatches] = useState<any[]>([]);
    const [motherTrees, setMotherTrees] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);

    // UI States
    const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
    const [isTransplantModalOpen, setIsTransplantModalOpen] = useState(false);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [isSatisModalOpen, setIsSatisModalOpen] = useState(false);
    const [isFireModalOpen, setIsFireModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);

    const [newBatchForm, setNewBatchForm] = useState({
        netsisStokKodu: '',
        bitkiAdi: '',
        miktar: 0,
        birimMaliyet: 0,
        safha: 'TEPSİ',
        konum: '',
        faturaNo: ''
    });

    const API_URL = '/api';
    const tenantId = 'demo-tenant'; // Auth sonrası değişecek

    const stages = [
        { id: 'TEPSİ', name: 'Tepsi / Viyol' },
        { id: 'KÜÇÜK_SAKSI', name: 'Küçük Saksı (1-3L)' },
        { id: 'BÜYÜK_SAKSI', name: 'Büyük Saksı (5L+)' },
        { id: 'AÇIK_KÖKLÜ', name: 'Açık Köklü / Tarlada' },
        { id: 'SATIŞA_HAZIR', name: 'Satışa Hazır' },
    ];

    useEffect(() => {
        fetchData();
        fetchSettings();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_URL}/production/batches?tenantId=${tenantId}`);
            if (res.ok) {
                const d = await res.json().catch(() => []);
                setBatches(Array.isArray(d) ? d : []);
            }

            const plantRes = await fetch(`${API_URL}/netsis/stocks/list`);
            if (plantRes.ok) {
                const plants = await plantRes.json();
                setMotherTrees(Array.isArray(plants) ? plants : []);
            }

            const recRes = await fetch(`${API_URL}/recipes?tenantId=${tenantId}`);
            if (recRes.ok) {
                const recData = await recRes.json().catch(() => []);
                setRecipes(Array.isArray(recData) ? recData : []);
            }
        } catch (err) { console.error("Data fetch error", err); }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/tenants/${tenantId}`);
            if (res.ok) {
                const tenant = await res.json();
                if (Array.isArray(tenant.settings?.locations)) setLocations(tenant.settings.locations);
            }
        } catch (err) { console.error("Settings error", err); }
    };

    const handleCreateBatch = async () => {
        try {
            const st = motherTrees.find(m => m.StokKodu === newBatchForm.netsisStokKodu);
            const payload = {
                ...newBatchForm,
                bitkiAdi: st ? st.StokAdi : newBatchForm.bitkiAdi
            };

            const res = await fetch(`${API_URL}/production/batches?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsNewBatchModalOpen(false);
                setNewBatchForm({ netsisStokKodu: '', bitkiAdi: '', miktar: 0, birimMaliyet: 0, safha: 'TEPSİ', konum: '', faturaNo: '' });
                fetchData();
            } else { alert('Kayıt oluşturulurken hata oluştu.'); }
        } catch (err) { alert('Sistem hatası.'); }
    };

    const handleTransplant = async (form: any) => {
        if (!selectedBatch) return;
        try {
            const res = await fetch(`${API_URL}/production/batches/${selectedBatch.id}/sasirtma?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                if (form.recipeId) {
                    const recipe = recipes.find((r: any) => r.id == form.recipeId);
                    if (recipe?.items?.length) {
                        try {
                            await fetch(`${API_URL}/netsis/stocks/consumption`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    aciklama: `FidanX Şaşırtma: ${selectedBatch.bitkiAdi} - ${recipe.name}`,
                                    items: recipe.items.map((it: any) => ({
                                        stokKodu: it.materialCode,
                                        miktar: (it.amount || 0) * ((form.miktar || selectedBatch.mevcutMiktar) / 100),
                                        birimFiyat: it.unitPrice || 0
                                    }))
                                })
                            });
                        } catch { }
                    }
                }
                setIsTransplantModalOpen(false);
                fetchData();
            } else { alert('Şaşırtma hatası'); }
        } catch (err) { alert('Şaşırtma bağlantı hatası'); }
    };

    const handleSatis = async (form: any) => {
        if (!selectedBatch) return;
        try {
            const res = await fetch(`${API_URL}/production/batches/${selectedBatch.id}/satis?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                if (selectedBatch.netsisStokKodu && form.satisAdet > 0) {
                    try {
                        await fetch(`${API_URL}/netsis/stocks/consumption`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                aciklama: `FidanX Satış: ${selectedBatch.bitkiAdi} (${selectedBatch.partiNo})`,
                                items: [{
                                    stokKodu: selectedBatch.netsisStokKodu,
                                    miktar: form.satisAdet,
                                    birimFiyat: form.birimFiyat || 0
                                }]
                            })
                        });
                    } catch { }
                }
                setIsSatisModalOpen(false);
                fetchData();
            } else { alert('Satış hatası'); }
        } catch (err) { alert('Hata'); }
    }

    const handleFire = async (form: any) => {
        if (!selectedBatch) return;
        try {
            const res = await fetch(`${API_URL}/production/batches/${selectedBatch.id}/fire?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setIsFireModalOpen(false);
                fetchData();
            } else { alert('Fire hatası'); }
        } catch (err) { alert('Hata'); }
    }

    const openCostFetchAndShow = async (batch: any) => {
        try {
            const res = await fetch(`${API_URL}/production/batches/${batch.id}?tenantId=${tenantId}`);
            if (res.ok) {
                setSelectedBatch(await res.json());
                setIsCostModalOpen(true);
            }
        } catch (err) { alert('Maliyet verisi çekilemedi'); }
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-30 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Üretim Merkezi</h1>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-md tracking-wider">Maliyet Takibi</span>
                        </div>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium mt-1">Bitki bazlı tek stok kartı ve şaşırtılan parti dinamik takibi.</p>
                    </div>
                    {activeTab === 'partiler' && (
                        <button
                            onClick={() => setIsNewBatchModalOpen(true)}
                            className="bg-emerald-600 text-white px-5 lg:px-6 py-2.5 lg:py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300 hover:bg-emerald-700 active:translate-y-0 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                            <span className="text-xl leading-none">+</span> Yeni Üretime/Partiye Başla
                        </button>
                    )}
                </header>

                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

                <div className="flex-1 overflow-x-hidden">
                    {activeTab === 'partiler' && (
                        <PartilerTab
                            batches={batches}
                            openCostModal={openCostFetchAndShow}
                            openTransplantModal={(b: any) => { setSelectedBatch(b); setIsTransplantModalOpen(true); }}
                            openFireModal={(b: any) => { setSelectedBatch(b); setIsFireModalOpen(true); }}
                            openSatisModal={(b: any) => { setSelectedBatch(b); setIsSatisModalOpen(true); }}
                        />
                    )}
                    {activeTab === 'toplu' && <TopluIslemlerTab batches={batches} locations={locations} API_URL={API_URL} tenantId={tenantId} onRefresh={fetchData} />}
                    {activeTab === 'sera' && <SeraTab locations={locations} API_URL={API_URL} tenantId={tenantId} />}
                    {activeTab === 'maliyet' && <MaliyetTab batches={batches} />}
                </div>

                {/* --- Yeni Başlangıç Modalı --- */}
                <ModalWrapper
                    isOpen={isNewBatchModalOpen}
                    onClose={() => setIsNewBatchModalOpen(false)}
                    title="Yeni Üretim (Alım)"
                    subtitle="Tohum, Viyol veya Yeni Fidan Girişi"
                    icon="🌱"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Netsis Ürün Kartı</Label>
                            <Select value={newBatchForm.netsisStokKodu} onChange={e => setNewBatchForm({ ...newBatchForm, netsisStokKodu: e.target.value })} required>
                                <option value="">Stok Seçiniz...</option>
                                {motherTrees.map(m => <option key={m.StokKodu} value={m.StokKodu}>{m.StokAdi} ({m.StokKodu})</option>)}
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label>Manuel Ürün Adı (Seçili deği̇lse)</Label>
                            <Input placeholder="Örn: Mavi Ladin" value={newBatchForm.bitkiAdi} onChange={e => setNewBatchForm({ ...newBatchForm, bitkiAdi: e.target.value })} disabled={!!newBatchForm.netsisStokKodu} />
                        </div>
                        <div>
                            <Label>Miktar (Adet)</Label>
                            <Input type="number" min="1" value={newBatchForm.miktar || ''} onChange={e => setNewBatchForm({ ...newBatchForm, miktar: Number(e.target.value) })} />
                        </div>
                        <div>
                            <Label>Birim Alış Maliyeti (₺)</Label>
                            <Input type="number" min="0" value={newBatchForm.birimMaliyet || ''} onChange={e => setNewBatchForm({ ...newBatchForm, birimMaliyet: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <Label>Başlangıç Konumu / Sera</Label>
                                <Select value={newBatchForm.konum} onChange={e => setNewBatchForm({ ...newBatchForm, konum: e.target.value })}>
                                    <option value="">Seçiniz...</option>
                                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label>İlk Safha</Label>
                                <Select value={newBatchForm.safha} onChange={e => setNewBatchForm({ ...newBatchForm, safha: e.target.value })}>
                                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Select>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <Label>Alış Fatura No (Opsiyonel)</Label>
                            <Input placeholder="..." value={newBatchForm.faturaNo} onChange={e => setNewBatchForm({ ...newBatchForm, faturaNo: e.target.value })} />
                        </div>

                        <div className="col-span-2 mt-2 pt-4 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setIsNewBatchModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">İptal</button>
                            <button
                                onClick={handleCreateBatch}
                                disabled={!newBatchForm.netsisStokKodu && !newBatchForm.bitkiAdi}
                                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                Kaydet & Başlat
                            </button>
                        </div>
                    </div>
                </ModalWrapper>

                {/* Aksiyon Modalları */}
                <TransplantModal isOpen={isTransplantModalOpen} onClose={() => setIsTransplantModalOpen(false)} batch={selectedBatch} stages={stages} locations={locations} recipes={recipes} onSave={handleTransplant} />
                <SatisModal isOpen={isSatisModalOpen} onClose={() => setIsSatisModalOpen(false)} batch={selectedBatch} onSave={handleSatis} />
                <FireModal isOpen={isFireModalOpen} onClose={() => setIsFireModalOpen(false)} batch={selectedBatch} onSave={handleFire} />
                <CostHistoryModal isOpen={isCostModalOpen} onClose={() => setIsCostModalOpen(false)} batch={selectedBatch} />
            </main>
        </div>
    );
}
