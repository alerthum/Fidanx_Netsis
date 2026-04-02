"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

export default function HareketlerPage() {
    const [batches, setBatches] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [transferData, setTransferData] = useState({ targetLocation: '', note: '' });
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchBatches(), fetchSettings()]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const res = await fetch(`${API_URL}/production/batches?tenantId=demo-tenant`);
            if (res.ok) {
                const data = await res.json();
                setBatches(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Bacthes fetch error:', e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/tenants/demo-tenant`);
            if (res.ok) {
                const tenant = await res.json();
                if (Array.isArray(tenant.settings?.locations)) setLocations(tenant.settings.locations);
            }
        } catch (_) { }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBatch) return;

        try {
            const res = await fetch(`${API_URL}/production/batches/${selectedBatch.id}/transfer?tenantId=demo-tenant`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferData)
            });

            if (res.ok) {
                setIsTransferModalOpen(false);
                setSelectedBatch(null);
                setTransferData({ targetLocation: locations[0] || '', note: '' });
                fetchBatches();
            } else {
                alert('Transfer başarısız.');
            }
        } catch (err) {
            alert('Sunucu hatası.');
        }
    };

    const openTransferModal = (batch: any) => {
        setSelectedBatch(batch);
        setTransferData({ targetLocation: locations.filter(l => l !== batch.konum)[0] || locations[0] || '', note: '' });
        setIsTransferModalOpen(true);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Operasyon & Hareket</h1>
                        <p className="text-xs lg:text-sm text-slate-500">Üretim partilerinin konum transferleri ve hareket kayıtları.</p>
                    </div>
                </header>

                <div className="p-4 lg:p-8">
                    {/* Batches List regarding Location */}
                    <div className="space-y-6">
                        {locations.map(location => {
                            const locationBatches = batches.filter(b => {
                                if (b.konum) return b.konum === location;
                                const defaultLoc = (b.bitkiAdi?.toLowerCase().includes('viyol')) ? 'Sera 1' : 'Açık Alan';
                                return defaultLoc === location;
                            });

                            if (locationBatches.length === 0) return null;

                            return (
                                <div key={location} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg lg:text-xl">
                                                {location.includes('Sera') ? '🌡️' : location.includes('Depo') ? '📦' : '🚜'}
                                            </span>
                                            <h3 className="font-bold text-slate-700 text-sm lg:text-base">{location}</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] lg:text-xs font-bold">{locationBatches.length} Parti</span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {locationBatches.map(batch => (
                                            <div key={batch.id} className="p-4 lg:p-6 hover:bg-slate-50/50 transition flex flex-col sm:flex-row gap-3 lg:gap-4 justify-between items-start sm:items-center">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider">{batch.partiNo}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{batch.safha}</span>
                                                        {!batch.konum && (
                                                            <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-bold">OTOMATİK KONUM</span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-base">{batch.bitkiAdi || 'İsimsiz Ürün'}</h4>
                                                    <p className="text-xs text-slate-500">{batch.mevcutMiktar} Adet • {batch.baslangicTarihi ? new Date(batch.baslangicTarihi).toLocaleDateString('tr-TR') : '-'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="bg-white text-slate-500 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm active:scale-95 flex items-center gap-2"
                                                        onClick={() => window.location.href = `/uretim/${batch.id}`}
                                                    >
                                                        📋 Detay
                                                    </button>
                                                    <button
                                                        onClick={() => openTransferModal(batch)}
                                                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md hover:shadow-lg shadow-amber-500/30 hover:to-orange-600 transition active:scale-95 flex items-center gap-2"
                                                    >
                                                        🚚 Transfer Et
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {batches.length === 0 && !isLoading && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                                <div className="text-6xl mb-4 opacity-50">🚚</div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Hareket Kaydı Yok</h3>
                                <p className="text-slate-500">Henüz transfer edilecek bir üretim partisi bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transfer Modal */}
                {isTransferModalOpen && selectedBatch && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-slate-200 max-h-[95vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Konum Transferi</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                <span className="font-bold text-slate-700">{selectedBatch.partiNo}</span> numaralı parti <span className="font-bold text-slate-700">{selectedBatch.konum || 'Depo'}</span> konumundan taşınıyor.
                            </p>

                            <form onSubmit={handleTransfer} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Hedef Konum</label>
                                    <select
                                        value={transferData.targetLocation}
                                        onChange={(e) => setTransferData({ ...transferData, targetLocation: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 text-sm bg-slate-50/50"
                                    >
                                        {locations.filter(l => l !== selectedBatch.konum).map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Transfer Notu (Opsiyonel)</label>
                                    <textarea
                                        value={transferData.note}
                                        onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 text-sm bg-slate-50/50 resize-none h-24"
                                        placeholder="Örn: Güneşe çıkarıldı..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTransferModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition uppercase text-xs tracking-widest"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black shadow-lg shadow-amber-200 hover:bg-amber-600 transition active:scale-95 uppercase text-xs tracking-widest"
                                    >
                                        Transferi Onayla
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
