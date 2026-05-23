"use client";
import React, { useState, useEffect } from 'react';
import { ModalWrapper, Label, Input, Select } from './Modals';

export default function LokasyonlarTab({ API_URL, tenantId }: { API_URL: string, tenantId: string }) {
    const [locations, setLocations] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [form, setForm] = useState({
        lokasyonKodu: '',
        lokasyonAdi: '',
        lokasyonTipi: 'SERA',
        kapasite: 0,
        notlar: ''
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/production/locations?tenantId=${tenantId}`);
            if (res.ok) setLocations(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInventory = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}/production/locations/${id}/inventory?tenantId=${tenantId}`);
            if (res.ok) {
                setInventory(await res.json());
                setIsInventoryModalOpen(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/production/locations?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setIsLocationModalOpen(false);
                setForm({ lokasyonKodu: '', lokasyonAdi: '', lokasyonTipi: 'SERA', kapasite: 0, notlar: '' });
                fetchLocations();
            } else {
                alert('Kaydedilemedi');
            }
        } catch (err) {
            alert('Sunucu hatası');
        }
    };

    return (
        <div className="p-4 lg:p-8 animate-fade-in max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Lokasyon & Karekod Yönetimi</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Seralar, açık alanlar ve sabit QR barkod atamaları.</p>
                </div>
                <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="bg-indigo-600 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all text-sm w-full sm:w-auto"
                >
                    + Yeni Lokasyon Ekle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading && <div className="col-span-full py-12 text-center text-slate-400 font-medium">Yükleniyor...</div>}
                
                {!isLoading && locations.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                        Henüz tanımlanmış bir lokasyon bulunmuyor.
                    </div>
                )}

                {locations.map(loc => (
                    <div key={loc.Id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        <div className={`h-2 ${loc.LokasyonTipi === 'SERA' ? 'bg-orange-400' : loc.LokasyonTipi === 'ACIK_BAHCE' ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight">{loc.LokasyonAdi}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{loc.LokasyonKodu}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                    loc.LokasyonTipi === 'SERA' ? 'bg-orange-50 text-orange-600' : 
                                    loc.LokasyonTipi === 'ACIK_BAHCE' ? 'bg-emerald-50 text-emerald-600' : 
                                    'bg-slate-50 text-slate-600'
                                }`}>
                                    {loc.LokasyonTipi.replace('_', ' ')}
                                </span>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex-1">
                                <p className="text-xs text-slate-500 font-medium mb-2">QR / Barkod Kodu:</p>
                                <p className="font-mono text-[10px] sm:text-xs font-black text-slate-700 bg-white border border-slate-200 p-2 rounded-lg break-all">
                                    {loc.QRKodu}
                                </p>
                            </div>

                            <div className="flex justify-between items-center text-xs mt-auto">
                                <span className="font-medium text-slate-500">
                                    Kapasite: <span className="font-bold text-slate-800">{loc.Kapasite > 0 ? loc.Kapasite : 'Sınırsız'}</span>
                                </span>
                                <button 
                                    onClick={() => { setSelectedLocation(loc); fetchInventory(loc.Id); }}
                                    className="text-indigo-600 font-black hover:underline"
                                >
                                    İçeriği Gör →
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Yeni Lokasyon Ekle Modalı */}
            <ModalWrapper isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} title="Yeni Lokasyon Ekle" icon="📍">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Lokasyon Kodu</Label>
                            <Input value={form.lokasyonKodu} onChange={e => setForm({...form, lokasyonKodu: e.target.value})} placeholder="Örn: SERA-01" required />
                        </div>
                        <div>
                            <Label>Lokasyon Adı</Label>
                            <Input value={form.lokasyonAdi} onChange={e => setForm({...form, lokasyonAdi: e.target.value})} placeholder="Örn: 1 Nolu Sera" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tip</Label>
                            <Select value={form.lokasyonTipi} onChange={e => setForm({...form, lokasyonTipi: e.target.value})} required>
                                <option value="SERA">Sera</option>
                                <option value="ACIK_BAHCE">Açık Bahçe</option>
                                <option value="KAPALI_BAHCE">Kapalı Bahçe</option>
                                <option value="DEPO">Depo</option>
                                <option value="TARLA">Tarla</option>
                            </Select>
                        </div>
                        <div>
                            <Label>Kapasite (0 = Sınırsız)</Label>
                            <Input type="number" min={0} value={form.kapasite} onChange={e => setForm({...form, kapasite: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <Label>Notlar</Label>
                        <Input value={form.notlar} onChange={e => setForm({...form, notlar: e.target.value})} placeholder="..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsLocationModalOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">İptal</button>
                        <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Kaydet</button>
                    </div>
                </form>
            </ModalWrapper>

            {/* İçerik Gösterim Modalı */}
            <ModalWrapper isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} title={`${selectedLocation?.LokasyonAdi} Envanteri`} icon="📦">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Bitki Adı</th>
                                <th className="px-4 py-2">Stok Kodu</th>
                                <th className="px-4 py-2">Parti No</th>
                                <th className="px-4 py-2">Miktar</th>
                                <th className="px-4 py-2">Yerleşme</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {inventory.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Bu lokasyonda bitki bulunmuyor.</td></tr>
                            )}
                            {inventory.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-bold text-slate-700">{inv.BitkiAdi} <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-500 ml-1">{inv.Safha}</span></td>
                                    <td className="px-4 py-2 font-mono text-xs">{inv.NetsisStokKodu}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-indigo-600 font-bold">{inv.PartiNo}</td>
                                    <td className="px-4 py-2 font-bold text-slate-800">{inv.Miktar.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(inv.YerlestirmeTarihi).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={() => setIsInventoryModalOpen(false)} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-sm">Kapat</button>
                </div>
            </ModalWrapper>
        </div>
    );
}
