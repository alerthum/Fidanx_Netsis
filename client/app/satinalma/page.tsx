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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest mb-4">Genel Bilgiler</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Tedarikçi Seçimi</label>
                                        <select
                                            value={newOrder.supplierId}
                                            onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                                            disabled={!!newOrder.id}
                                            className="w-full p-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all rounded-xl text-sm font-medium outline-none"
                                        >
                                            <option value="">Tedarikçi Seçiniz...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Fatura / Belge No</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: ABC2024000001"
                                            value={newOrder.description}
                                            onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all rounded-xl text-sm font-medium outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-sm">🛒</div>
                                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Fatura Kalemleri</h4>
                                    </div>
                                    <button
                                        onClick={() => setIsItemModalOpen(true)}
                                        className="bg-[#ff7a18] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase hover:bg-orange-600 shadow-sm transition-all"
                                    >
                                        + Kalem Ekle
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {newOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-lg">📦</div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{item.name || item.StokAdi}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                        {item.amount || item.Miktar} {item.unit || item.Birim} x 
                                                        <span className="text-orange-600 font-bold ml-1">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold text-slate-900 text-base">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString()}</p>
                                                <button
                                                    onClick={() => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all text-lg"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {newOrder.items.length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                            <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Henüz kalem eklenmedi</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6">Finansal Özet</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-xs font-bold text-slate-400">
                                        <span>Ara Toplam</span>
                                        <span className="font-mono text-white">₺{newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-700 pb-4">
                                        <span>KDV (%20)</span>
                                        <span className="font-mono text-white">₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 0.2).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-orange-400 mb-1 uppercase tracking-widest">Genel Toplam</span>
                                        <span className="text-3xl font-black text-white tracking-tight">
                                            ₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 1.2).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleCreateOrder}
                                className="w-full py-4 bg-[#ff7a18] text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-md text-sm uppercase tracking-widest"
                            >
                                Onayla & Kaydet
                            </button>
                            <button
                                onClick={() => setIsOrderModalOpen(false)}
                                className="w-full py-3 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-slate-800 transition-colors bg-slate-100 rounded-xl hover:bg-slate-200"
                            >
                                Vazgeç
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
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full max-w-4xl mx-auto">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                                <div>
                                    <p className="text-orange-500 font-bold text-[10px] uppercase tracking-widest mb-1">Tedarikçi Bilgileri</p>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{previewInvoice.supplier}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{previewInvoice.supplierId}</span>
                                        <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded uppercase">Belge: {previewInvoice.id}</span>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1">Operasyon Tarihi</p>
                                    <p className="text-lg font-black text-slate-800">{previewInvoice.orderDate ? new Date(previewInvoice.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-200">
                                        <tr>
                                            <th className="pb-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Açıklama / Stok Kalemi</th>
                                            <th className="pb-3 text-center font-bold text-[11px] text-slate-500 uppercase tracking-widest">Miktar</th>
                                            <th className="pb-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-widest">Birim Fiyat</th>
                                            <th className="pb-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-widest">Tutar (KDV Dahil)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewInvoice.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 font-bold text-slate-800 text-sm">{item.name || item.StokAdi}</td>
                                                <td className="py-4 text-center">
                                                    <span className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-600 text-xs">
                                                        {item.amount || item.Miktar} {item.unit || item.Birim}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right font-medium text-slate-600 text-sm">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString()}</td>
                                                <td className="py-4 text-right font-black text-slate-900 text-base">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <div className="flex justify-end">
                                    <div className="text-right">
                                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1">ÖDENECEK TOPLAM</p>
                                        <p className="text-3xl font-black text-orange-600 tracking-tight">₺{previewInvoice.totalAmount?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </ModalWrapper>

                {/* ITEM ADD MODAL */}
                <ModalWrapper
                    isOpen={isItemModalOpen}
                    onClose={() => setIsItemModalOpen(false)}
                    title="Kalem Ekle / Düzenle"
                    icon="📦"
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 uppercase">Kategoriler</label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-200'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 p-2 space-y-1 custom-scrollbar">
                            {stocks.filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setTempItem({ ...tempItem, materialId: s.id, unitPrice: (s.purchasePrice || s.BirimFiyat || 0) })}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${tempItem.materialId === s.id ? 'bg-orange-50 border-orange-500 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}
                                >
                                    <div>
                                        <p className={`font-bold text-sm ${tempItem.materialId === s.id ? 'text-orange-700' : 'text-slate-800'}`}>{s.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Mevcut: {s.currentStock || 0} {s.unit}</p>
                                    </div>
                                    <p className="text-xs text-orange-600 font-bold">₺{(s.purchasePrice || s.BirimFiyat || 0).toLocaleString()}</p>
                                </button>
                            ))}
                            {stocks.length === 0 && <p className="text-center py-6 text-slate-400 text-xs font-bold">Yükleniyor veya Kayıt Bulunamadı...</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Miktar</label>
                                <input type="number" value={tempItem.amount} onChange={e => setTempItem({ ...tempItem, amount: Number(e.target.value) })} className="w-full p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm font-medium text-slate-800 text-center" min="1" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Birim Fiyat (₺)</label>
                                <input type="number" value={tempItem.unitPrice} onChange={e => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })} className="w-full p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm font-medium text-slate-800 text-center font-mono" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsItemModalOpen(false)} className="w-1/3 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Vazgeç</button>
                            <button
                                onClick={addItemToOrder}
                                disabled={!tempItem.materialId}
                                className="flex-1 py-3 bg-[#ff7a18] text-white rounded-xl font-bold shadow hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                Kalemi Faturaya Ekle
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            </main>
        </div>
    );
}
