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
    const [expenses, setExpenses] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>(['MERKEZ DEPO', 'SERA-1', 'SERA-2', 'YOLDA']);
    
    // View state
    const [viewMode, setViewMode] = useState<'FATURALAR' | 'GIDERLER'>('FATURALAR');
    const [selectedInvoiceTab, setSelectedInvoiceTab] = useState('TÜMÜ');
    const [selectedCategory, setSelectedCategory] = useState('TÜMÜ');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [tableSearchQuery, setTableSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'desc' });

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
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

    const [newExpense, setNewExpense] = useState({
        category: 'Enerji',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        periodType: 'Aylık',
        periodMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    });

    const [tempItem, setTempItem] = useState({
        materialId: '',
        amount: 1,
        unitPrice: 0
    });

    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    const API_URL = '/api';

    const expenseCategories = ['Enerji', 'İşçilik', 'Bakım/Onarım', 'Lojistik', 'Kira', 'Vergi', 'Diğer'];

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

    const filteredOrders = useMemo(() => {
        let result = orders;
        if (selectedInvoiceTab !== 'TÜMÜ') {
            result = result.filter(order => order.category === selectedInvoiceTab);
        }
        if (tableSearchQuery) {
            const lowerQuery = tableSearchQuery.toLocaleLowerCase('tr-TR');
            result = result.filter(order => 
                (order.supplier || '').toLocaleLowerCase('tr-TR').includes(lowerQuery) ||
                (order.id || '').toLocaleLowerCase('tr-TR').includes(lowerQuery) ||
                (order.category || '').toLocaleLowerCase('tr-TR').includes(lowerQuery)
            );
        }
        result = [...result].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [orders, selectedInvoiceTab, tableSearchQuery, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

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
            const [ordersRes, customersRes, stocksRes, tabsRes, expRes] = await Promise.allSettled([
                safeFetch(`${API_URL}/netsis/invoices?faturaTuru=2&pageSize=500`),
                safeFetch(`${API_URL}/netsis/customers`),
                safeFetch(`${API_URL}/netsis/stocks/list`),
                safeFetch(`${API_URL}/netsis/invoices/tab-categories`),
                safeFetch(`${API_URL}/finans/expenses?tenantId=demo-tenant`)
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

            if (expRes.status === 'fulfilled' && expRes.value.ok) {
                const data = await expRes.value.json().catch(() => []);
                setExpenses(Array.isArray(data) ? data : []);
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

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/finans/expenses?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExpense)
            });
            if (res.ok) {
                setIsExpenseModalOpen(false);
                setNewExpense({ category: 'Enerji', amount: 0, description: '', date: new Date().toISOString().split('T')[0], periodType: 'Aylık', periodMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` });
                fetchData();
            } else {
                alert("Hata: Gider kaydedilemedi");
            }
        } catch (err) {
            alert('Sistem hatası');
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Gideri silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/finans/expenses/${id}?tenantId=demo-tenant`, { method: 'DELETE' });
            fetchData();
        } catch (err) {}
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
        <div className="flex flex-col lg:flex-row min-h-screen fx-page">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white px-4 lg:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center sticky top-0 z-30 gap-4 shadow-sm lg:py-0 lg:h-[88px] shrink-0 relative">
                    <div className="absolute bottom-0 left-4 right-0 h-[1px] bg-slate-200 hidden lg:block" />
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Satınalma & Giderler</h1>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium">Alış faturaları ve tedarikçi yönetimi.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <ExportButton title={viewMode === 'FATURALAR' ? 'Alis_Faturalari' : 'Gider_Fisleri'} tableId={viewMode === 'FATURALAR' ? 'purchase-table' : 'expense-table'} />
                        {viewMode === 'FATURALAR' ? (
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
                        ) : (
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-rose-700 shadow-[0_8px_16px_-6px_rgba(225,29,72,0.4)] transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span className="text-lg leading-none">+</span> Gider Ekle
                            </button>
                        )}
                    </div>
                </header>

                <div className="bg-white border-b border-slate-200 px-8 flex gap-8 whitespace-nowrap overflow-x-auto">
                    <button
                        onClick={() => setViewMode('FATURALAR')}
                        className={`py-4 text-xs font-semibold uppercase tracking-wider border-b-[3px] transition ${viewMode === 'FATURALAR' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        ALIŞ FATURALARI (STOKLU)
                    </button>
                    <button
                        onClick={() => setViewMode('GIDERLER')}
                        className={`py-4 text-xs font-semibold uppercase tracking-wider border-b-[3px] transition ${viewMode === 'GIDERLER' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        GİDER FİŞLERİ (STOKSUZ)
                    </button>
                </div>

                {viewMode === 'FATURALAR' && (
                    <div className="px-4 lg:px-8 mt-6">
                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-200/60 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">TOPLAM FATURA</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-800">{filteredOrders.length}</span>
                                    <span className="text-[10px] text-slate-400 font-medium mt-1">Görüntülenen faturalar</span>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(251,191,36,0.3)] text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-200/60 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">TOPLAM KALEM</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-800">{filteredOrders.reduce((sum, o) => sum + (o.KalemSayisi || 0), 0)} <span className="text-sm font-semibold text-slate-500">adet</span></span>
                                    <span className="text-[10px] text-slate-400 font-medium mt-1">Görüntülenen ürün sayısı</span>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(249,115,22,0.3)] text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-200/60 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">TOPLAM TUTAR</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-800">
                                        {filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-sm text-slate-500">₺</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium mt-1">Görüntülenen tutar</span>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(16,185,129,0.3)] text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path><path d="M16.5 24V12l-4.5 2.59L7.5 12v12"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-200/60 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">AKTİF TEDARİKÇİ</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-800">{new Set(filteredOrders.map(o => o.supplier)).size} <span className="text-sm font-semibold text-slate-500">firma</span></span>
                                    <span className="text-[10px] text-slate-400 font-medium mt-1">Görüntülenen firmalar</span>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.3)] text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex bg-white p-1.5 rounded-2xl w-fit gap-1 shadow-sm border border-slate-200 overflow-x-auto">
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
                            <div className="relative w-full sm:w-64">
                                <svg className="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input 
                                    type="text" 
                                    placeholder="Tedarikçi, belge no, vb..." 
                                    value={tableSearchQuery}
                                    onChange={e => setTableSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}

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
                    
                    {viewMode === 'FATURALAR' ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse" id="purchase-table">
                                <thead className="bg-transparent text-slate-400 uppercase text-[10px] font-bold border-b-2 border-slate-100 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('supplier')}>
                                            <div className="flex items-center gap-2">Tedarikçi / Belge No {sortConfig.key === 'supplier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('orderDate')}>
                                            <div className="flex items-center gap-2">Tarih / Kategori {sortConfig.key === 'orderDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => handleSort('KalemSayisi')}>
                                            <div className="flex items-center gap-2">İçerik {sortConfig.key === 'KalemSayisi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition-colors text-right" onClick={() => handleSort('totalAmount')}>
                                            <div className="flex items-center justify-end gap-2">Toplam Tutar {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="px-6 py-4 text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-[11px]">
                                    {filteredOrders.length === 0 && !isLoading && (
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
                                    {filteredOrders.map((order, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 text-[13px] group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                                                            {order.supplier?.charAt(0) || 'T'}
                                                        </div>
                                                        {order.supplier}
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                                        {order.id}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700 group-hover:text-orange-500 transition-colors text-[12px] flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </div>
                                                    <div className="mt-1">
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                                            {order.category}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-medium text-[12px]">
                                                    {order.KalemSayisi > 0 ? (
                                                        <span className="text-slate-900 font-semibold group-hover:text-orange-500 transition-colors">{order.KalemSayisi} Kalem</span>
                                                    ) : (
                                                        <span className="text-slate-400">Kalem yok</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900 group-hover:text-orange-500 transition-colors text-[15px]">
                                                    {order.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'} <span className="text-[11px] text-slate-400 group-hover:text-orange-400/80 font-medium ml-0.5">₺</span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center h-full">
                                                    <button onClick={() => { setNewOrder({ ...order, items: [] }); fetchInvoiceDetails(order.id, order.supplierId); setIsOrderModalOpen(true); }} className="text-slate-700 font-bold text-[10px] bg-white hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-xl transition-all border border-slate-200 hover:border-orange-500 flex items-center gap-1.5 shadow-sm">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                        Düzenle
                                                    </button>
                                                    <button onClick={async () => { const items = await fetchInvoiceDetails(order.id, order.supplierId); setPreviewInvoice({ ...order, items }); setIsPreviewModalOpen(true); }} className="text-white font-bold text-[10px] bg-slate-900 hover:bg-orange-500 px-3 py-1.5 rounded-xl transition-all border border-transparent flex items-center gap-1.5 shadow-sm">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                        Önizle
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse" id="expense-table">
                                <thead className="bg-transparent text-slate-400 uppercase text-[10px] font-bold border-b-2 border-slate-100 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Kategori / Açıklama</th>
                                        <th className="px-6 py-4">Tarih</th>
                                        <th className="px-6 py-4 text-right">Tutar</th>
                                        <th className="px-6 py-4 text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                    {expenses.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-100">💸</div>
                                                <p className="font-black text-slate-800 text-lg">Gider Kaydı Yok</p>
                                                <p className="text-sm text-slate-500 mt-1 font-medium">
                                                    Henüz eklenmiş bir stoksuz gider bulunmuyor.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                    {expenses.map((expense, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-3.5">
                                                <div className="font-bold text-slate-800 text-[11px]">{expense.description}</div>
                                                <div className="mt-1">
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-100/50">
                                                        {expense.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="text-[11px] font-medium text-slate-600">
                                                    {new Date(expense.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-bold text-rose-600 text-[13px]">
                                                {Number(expense.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-rose-400 font-medium ml-0.5">₺</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right flex justify-end items-center h-full">
                                                <button onClick={() => handleDeleteExpense(expense.id)} className="text-rose-600 font-semibold text-[10px] bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full transition-colors border border-rose-100/50">Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODALS */}
                {isExpenseModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 lg:p-8 relative border border-slate-200">
                            <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors font-black">×</button>
                            <h2 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Yeni Gider Fişi</h2>
                            <form onSubmit={handleCreateExpense} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Gider Kategorisi</label>
                                    <select required value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 outline-none rounded-xl font-bold text-sm">
                                        {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tutar (₺)</label>
                                    <input required type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 outline-none rounded-xl font-mono font-bold text-lg text-rose-600" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Açıklama</label>
                                    <input required type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 outline-none rounded-xl font-medium text-sm" placeholder="Giderin detayı..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tarih</label>
                                        <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 outline-none rounded-xl font-mono text-sm font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Periyot Tipi</label>
                                        <select required value={newExpense.periodType} onChange={e => setNewExpense({...newExpense, periodType: e.target.value as any})} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-rose-500 outline-none rounded-xl font-bold text-sm">
                                            <option value="Günlük">Günlük</option>
                                            <option value="Aylık">Aylık</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">İptal</button>
                                    <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">Gideri Kaydet</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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
                    <div className="fx-modal-backdrop">
                        <div className="fx-modal-large">
                            <div className="fx-modal-header">
                                <div>
                                    <h3 className="text-2xl sm:text-3xl font-bold fx-text-primary tracking-tight">Alış Faturası Önizleme</h3>
                                    <p className="text-sm fx-text-secondary mt-1 font-medium">Fatura detayları ve kalem listesi.</p>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--fx-bg)] text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                    ✕
                                </button>
                            </div>

                            <div className="fx-modal-body p-6 md:p-8 bg-slate-50/50 custom-scrollbar">
                                <div className="fx-card w-full max-w-none relative overflow-hidden flex flex-col p-6 md:p-8 border-t-4 border-t-orange-500 shadow-[0_8px_30px_rgb(249,115,22,0.06)] bg-white rounded-none">
                                    {/* Watermark */}
                                    <div className="absolute right-[-5%] top-[15%] text-[120px] md:text-[150px] opacity-[0.02] rotate-[-15deg] pointer-events-none font-black tracking-tighter fx-text-primary">FİDANX</div>
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 relative z-10 border-b border-dashed fx-border pb-6">
                                        <div className="w-full md:w-2/3 min-w-0">
                                            <p className="text-orange-500 font-semibold text-[10px] uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> TEDARİKÇİ ÜNVANI
                                            </p>
                                            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 text-transparent bg-clip-text leading-tight mb-3 tracking-tight truncate w-full" title={previewInvoice.supplier}>{previewInvoice.supplier}</h2>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2.5 py-1 bg-[var(--fx-bg)] fx-text-secondary text-[9px] font-black rounded-lg uppercase tracking-widest border fx-border">CARİ: {previewInvoice.supplierId}</span>
                                                <span className="px-2.5 py-1 text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-orange-200 dark:border-orange-500/20">BELGE: {previewInvoice.id}</span>
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="fx-text-secondary font-black text-[10px] uppercase tracking-[0.2em] mb-1.5">TARİH</p>
                                            <p className="text-lg lg:text-xl font-black fx-text-primary tracking-tight">{previewInvoice.orderDate ? new Date(previewInvoice.orderDate).toLocaleDateString('tr-TR') : '-'}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-x-auto relative z-10 border fx-border rounded-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-[var(--fx-bg)] border-b fx-border">
                                                <tr>
                                                    <th className="px-4 py-3 font-black text-[10px] fx-text-secondary uppercase tracking-[0.1em]">Stok Kalemi / Açıklama</th>
                                                    <th className="px-4 py-3 text-center font-black text-[10px] fx-text-secondary uppercase tracking-[0.1em]">Miktar</th>
                                                    <th className="px-4 py-3 text-right font-black text-[10px] fx-text-secondary uppercase tracking-[0.1em]">Birim Fiyat</th>
                                                    <th className="px-4 py-3 text-right font-black text-[10px] fx-text-secondary uppercase tracking-[0.1em]">Toplam</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-dashed divide-slate-200/70 dark:divide-slate-700/50">
                                                {previewInvoice.items.map((item: any, idx: number) => (
                                                    <tr key={idx} className="group hover:bg-orange-500 transition-colors">
                                                        <td className="px-4 py-3 font-bold fx-text-primary group-hover:!text-white text-[12px] transition-colors flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                                            {item.name || item.StokAdi}
                                                        </td>
                                                        <td className="px-4 py-3 text-center transition-colors">
                                                            <span className="bg-slate-100 group-hover:!bg-orange-600 border border-slate-200 group-hover:!border-orange-400 px-2.5 py-1 rounded-md font-bold text-slate-600 group-hover:!text-white text-[11px] inline-block transition-colors shadow-sm">
                                                                {item.amount || item.Miktar} {item.unit || item.Birim}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900 group-hover:!text-white text-[13px] transition-colors">{Number(item.unitPrice || item.BirimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] opacity-70">₺</span></td>
                                                        <td className="px-4 py-3 text-right font-black text-slate-900 group-hover:!text-white text-[14px] transition-colors">{Number((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] opacity-70">₺</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-6 pt-6 relative z-10 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 border-t border-dashed fx-border">
                                        <div className="w-16 h-16 border-2 border-orange-500 rounded-full flex items-center justify-center opacity-30 rotate-[-15deg] shrink-0">
                                            <span className="text-orange-500 font-black text-[9px] uppercase tracking-widest">İŞLENDİ</span>
                                        </div>
                                        <div className="text-right bg-gradient-to-br from-[var(--fx-bg)] to-orange-50/30 dark:to-orange-900/10 p-4 lg:p-5 rounded-xl border border-orange-100 dark:border-orange-500/20 w-full sm:w-auto shadow-sm">
                                            <p className="text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-[0.2em] mb-1">ÖDENECEK TOPLAM</p>
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className="text-lg font-black fx-text-secondary">₺</span>
                                                <p className="text-2xl lg:text-3xl font-black fx-text-primary">{previewInvoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                                            </div>
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
