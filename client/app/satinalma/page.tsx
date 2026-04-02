"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';
import LoadingScreen from '@/components/LoadingScreen';
import { ModalWrapper } from '@/components/uretim/Modals';

export default function SatinalmaPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>(['MERKEZ DEPO', 'SERA-1', 'SERA-2', 'YOLDA']);
    const [selectedInvoiceTab, setSelectedInvoiceTab] = useState('TÜMÜ');
    const [selectedCategory, setSelectedCategory] = useState('TÜMÜ');
    const [productSearchQuery, setProductSearchQuery] = useState('');

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<any>(null);

    const [newOrder, setNewOrder] = useState({
        id: '',
        supplier: '',
        supplierId: '',
        description: '',
        status: 'Bekliyor',
        category: '150-01',
        targetLocation: 'MERKEZ DEPO',
        items: [] as any[]
    });

    const [tempItem, setTempItem] = useState({
        materialId: '',
        amount: 1,
        unitPrice: 0
    });

    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    const API_URL = '/api';

    const [invoiceTabLabels, setInvoiceTabLabels] = useState<any[]>([
        { id: 'TÜMÜ', label: 'TÜMÜ' },
        { id: '150-01', label: 'İLK MADDE (150-01)' },
        { id: '150-02', label: 'YARDIMCI (150-02)' },
        { id: '150-03', label: 'AMBALAJ (150-03)' },
        { id: 'HIZ', label: 'HIZMET (HIZ)' }
    ]);

    const categories = useMemo(() => {
        return ['TÜMÜ', ...Array.from(new Set(stocks.map(s => s.category).filter(Boolean)))];
    }, [stocks]);

    useEffect(() => {
        fetchData();
    }, []);

    const safeFetch = async (url: string, timeoutMs = 15000): Promise<Response> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const [ordersRes, customersRes, stocksRes, tabsRes] = await Promise.allSettled([
                safeFetch(`${API_URL}/netsis/invoices?faturaTuru=2&pageSize=500`),
                safeFetch(`${API_URL}/netsis/customers`),
                safeFetch(`${API_URL}/netsis/stocks/list`),
                safeFetch(`${API_URL}/netsis/invoices/tab-categories`)
            ]);

            const errors: string[] = [];

            if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
                const data = await ordersRes.value.json().catch(() => ({ items: [] }));
                const mappedOrders = (Array.isArray(data.items) ? data.items : []).map((o: any) => ({
                    id: o.BelgeNo,
                    supplier: o.CariAdi,
                    supplierId: o.CariKodu,
                    orderDate: o.Tarih,
                    category: o.Kategori,
                    status: 'Bekliyor',
                    description: o.Aciklama,
                    totalAmount: o.ToplamTutar,
                    KalemSayisi: o.KalemSayisi
                }));
                setOrders(mappedOrders);
            } else {
                errors.push('Faturalar yüklenemedi');
            }

            if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
                const data = await customersRes.value.json().catch(() => []);
                const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
                const filtered = arr.filter((c: any) => (c.id || c.CariKodu)?.startsWith('320'));
                setCustomers(filtered.map((c: any) => ({
                    id: c.CariKodu || c.id,
                    name: c.CariAdi || c.name
                })));
            }

            if (stocksRes.status === 'fulfilled' && stocksRes.value.ok) {
                const data = await stocksRes.value.json().catch(() => []);
                const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
                const mappedStocks = arr.map((s: any) => ({
                    id: s.StokKodu || s.id,
                    name: s.StokAdi || s.name,
                    category: s.category || s.Tip || 'DİĞER',
                    currentStock: s.Bakiye || 0,
                    purchasePrice: s.purchasePrice || s.SonBirimFiyat || 0,
                    unit: s.Birim || 'Adet'
                }));
                setStocks(mappedStocks);
            }

            if (tabsRes.status === 'fulfilled' && tabsRes.value.ok) {
                const data = await tabsRes.value.json().catch(() => []);
                if (Array.isArray(data) && data.length > 0) {
                    const sorted = data.sort((a: any, b: any) => a.id === 'TÜMÜ' ? -1 : b.id === 'TÜMÜ' ? 1 : 0);
                    setInvoiceTabLabels(sorted);
                }
            }

            if (errors.length > 0) {
                setFetchError(errors.join('. ') + '. API sunucusuna erişilemiyor olabilir.');
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setFetchError('Veriler yüklenirken hata oluştu. API sunucusuna bağlantı kontrol edin.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInvoiceDetails = async (faturaNo: string, cariKod: string) => {
        try {
            const res = await fetch(`${API_URL}/netsis/invoices/${faturaNo}/details?faturaTuru=2&cariKodu=${cariKod}`);
            if (res.ok) {
                const data = await res.json();
                setNewOrder(prev => ({ ...prev, items: data }));
                return data;
            }
        } catch (err) {
            console.error("Details fetch error:", err);
        }
        return [];
    };

    const handleCreateOrder = async () => {
        if (!newOrder.supplierId || newOrder.items.length === 0) {
            alert("Lütfen tedarikçi seçin ve en az bir kalem ekleyin.");
            return;
        }

        try {
            const method = newOrder.id ? 'PUT' : 'POST';
            const url = newOrder.id ? `${API_URL}/netsis/invoices/${newOrder.id}` : `${API_URL}/netsis/invoices`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faturaTuru: 2,
                    cariKod: newOrder.supplierId,
                    faturaNo: newOrder.id || newOrder.description,
                    tarih: new Date().toISOString(),
                    kalemler: newOrder.items.map(item => ({
                        stokKodu: item.materialId || item.StokKodu,
                        miktar: item.amount || item.Miktar,
                        fiyat: item.unitPrice || item.BirimFiyat,
                        KdvOrani: 20
                    }))
                })
            });

            if (res.ok) {
                setIsOrderModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                alert("Hata: " + (err.message || 'Fatura kaydedilemedi'));
            }
        } catch (err) {
            alert("Sistem hatası");
        }
    };

    const addItemToOrder = () => {
        const item = stocks.find(s => s.id === tempItem.materialId);
        if (!item) return;

        const newItem = {
            materialId: item.id,
            name: item.name,
            unit: item.unit || 'Adet',
            amount: tempItem.amount,
            unitPrice: tempItem.unitPrice
        };

        if (editingItemIndex !== null) {
            const updatedItems = [...newOrder.items];
            updatedItems[editingItemIndex] = newItem;
            setNewOrder({ ...newOrder, items: updatedItems });
            setEditingItemIndex(null);
        } else {
            setNewOrder({ ...newOrder, items: [...newOrder.items, newItem] });
        }
        setIsItemModalOpen(false);
        setTempItem({ materialId: '', amount: 1, unitPrice: 0 });
    };

    if (isLoading) return <LoadingScreen message="Satınalma Yükleniyor..." />;

    return (
        <div className="flex flex-col lg:flex-row min-h-screen fx-page font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="fx-card !rounded-none !border-0 !border-b fx-border px-4 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-30 gap-4">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold fx-text-primary">Satınalma</h1>
                        <p className="text-xs lg:text-sm fx-text-secondary font-medium">Alış faturaları ve tedarikçi yönetimi.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <ExportButton title="Alis_Faturalari" tableId="purchase-table" />
                        <button
                            onClick={() => {
                                setNewOrder({
                                    id: '', supplier: '', supplierId: '', description: '',
                                    status: 'Bekliyor', category: '150-01', targetLocation: 'MERKEZ DEPO', items: []
                                });
                                setIsOrderModalOpen(true);
                            }}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-xl transition active:scale-95"
                        >
                            + Yeni Fatura
                        </button>
                    </div>
                </header>

                <div className="px-4 lg:px-8 mt-6 overflow-x-auto">
                    <div className="flex fx-card !p-1 !rounded-xl w-fit gap-1">
                        {invoiceTabLabels.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedInvoiceTab(tab.id)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition whitespace-nowrap ${selectedInvoiceTab === tab.id ? 'bg-[var(--fx-accent)] text-white shadow-md' : 'fx-text-secondary hover:bg-[var(--fx-sidebar-hover)]'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 lg:p-8">
                    {fetchError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="font-bold">Veri yükleme hatası</p>
                                <p className="text-xs mt-1">{fetchError}</p>
                            </div>
                            <button onClick={fetchData} className="ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-bold transition">Tekrar Dene</button>
                        </div>
                    )}
                    <div className="fx-card !p-0 overflow-hidden">
                        <table className="w-full text-left border-collapse" id="purchase-table">
                            <thead className="bg-[var(--fx-sidebar-hover)] fx-text-secondary uppercase text-[10px] font-black border-b fx-border">
                                <tr>
                                    <th className="px-6 py-4">Tedarikçi Ünvanı</th>
                                    <th className="px-6 py-4">Belge No</th>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4">İçerik</th>
                                    <th className="px-6 py-4 text-right">Toplam Tutar</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {orders.filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab).length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            <div className="text-4xl mb-3">📋</div>
                                            <p className="font-bold text-slate-500">Bu kategoride fatura bulunamadı</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {orders.length === 0 ? 'Netsis veritabanından henüz fatura verisi alınamadı.' : `Toplam ${orders.length} fatura var, seçili sekme için sonuç yok.`}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                                {orders
                                    .filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab)
                                    .map((order, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-4 font-bold text-slate-700">{order.supplier}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{order.id}</td>
                                            <td className="px-6 py-4 text-slate-500">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded text-[10px] uppercase font-black bg-slate-100 text-slate-600 border border-slate-200">
                                                    {order.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {order.KalemSayisi > 0 ? `${order.KalemSayisi} Kalem` : 'Kalem yok'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-800">
                                                ₺{order.totalAmount?.toLocaleString() || '0'}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => { setNewOrder({ ...order, items: [] }); fetchInvoiceDetails(order.id, order.supplierId); setIsOrderModalOpen(true); }} className="text-blue-600 font-bold text-[10px] uppercase bg-blue-50 px-3 py-1.5 rounded-lg">Düzenle</button>
                                                <button onClick={async () => { const items = await fetchInvoiceDetails(order.id, order.supplierId); setPreviewInvoice({ ...order, items }); setIsPreviewModalOpen(true); }} className="text-slate-600 font-bold text-[10px] uppercase bg-slate-100 px-3 py-1.5 rounded-lg">Önizleme</button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODALS */}
                <ModalWrapper
                    isOpen={isOrderModalOpen}
                    onClose={() => setIsOrderModalOpen(false)}
                    title={newOrder.id ? "Faturayı Düzenle" : "Yeni Alış Fatürası"}
                    subtitle={newOrder.id ? `${newOrder.id} • ${newOrder.supplier}` : "Tedarikçiden gelen faturayı sisteme işleyin"}
                    icon="🧾"
                    large
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="fx-card !p-8 !rounded-3xl">
                                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">Genel Bilgiler</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tedarikçi Seçimi</label>
                                        <select
                                            value={newOrder.supplierId}
                                            onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                                            disabled={!!newOrder.id}
                                            className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all rounded-2xl font-bold text-sm outline-none"
                                        >
                                            <option value="">Tedarikçi Seçiniz...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Fatura / Belge No</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: ABC2024000001"
                                            value={newOrder.description}
                                            onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all rounded-2xl font-bold text-sm outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="fx-card !p-8 !rounded-3xl">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl">🛒</div>
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Fatura İçeriği (Kalemler)</h4>
                                    </div>
                                    <button
                                        onClick={() => setIsItemModalOpen(true)}
                                        className="bg-[#4f46e5] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        + Kalem Ekle
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {newOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">
                                                    📦
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm tracking-tight">{item.name || item.StokAdi}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                        {item.amount || item.Miktar} {item.unit || item.Birim} x
                                                        <span className="text-indigo-500 ml-1">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <p className="font-mono font-black text-slate-900 text-xl tracking-tighter">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString()}</p>
                                                <button
                                                    onClick={() => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {newOrder.items.length === 0 && (
                                        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                            <div className="text-4xl mb-3 grayscale opacity-30">📋</div>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Henüz kalem eklenmedi</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="fx-card bg-slate-900 border-0 text-white p-10 !rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl -rotate-12">💰</div>
                                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-10 text-center relative z-10">FİNANSAL ÖZET</h4>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Ara Toplam</span>
                                        <span className="font-mono text-white text-base">₺{newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-6">
                                        <span>KDV (%20)</span>
                                        <span className="font-mono text-white text-base">₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 0.2).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">GENEL TOPLAM</span>
                                        <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                                            ₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 1.2).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleCreateOrder}
                                className="w-full py-6 bg-[#4f46e5] text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 text-lg uppercase tracking-widest active:scale-95"
                            >
                                Faturayı Onayla & Kaydet
                            </button>
                            <button
                                onClick={() => setIsOrderModalOpen(false)}
                                className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-rose-500 transition-colors"
                            >
                                Vazgeç ve Kapat
                            </button>
                        </div>
                    </div>
                </ModalWrapper>

                {/* PREVIEW MODAL */}
                <ModalWrapper
                    isOpen={isPreviewModalOpen}
                    onClose={() => setIsPreviewModalOpen(false)}
                    title="Fatura Önizleme"
                    subtitle={`${previewInvoice?.id} • Arşiv Belgesi`}
                    icon="👁️"
                    large
                >
                    {previewInvoice && (
                        <div className="max-w-5xl mx-auto bg-white p-12 lg:p-16 rounded-[48px] shadow-2xl border border-slate-100 flex flex-col min-h-full">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-20 gap-8">
                                <div className="space-y-4">
                                    <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">Tedarikçi Bilgileri</p>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter leading-tight max-w-md">{previewInvoice.supplier}</p>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">{previewInvoice.supplierId}</span>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-500 text-[10px] font-black rounded-lg uppercase tracking-widest">Belge: {previewInvoice.id}</span>
                                    </div>
                                </div>
                                <div className="text-left md:text-right space-y-2 orient-right self-end">
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Operasyon Tarihi</p>
                                    <p className="text-2xl font-black text-slate-800">{previewInvoice.orderDate ? new Date(previewInvoice.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b-2 border-slate-100">
                                        <tr>
                                            <th className="pb-6 font-black text-[11px] text-slate-400 uppercase tracking-widest">Açıklama / Stok Kalemi</th>
                                            <th className="pb-6 text-center font-black text-[11px] text-slate-400 uppercase tracking-widest">Miktar</th>
                                            <th className="pb-6 text-right font-black text-[11px] text-slate-400 uppercase tracking-widest">Birim Fiyat</th>
                                            <th className="pb-6 text-right font-black text-[11px] text-slate-400 uppercase tracking-widest">Tutar (KDV Dahil)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {previewInvoice.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                                                <td className="py-8 font-black text-slate-700 text-base">{item.name || item.StokAdi}</td>
                                                <td className="py-8 text-center">
                                                    <span className="bg-slate-50 px-4 py-2 rounded-xl font-mono font-black text-slate-500 text-xs">
                                                        {item.amount || item.Miktar} {item.unit || item.Birim}
                                                    </span>
                                                </td>
                                                <td className="py-8 text-right font-mono text-slate-600">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString()}</td>
                                                <td className="py-8 text-right font-mono font-black text-slate-900 text-lg tracking-tighter">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-16 pt-12 border-t border-slate-100">
                                <div className="flex justify-end gap-16 items-center">
                                    <div className="text-right space-y-1">
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">ÖDENECEK TOPLAM</p>
                                        <p className="text-5xl font-black text-indigo-600 tracking-tighter">₺{previewInvoice.totalAmount?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </ModalWrapper>

                {/* ITEM ADD MODAL */}
                {isItemModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-[110] animate-in fade-in duration-300">
                        <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl overflow-hidden border border-white relative animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-10">
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Kalem Ekle / Düzenle</h4>
                                <button onClick={() => setIsItemModalOpen(false)} className="text-3xl text-slate-300 hover:text-rose-500">✕</button>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">GRUPLAR</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-5 py-2.5 rounded-full text-[10px] font-black border-2 transition-all uppercase tracking-widest ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-3xl bg-slate-50/50 p-3 space-y-2 custom-scrollbar">
                                    {stocks.filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setTempItem({ ...tempItem, materialId: s.id, unitPrice: (s.purchasePrice || s.BirimFiyat || 0) })}
                                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${tempItem.materialId === s.id ? 'bg-white border-indigo-500 shadow-xl' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}
                                        >
                                            <p className={`font-black text-base tracking-tight ${tempItem.materialId === s.id ? 'text-indigo-600' : 'text-slate-800'}`}>{s.name}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mevcut: <span className="text-slate-600">{s.currentStock || 0} {s.unit}</span></p>
                                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Ref Fiyat: ₺{(s.purchasePrice || s.BirimFiyat || 0).toLocaleString()}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {stocks.length === 0 && <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Yükleniyor veya Kayıt Bulunamadı...</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-8 pt-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Miktar</label>
                                        <input type="number" value={tempItem.amount} onChange={e => setTempItem({ ...tempItem, amount: Number(e.target.value) })} className="w-full py-5 bg-slate-100 border-0 rounded-3xl font-black text-center text-xl focus:bg-white focus:ring-4 ring-indigo-50 transition-all outline-none" min="1" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Birim Fiyat (₺)</label>
                                        <input type="number" value={tempItem.unitPrice} onChange={e => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })} className="w-full py-5 bg-slate-100 border-0 rounded-3xl font-black text-center font-mono text-xl focus:bg-white focus:ring-4 ring-indigo-50 transition-all outline-none" />
                                    </div>
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button onClick={() => setIsItemModalOpen(false)} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] hover:text-rose-500 transition-colors">Vazgeç</button>
                                    <button
                                        onClick={addItemToOrder}
                                        disabled={!tempItem.materialId}
                                        className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 uppercase tracking-widest text-[11px] hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        Kalemi Faturaya Ekle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
