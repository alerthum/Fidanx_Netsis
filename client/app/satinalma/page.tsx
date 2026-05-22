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
                <header className="bg-white px-4 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-30 gap-4 border-b border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Satınalma & Giderler</h1>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium mt-1">Alış faturaları ve tedarikçi yönetimi.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <ExportButton title="Alis_Faturalari" tableId="purchase-table" />
                        <button
                            onClick={() => {
                                setNewOrder({
                                    id: '', supplier: '', supplierId: '', description: '',
                                    status: 'Bekliyor', category: '150-01', targetLocation: 'MERKEZ DEPO', items: []
                                });
                                setIsOrderModalOpen(true);
                            }}
                            className="bg-[#ff7a18] text-white px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-orange-600 shadow-[0_8px_16px_-6px_rgba(255,122,24,0.4)] transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> Yeni Fatura
                        </button>
                    </div>
                </header>

                <div className="px-4 lg:px-8 mt-6 overflow-x-auto">
                    <div className="flex bg-white p-1.5 rounded-2xl w-fit gap-1 shadow-sm border border-slate-200">
                        {invoiceTabLabels.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedInvoiceTab(tab.id)}
                                className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${selectedInvoiceTab === tab.id ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 lg:p-8">
                    {fetchError && (
                        <div className="mb-6 p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-xl shrink-0">⚠️</div>
                            <div className="flex-1">
                                <p className="font-black text-rose-800 uppercase tracking-widest text-xs">Bağlantı Hatası</p>
                                <p className="text-sm mt-1 font-medium">{fetchError}</p>
                            </div>
                            <button onClick={fetchData} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-widest shadow-sm">Tekrar Dene</button>
                        </div>
                    )}
                    
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse" id="purchase-table">
                            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-200 tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">Tedarikçi Ünvanı</th>
                                    <th className="px-6 py-5">Belge No</th>
                                    <th className="px-6 py-5">Tarih</th>
                                    <th className="px-6 py-5">Kategori</th>
                                    <th className="px-6 py-5">İçerik</th>
                                    <th className="px-6 py-5 text-right">Toplam Tutar</th>
                                    <th className="px-6 py-5 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {orders.filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab).length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-100">📋</div>
                                            <p className="font-black text-slate-800 text-lg">Kayıt Bulunamadı</p>
                                            <p className="text-sm text-slate-500 mt-1 font-medium">
                                                {orders.length === 0 ? 'Netsis veritabanından henüz fatura verisi alınamadı.' : `Seçili kategoride (${selectedInvoiceTab}) fatura yok.`}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                                {orders
                                    .filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab)
                                    .map((order, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-5 font-black text-slate-800 group-hover:text-[#ff7a18] transition-colors">{order.supplier}</td>
                                            <td className="px-6 py-5">
                                                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{order.id}</span>
                                            </td>
                                            <td className="px-6 py-5 font-medium text-slate-600">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 rounded-lg text-[10px] uppercase font-black bg-indigo-50 text-indigo-600 border border-indigo-100 tracking-widest">
                                                    {order.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                                {order.KalemSayisi > 0 ? `${order.KalemSayisi} Kalem` : 'Kalem yok'}
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-black text-slate-900 text-base">
                                                ₺{order.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}
                                            </td>
                                            <td className="px-6 py-5 text-right flex justify-end gap-2">
                                                <button onClick={() => { setNewOrder({ ...order, items: [] }); fetchInvoiceDetails(order.id, order.supplierId); setIsOrderModalOpen(true); }} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors border border-emerald-100">Düzenle</button>
                                                <button onClick={async () => { const items = await fetchInvoiceDetails(order.id, order.supplierId); setPreviewInvoice({ ...order, items }); setIsPreviewModalOpen(true); }} className="text-slate-600 font-black text-[10px] uppercase tracking-widest bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200">Önizle</button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODALS */}
                {isOrderModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                            <div className="p-6 md:p-8 bg-white border-b border-slate-200 flex justify-between items-center shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-[#ff7a18]"></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {newOrder.id ? "Faturayı Düzenle" : "Yeni Alış Faturası"}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        {newOrder.id ? `${newOrder.id} • ${newOrder.supplier}` : "Tedarikçiden gelen faturayı sisteme işleyin"}
                                    </p>
                                </div>
                                <button onClick={() => setIsOrderModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xl transition-colors">×</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                                            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-sm">🏢</span> 
                                                Genel Bilgiler
                                            </h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tedarikçi Seçimi</label>
                                                    <select
                                                        value={newOrder.supplierId}
                                                        onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                                                        disabled={!!newOrder.id}
                                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#ff7a18] focus:ring-2 focus:ring-[#ff7a18]/20 transition-all rounded-xl text-sm font-bold outline-none text-slate-800 disabled:opacity-50"
                                                    >
                                                        <option value="">Tedarikçi Seçiniz...</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fatura / Belge No</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Örn: ABC2024000001"
                                                        value={newOrder.description}
                                                        onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#ff7a18] focus:ring-2 focus:ring-[#ff7a18]/20 transition-all rounded-xl text-sm font-bold outline-none text-slate-800"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg border border-emerald-100">🛒</div>
                                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Fatura Kalemleri</h4>
                                                </div>
                                                <button
                                                    onClick={() => setIsItemModalOpen(true)}
                                                    className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-colors"
                                                >
                                                    + Kalem Ekle
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {newOrder.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xl shadow-sm">📦</div>
                                                            <div>
                                                                <p className="font-black text-slate-800 text-sm">{item.name || item.StokAdi}</p>
                                                                <p className="text-xs text-slate-500 font-bold mt-1 bg-white inline-block px-2 py-0.5 rounded border border-slate-200">
                                                                    {item.amount || item.Miktar} {item.unit || item.Birim} <span className="text-slate-300 mx-1">x</span> <span className="text-emerald-600">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TUTAR</p>
                                                                <p className="font-black text-slate-900 text-lg tracking-tight">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xl border border-transparent hover:border-rose-100"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {newOrder.items.length === 0 && (
                                                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                                                        <span className="text-4xl grayscale opacity-30 block mb-3">🛒</span>
                                                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Henüz kalem eklenmedi</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative overflow-hidden">
                                            {/* Decor */}
                                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                                            
                                            <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a18]"></span> Finansal Özet
                                            </h4>
                                            
                                            <div className="space-y-5">
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                                    <span className="uppercase tracking-widest">Ara Toplam</span>
                                                    <span className="font-mono text-white text-sm">₺{newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-white/10 pb-5">
                                                    <span className="uppercase tracking-widest">KDV (%20)</span>
                                                    <span className="font-mono text-white text-sm">₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 0.2).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="pt-2 flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-[#ff7a18] mb-2 uppercase tracking-[0.2em]">ÖDENECEK TUTAR</span>
                                                    <span className="text-4xl font-black text-white tracking-tighter">
                                                        ₺{(newOrder.items.reduce((s, i) => s + ((i.amount || i.Miktar) * (i.unitPrice || i.BirimFiyat)), 0) * 1.2).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCreateOrder}
                                            className="w-full py-4.5 bg-[#ff7a18] text-white font-black rounded-2xl hover:bg-orange-600 transition-all shadow-[0_8px_20px_rgba(255,122,24,0.3)] hover:shadow-[0_12px_25px_rgba(255,122,24,0.4)] hover:-translate-y-0.5 text-xs uppercase tracking-[0.15em]"
                                        >
                                            FATURAYI KAYDET
                                        </button>
                                        <button
                                            onClick={() => setIsOrderModalOpen(false)}
                                            className="w-full py-4 text-slate-500 font-black uppercase tracking-[0.15em] text-xs hover:text-slate-800 transition-colors bg-white border border-slate-200 rounded-2xl hover:bg-slate-50"
                                        >
                                            VAZGEÇ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PREVIEW MODAL */}
                {isPreviewModalOpen && previewInvoice && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                            <div className="p-6 md:p-8 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Alış Faturası Önizleme</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Sistem Kaydı: {previewInvoice.id}</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xl transition-colors">×</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full max-w-3xl mx-auto relative overflow-hidden">
                                    {/* Watermark */}
                                    <div className="absolute right-[-10%] top-[20%] text-[200px] opacity-[0.02] rotate-[-15deg] pointer-events-none font-black tracking-tighter">FİDANX</div>
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 relative z-10">
                                        <div>
                                            <p className="text-[#ff7a18] font-black text-[10px] uppercase tracking-[0.2em] mb-2">TEDARİKÇİ ÜNVANI</p>
                                            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-3 tracking-tight">{previewInvoice.supplier}</h2>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-200">CARİ: {previewInvoice.supplierId}</span>
                                                <span className="px-3 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-orange-100">BELGE: {previewInvoice.id}</span>
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">TARİH</p>
                                            <p className="text-xl font-black text-slate-800 tracking-tight">{previewInvoice.orderDate ? new Date(previewInvoice.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-x-auto relative z-10 border border-slate-200 rounded-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-[0.15em]">Stok Kalemi / Açıklama</th>
                                                    <th className="p-4 text-center font-black text-[10px] text-slate-500 uppercase tracking-[0.15em]">Miktar</th>
                                                    <th className="p-4 text-right font-black text-[10px] text-slate-500 uppercase tracking-[0.15em]">Birim Fiyat</th>
                                                    <th className="p-4 text-right font-black text-[10px] text-slate-500 uppercase tracking-[0.15em]">Toplam</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewInvoice.items.map((item: any, idx: number) => (
                                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-black text-slate-800 text-sm">{item.name || item.StokAdi}</td>
                                                        <td className="p-4 text-center">
                                                            <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg font-bold text-slate-600 text-xs inline-block">
                                                                {item.amount || item.Miktar} {item.unit || item.Birim}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right font-mono font-bold text-slate-600 text-sm">₺{(item.unitPrice || item.BirimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                                        <td className="p-4 text-right font-mono font-black text-slate-900 text-base">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-200 relative z-10 flex justify-between items-end">
                                        <div className="w-24 h-24 border-4 border-[#ff7a18]/20 rounded-full flex items-center justify-center opacity-50 rotate-[-15deg]">
                                            <span className="text-[#ff7a18] font-black text-xs uppercase tracking-widest">İŞLENDİ</span>
                                        </div>
                                        <div className="text-right bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">ÖDENECEK TOPLAM</p>
                                            <p className="text-4xl font-black text-slate-900 tracking-tighter">₺{previewInvoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ITEM ADD MODAL */}
                {isItemModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm border border-emerald-100">📦</span>
                                    Kalem Seçimi
                                </h3>
                                <button onClick={() => setIsItemModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center text-xl transition-colors">×</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Malzeme Kategorisi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Stok Listesi</label>
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 p-2 space-y-1.5 custom-scrollbar">
                                        {stocks.filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory).map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setTempItem({ ...tempItem, materialId: s.id, unitPrice: (s.purchasePrice || s.BirimFiyat || 0) })}
                                                className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-center group ${tempItem.materialId === s.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'}`}
                                            >
                                                <div>
                                                    <p className={`font-black text-sm tracking-tight ${tempItem.materialId === s.id ? 'text-emerald-700' : 'text-slate-800'}`}>{s.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                                        Mevcut: <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{s.currentStock || 0} {s.unit}</span>
                                                    </p>
                                                </div>
                                                <p className={`text-sm font-mono font-black ${tempItem.materialId === s.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                    ₺{(s.purchasePrice || s.BirimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </button>
                                        ))}
                                        {stocks.length === 0 && <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest">Yükleniyor veya Kayıt Bulunamadı...</div>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.15em]">Alınacak Miktar</label>
                                        <input type="number" value={tempItem.amount} onChange={e => setTempItem({ ...tempItem, amount: Number(e.target.value) })} className="w-full p-3.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-base font-black text-slate-800 text-center font-mono shadow-sm" min="1" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.15em]">Birim Fiyat (₺)</label>
                                        <input type="number" value={tempItem.unitPrice} onChange={e => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })} className="w-full p-3.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-base font-black text-emerald-600 text-center font-mono shadow-sm" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 md:p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                                <button onClick={() => setIsItemModalOpen(false)} className="w-1/3 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 hover:text-slate-700 transition-colors">Vazgeç</button>
                                <button
                                    onClick={addItemToOrder}
                                    disabled={!tempItem.materialId}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_8px_20px_rgba(5,150,105,0.2)] hover:shadow-[0_12px_25px_rgba(5,150,105,0.3)] hover:-translate-y-0.5 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                                >
                                    Faturaya Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
