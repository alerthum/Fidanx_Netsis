"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

export default function SatinalmaPage() {
    // Tab state kept for potential future re-enable, but UI only shows Orders for now or hides MRP switcher
    const [activeTab, setActiveTab] = useState<'mrp' | 'orders'>('orders');
    const [analysis, setAnalysis] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]); // New: Suppliers/Customers
    const [locations, setLocations] = useState<string[]>([]);
    const [tenantInvoiceCategories, setTenantInvoiceCategories] = useState<{ id: string; label: string }[]>([]);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedInvoiceTab, setSelectedInvoiceTab] = useState('150-01');
    const [invoiceTabLabels, setInvoiceTabLabels] = useState<{ id: string; label: string }[]>([]);
    const [previewInvoice, setPreviewInvoice] = useState<any>(null);

    // New Order State
    const [newOrder, setNewOrder] = useState({
        supplier: '',
        supplierId: '', // Store ID
        description: '',
        status: 'Bekliyor',
        category: 'Diğer',
        targetLocation: 'Sera 1', // Default location for the order items
        items: [] as any[] // { materialId, amount, unitPrice, name, unit }
    });

    // Item Selection State
    const [selectedCategory, setSelectedCategory] = useState<string>('TÜMÜ');
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [tempItem, setTempItem] = useState({
        materialId: '',
        amount: 0,
        unitPrice: 0
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // Tab etiketlerini TBLSTGRUP'tan çek (Süs Bitkisi vb.)
            const resTabs = await fetch(`${API_URL}/netsis/invoices/tab-categories`);
            if (resTabs.ok) {
                const tabData = await resTabs.json();
                setInvoiceTabLabels(Array.isArray(tabData) ? tabData : []);
            }
            // Netsis Alış Faturalarını 'Sipariş' olarak gösteriyoruz
            const resOrders = await fetch(`${API_URL}/netsis/invoices?faturaTuru=2&pageSize=500`);
            if (!resOrders.ok) {
                const errText = await resOrders.text();
                console.error('Faturalar alınamadı:', errText);
                setOrders([]);
            } else {
                const dataOrders = await resOrders.json();
                const mappedOrders = (dataOrders && dataOrders.items) ? dataOrders.items.map((inv: any) => ({
                    id: inv.BelgeNo,
                    supplier: inv.CariAdi,
                    supplierId: inv.CariKodu,
                    orderDate: inv.Tarih,
                    status: 'Tamamlandı',
                    totalAmount: inv.ToplamTutar,
                    KalemSayisi: inv.KalemSayisi,
                    category: inv.Kategori,
                    categoryLabel: inv.KategoriLabel,
                    description: inv.Aciklama || inv.BelgeNo || '',
                    items: []
                })) : [];
                setOrders(mappedOrders);
            }

            // Fetch Stocks (Netsis)
            const resStocks = await fetch(`${API_URL}/netsis/stocks/list`);
            const dataStocks = await resStocks.json();
            const mappedStocks = Array.isArray(dataStocks) ? dataStocks.map((s: any) => ({
                id: s.StokKodu,
                name: s.StokAdi,
                currentStock: s.Bakiye,
                unit: s.Birim || 'Adet',
                category: s.GrupIsim || s.Tip,
                criticalStock: 0
            })) : [];
            setStocks(mappedStocks);

            // Fetch Customers (Suppliers - Netsis Cariler)
            const resCustomers = await fetch(`${API_URL}/netsis/customers?type=320`);
            const dataCustomers = await resCustomers.json();
            const mappedCustomers = Array.isArray(dataCustomers) ? dataCustomers.map((c: any) => ({
                id: c.CariKodu,
                name: c.CariAdi
            })) : [];
            setCustomers(mappedCustomers);

            const resTenant = await fetch(`${API_URL}/tenants/demo-tenant`);
            if (resTenant.ok) {
                const tenant = await resTenant.json();
                if (Array.isArray(tenant.settings?.locations)) setLocations(tenant.settings.locations);
                if (Array.isArray(tenant.settings?.invoiceCategories)) setTenantInvoiceCategories(tenant.settings.invoiceCategories);
            }

            const analysisFromStocks = mappedStocks.map((s: any) => ({
                id: s.id,
                name: s.name,
                current: s.currentStock || 0,
                required: (s.criticalStock || 0) * 1.5,
                unit: s.unit || 'Adet'
            }));
            setAnalysis(analysisFromStocks);

        } catch (err) { console.error('Satinalma fetch error:', err); }
    };

    const fetchInvoiceDetails = async (belgeNo: string, cariKodu: string) => {
        try {
            const res = await fetch(`${API_URL}/netsis/invoices/${belgeNo}/details?cariKodu=${cariKodu}`);
            if (res.ok) {
                const data = await res.json();
                // API: StokAdi, Miktar, Birim, BirimFiyat -> Client: name, amount, unit, unitPrice
                const mappedItems = Array.isArray(data) ? data.map((item: any) => ({
                    name: item.StokAdi,
                    amount: item.Miktar,
                    unit: item.Birim || 'Adet',
                    unitPrice: item.BirimFiyat,
                    materialId: item.StokKodu
                })) : [];
                setNewOrder((prev: any) => ({ ...prev, items: mappedItems }));
                return mappedItems;
            }
        } catch (err) {
            console.error('Fatura detayları çekilemedi:', err);
        }
        return [];
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        // Find Supplier Name if ID is selected
        const supplierObj = customers.find(c => c.id === newOrder.supplierId);
        const supplierName = supplierObj ? supplierObj.name : newOrder.supplier;

        const payload = {
            ...newOrder,
            supplier: supplierName,
            status: 'Bekliyor', // Default status
            totalAmount: newOrder.items.reduce((sum, item) => sum + (item.amount * item.unitPrice), 0)
        };

        try {
            const res = await fetch(`${API_URL}/purchases?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setIsOrderModalOpen(false);
                setNewOrder({ supplier: '', supplierId: '', description: '', status: 'Bekliyor', category: 'Diğer', targetLocation: locations[0] || '', items: [] });
                fetchInitialData();
            }
        } catch (err) { }
    };

    const updateOrderStatus = async (id: string, status: string) => {
        if (status === 'Tamamlandı' && !confirm('Sipariş tamamlandığında stoklar artırılacaktır. Emin misiniz?')) return;

        try {
            const res = await fetch(`${API_URL}/purchases/${id}/status?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                // Netsis'e Aktar (Push)
                if (status === 'Tamamlandı') {
                    await fetch(`${API_URL}/netsis/invoices/push?invoiceId=${id}&type=PURCHASE`);
                }
                fetchInitialData();
            }
        } catch (err) { }
    };

    const addItemToOrder = () => {
        if (!tempItem.materialId || tempItem.amount <= 0) return alert('Lütfen malzeme ve miktar seçin.');

        const material = stocks.find(s => s.id === tempItem.materialId);
        const newItem = {
            materialId: tempItem.materialId,
            amount: tempItem.amount,
            unitPrice: tempItem.unitPrice,
            name: material?.name || 'Bilinmiyor',
            unit: material?.unit || 'Adet'
        };

        if (editingItemIndex !== null) {
            setNewOrder(prev => ({
                ...prev,
                items: prev.items.map((it: any, i: number) => i === editingItemIndex ? newItem : it)
            }));
            setEditingItemIndex(null);
        } else {
            setNewOrder(prev => ({ ...prev, items: [...prev.items, newItem] }));
        }
        setTempItem({ materialId: '', amount: 0, unitPrice: 0 });
        setIsItemModalOpen(false);
    };

    // Filter stocks based on selection
    const filteredStocks = selectedCategory === 'TÜMÜ'
        ? stocks
        : stocks.filter(s => s.category === selectedCategory || s.type === selectedCategory);

    // Get Unique Categories for Filter
    const categories = ['TÜMÜ', ...Array.from(new Set(stocks.map(s => s.category || s.type).filter(Boolean)))];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-6 sticky top-0 z-30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-0">
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold text-slate-800">Satınalma</h1>
                            <p className="text-xs lg:text-sm text-slate-500">Alış faturaları ve tedarikçi yönetimi.</p>
                        </div>
                        <button
                            onClick={() => {
                                setNewOrder({ supplier: '', supplierId: '', description: '', status: 'Bekliyor', category: 'Diğer', targetLocation: locations[0] || '', items: [] });
                                setIsOrderModalOpen(true);
                            }}
                            className="bg-emerald-600 text-white px-5 lg:px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition active:scale-95 w-full sm:w-auto"
                        >
                            + Yeni Alış Faturası
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-4 lg:p-8">
                    {activeTab === 'orders' && (
                        <div className="space-y-4">
                            {/* Invoice Category Tabs */}
                            <div className="flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                {[{ id: 'TÜMÜ', label: 'Tümü' }, ...(invoiceTabLabels.length > 0 ? invoiceTabLabels : tenantInvoiceCategories)].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map((tab: { id: string; label: string }) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSelectedInvoiceTab(tab.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedInvoiceTab === tab.id
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Desktop Table */}
                                <table className="hidden lg:table w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Tedarikçi / Cari</th>
                                            <th className="px-6 py-4">Belge No</th>
                                            <th className="px-6 py-4">Tarih</th>
                                            <th className="px-6 py-4">Kategori</th>
                                            <th className="px-6 py-4">Durum</th>
                                            <th className="px-6 py-4">İçerik</th>
                                            <th className="px-6 py-4 text-right">Toplam Tutar</th>
                                            <th className="px-6 py-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {orders
                                            .filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab)
                                            .map((order, idx) => (
                                                <tr key={`${order.id}-${order.supplierId || ''}-${order.orderDate || ''}-${idx}`} className="hover:bg-slate-50 transition">
                                                    <td className="px-6 py-4 font-bold text-slate-700">{order.supplier}</td>
                                                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{order.id}</td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold border ${order.category === 'HIZ' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                            order.category?.startsWith('150') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                            }`}>
                                                            {order.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-black border ${order.status === 'Tamamlandı' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            order.status === 'İptal' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        <div className="flex flex-col gap-1">
                                                            {order.items && order.items.length > 0 ? (
                                                                order.items.map((item: any, idx: number) => (
                                                                    <span key={idx} className="text-xs">
                                                                        {item.amount} {item.unit || 'Adet'} x {item.name || 'Ürün'}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-500">
                                                                    {order.KalemSayisi > 0 ? `${order.KalemSayisi} Kalem` : 'Kalem yok'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                                                        ₺{order.totalAmount ? order.totalAmount.toLocaleString() : '0'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setNewOrder({
                                                                        supplier: order.supplier,
                                                                        supplierId: order.supplierId || '',
                                                                        description: order.description || order.id || '',
                                                                        status: order.status,
                                                                        category: order.category || 'Diğer',
                                                                        targetLocation: order.targetLocation || locations[0] || '',
                                                                        items: []
                                                                    });
                                                                    fetchInvoiceDetails(order.id, order.supplierId);
                                                                    setIsOrderModalOpen(true);
                                                                }}
                                                                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition"
                                                            >
                                                                Düzenle
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const items = await fetchInvoiceDetails(order.id, order.supplierId);
                                                                    setPreviewInvoice({ ...order, items });
                                                                    setIsPreviewModalOpen(true);
                                                                }}
                                                                className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition"
                                                            >
                                                                Önizleme
                                                            </button>
                                                            {order.status === 'Bekliyor' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateOrderStatus(order.id, 'Tamamlandı')}
                                                                        className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-100 transition"
                                                                    >
                                                                        Teslim Al
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateOrderStatus(order.id, 'İptal')}
                                                                        className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-100 transition"
                                                                    >
                                                                        İptal
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        {orders.filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab).length === 0 && (
                                            <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Bu kategoride kayıtlı fatura bulunmuyor.</td></tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Card View */}
                                <div className="lg:hidden divide-y divide-slate-100">
                                    {orders
                                        .filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab)
                                        .map((order, idx) => (
                                            <div key={`${order.id}-${order.supplierId || ''}-${order.orderDate || ''}-${idx}`} className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 text-sm">{order.supplier}</span>
                                                            <span className={`w-fit px-1.5 py-0.5 rounded text-[8px] uppercase font-black border mt-1 ${order.category === 'HIZ' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                order.category?.startsWith('150') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                                }`}>
                                                                {order.category}
                                                            </span>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black ${order.status === 'Tamamlandı' ? 'bg-emerald-50 text-emerald-600' :
                                                            order.status === 'İptal' ? 'bg-rose-50 text-rose-600' :
                                                                'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-bold text-slate-800 text-sm">₺{order.totalAmount ? order.totalAmount.toLocaleString() : '0'}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-mono mb-2">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}</p>
                                                <div className="text-[11px] text-slate-500 mb-3">
                                                    {order.items?.map((item: any, idx: number) => (
                                                        <span key={idx} className="mr-2">{item.amount} {item.unit || 'Adet'} x {item.name || 'Ürün'}</span>
                                                    ))}
                                                    {(!order.items || order.items.length === 0) && <span className="italic text-slate-400">Kalem yok</span>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setNewOrder({
                                                                supplier: order.supplier,
                                                                supplierId: order.supplierId || '',
                                                                description: order.description || order.id || '',
                                                                status: order.status,
                                                                category: order.category || 'Diğer',
                                                                targetLocation: order.targetLocation || locations[0] || '',
                                                                items: []
                                                            });
                                                            fetchInvoiceDetails(order.id, order.supplierId);
                                                            setIsOrderModalOpen(true);
                                                        }}
                                                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95"
                                                    >
                                                        Düzenle
                                                    </button>
                                                    {order.status === 'Bekliyor' && (
                                                        <>
                                                            <button onClick={() => updateOrderStatus(order.id, 'Tamamlandı')} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">Teslim Al</button>
                                                            <button onClick={() => updateOrderStatus(order.id, 'İptal')} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">İptal</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    {orders.filter(order => selectedInvoiceTab === 'TÜMÜ' || order.category === selectedInvoiceTab).length === 0 && (
                                        <div className="px-6 py-12 text-center text-slate-400 italic">Bu kategoride kayıtlı fatura bulunmuyor.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Order Modal */}
                {isOrderModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {newOrder.status !== 'Bekliyor' ? 'Fatura Detayı' : 'Yeni Alış Faturası'}
                                </h3>
                                <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tedarikçi (Cari)</label>
                                        <select
                                            value={newOrder.supplierId}
                                            onChange={(e) => {
                                                setNewOrder({ ...newOrder, supplierId: e.target.value });
                                            }}
                                            disabled={newOrder.status !== 'Bekliyor'}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm disabled:bg-slate-50"
                                        >
                                            <option value="">Seçiniz...</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Açıklama / Fatura No</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: MAT-2024001"
                                            value={newOrder.description}
                                            onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                                            disabled={newOrder.status !== 'Bekliyor'}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kategori</label>
                                        <select
                                            value={newOrder.category}
                                            onChange={(e) => setNewOrder({ ...newOrder, category: e.target.value })}
                                            disabled={newOrder.status !== 'Bekliyor'}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm disabled:bg-slate-50"
                                        >
                                            {(tenantInvoiceCategories.length > 0 ? tenantInvoiceCategories : invoiceTabLabels.filter(t => t.id !== 'TÜMÜ')).map(c => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                            <option value="Diğer">Diğer</option>
                                        </select>
                                    </div>

                                    {/* Location Selection */}
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Teslim Alınacak Konum (Depo/Sera)</label>
                                        <select
                                            value={newOrder.targetLocation}
                                            onChange={(e) => setNewOrder({ ...newOrder, targetLocation: e.target.value })}
                                            disabled={newOrder.status !== 'Bekliyor'}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm disabled:bg-slate-50"
                                        >
                                            {locations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">Bu faturadaki ürünler teslim alındığında bu konuma eklenecektir.</p>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fatura Kalemleri</span>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingItemIndex(null); setTempItem({ materialId: '', amount: 0, unitPrice: 0 }); setIsItemModalOpen(true); }}
                                            className="text-emerald-600 text-xs font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg transition"
                                        >
                                            + Ürün/Hammadde Ekle
                                        </button>
                                    </div>

                                    {newOrder.items.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            Kalem eklenmedi.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {newOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                                                        <p className="text-xs text-slate-400">{item.amount} {item.unit} x ₺{item.unitPrice}</p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-2 shrink-0">
                                                        <p className="font-mono font-bold text-slate-800">₺{(item.amount * item.unitPrice).toLocaleString()}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTempItem({ materialId: item.materialId || '', amount: item.amount || 0, unitPrice: item.unitPrice || 0 });
                                                                setEditingItemIndex(idx);
                                                                setIsItemModalOpen(true);
                                                            }}
                                                            className="text-amber-600 hover:text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200 hover:bg-amber-50"
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                            className="text-rose-600 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded border border-rose-200 hover:bg-rose-50"
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between pt-4 border-t border-slate-100">
                                                <span className="font-bold text-slate-500">TOPLAM</span>
                                                <span className="font-mono font-black text-xl text-emerald-600">
                                                    ₺{newOrder.items.reduce((sum, item) => sum + (item.amount * item.unitPrice), 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-4">
                                <button onClick={() => setIsOrderModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">
                                    {newOrder.status === 'Bekliyor' ? 'İptal' : 'Kapat'}
                                </button>
                                {newOrder.status === 'Bekliyor' && (
                                    <button onClick={handleCreateOrder} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition">Kaydet</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sub Modal: Add Item */}
                {isItemModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-3xl sm:rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[95vh] overflow-y-auto">
                            <h4 className="font-bold text-slate-800 mb-4">{editingItemIndex !== null ? 'Kalem Düzenle' : 'Ürün Seçimi'}</h4>

                            <div className="space-y-4">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ürün Grubu Filtresi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedCategory === cat
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stok Kartı / Malzeme</label>
                                    <select
                                        value={tempItem.materialId}
                                        onChange={(e) => setTempItem({ ...tempItem, materialId: e.target.value })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm"
                                        size={5} // Show multiple items
                                    >
                                        {filteredStocks.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (Stok: {s.currentStock || 0} {s.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Miktar</label>
                                        <input
                                            type="number"
                                            value={tempItem.amount}
                                            onChange={(e) => setTempItem({ ...tempItem, amount: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Birim Fiyat (TL)</label>
                                        <input
                                            type="number"
                                            value={tempItem.unitPrice}
                                            onChange={(e) => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => { setIsItemModalOpen(false); setEditingItemIndex(null); setTempItem({ materialId: '', amount: 0, unitPrice: 0 }); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">Vazgeç</button>
                                    <button onClick={addItemToOrder} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-md">{editingItemIndex !== null ? 'Güncelle' : 'Listeye Ekle'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* E-Fatura Preview Modal */}
                {isPreviewModalOpen && previewInvoice && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                        <div className="bg-white shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col font-sans relative">
                            {/* Toolbar */}
                            <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center print:hidden">
                                <div className="flex gap-2">
                                    <button onClick={() => window.print()} className="bg-sky-50 text-sky-600 px-4 py-2 rounded font-bold text-xs hover:bg-sky-100 transition">🖨️ Yazdır</button>
                                </div>
                                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black leading-none px-2">×</button>
                            </div>

                            {/* Invoice Content */}
                            <div className="p-8 sm:p-12 overflow-y-auto" id="invoice-preview" style={{ backgroundColor: '#fff', color: '#000' }}>
                                {/* Header */}
                                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                                    <div>
                                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">E-Fatura</h1>
                                        <p className="text-sm font-bold text-slate-500 mt-2">Belge No: {previewInvoice.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-bold bg-slate-900 text-white px-4 py-1 inline-block uppercase tracking-widest">FİDANX A.Ş.</h2>
                                        <p className="text-xs text-slate-600 mt-2 font-mono">Vergi No: 1234567890</p>
                                        <p className="text-xs text-slate-600 font-mono">Tarih: {new Date(previewInvoice.orderDate).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="flex justify-between mb-8 gap-8">
                                    <div className="flex-1">
                                        <h3 className="text-xs font-black text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">Sayın</h3>
                                        <p className="font-bold text-slate-800 uppercase">{previewInvoice.supplier}</p>
                                        <p className="text-sm text-slate-600 mt-1 font-mono">Cari Kodu: {previewInvoice.supplierId}</p>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <table className="w-full text-left font-mono text-sm mb-8 border-collapse">
                                    <thead>
                                        <tr className="border-y-2 border-slate-800 bg-slate-50">
                                            <th className="py-3 px-2 text-slate-800 font-bold uppercase w-1/2">Hizmet / Ürün</th>
                                            <th className="py-3 px-2 text-slate-800 font-bold uppercase text-right">Miktar</th>
                                            <th className="py-3 px-2 text-slate-800 font-bold uppercase text-right">Birim Fiyat</th>
                                            <th className="py-3 px-2 text-slate-800 font-bold uppercase text-right">Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {previewInvoice.items?.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="py-3 px-2 font-bold text-slate-700">{item.name}</td>
                                                <td className="py-3 px-2 text-right">{item.amount} {item.unit}</td>
                                                <td className="py-3 px-2 text-right">₺{Number(item.unitPrice).toLocaleString()}</td>
                                                <td className="py-3 px-2 text-right font-bold">₺{(item.amount * item.unitPrice).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="flex justify-end">
                                    <div className="w-64">
                                        <div className="flex justify-between py-2 border-b border-slate-200">
                                            <span className="font-bold text-slate-500">Ara Toplam:</span>
                                            <span className="font-mono">₺{previewInvoice.items?.reduce((s: number, i: any) => s + (i.amount * i.unitPrice), 0).toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200 text-slate-500">
                                            <span className="font-bold">KDV:</span>
                                            <span className="font-mono">Hesaplanmadı</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b-2 border-slate-800 bg-slate-50 px-2 mt-2">
                                            <span className="font-black text-slate-800 uppercase">Genel Toplam:</span>
                                            <span className="font-black font-mono text-slate-900">₺{previewInvoice.totalAmount?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Notes */}
                                <div className="mt-12 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center font-mono">
                                    Bu bir E-Fatura önizlemesidir. Yalnızca bilgilendirme amaçlıdır.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
