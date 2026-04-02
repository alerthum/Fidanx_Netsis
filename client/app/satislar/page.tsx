"use client";
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';

export default function SatislarPage() {
    const [activeTab, setActiveTab] = useState<'NEW_ORDER' | 'ORDERS' | 'CUSTOMERS'>('ORDERS');
    const [draftOrder, setDraftOrder] = useState<any>({
        id: `FAT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        customerId: '',
        customerName: '',
        orderDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        taxIncluded: false,
        items: [],
        description: ''
    });
    const [customers, setCustomers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSelectCustomerModalOpen, setIsSelectCustomerModalOpen] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState<any>(null);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('TÜMÜ');
    const [tempItem, setTempItem] = useState({
        materialId: '',
        amount: 1,
        unitPrice: 0
    });
    const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editOrder, setEditOrder] = useState({
        id: '',
        supplier: '',
        supplierId: '',
        description: '',
        status: 'Bekliyor',
        category: 'Diğer',
        items: [] as any[]
    });
    const [newCustomer, setNewCustomer] = useState({
        id: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        note: '',
        type: 'Bireysel', // Bireysel, Kurumsal
        taxId: '',
        taxOffice: '',
        contacts: [] as any[], // {name, phone, role}
        addresses: [] as any[], // {title, address}
        isEdit: false,
        // New ERP fields
        sector: '',
        currency: 'TRY',
        paymentTerm: '',
        riskLimit: '',
        discountRatio: '',
        website: '',
        kepAddress: '',
        city: '',
        district: '',
        zipCode: ''
    });

    const API_URL = '/api';

    React.useEffect(() => {
        fetchCustomers();
        fetchOrders();
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/stocks/list`);
            if (!res.ok) return;
            const data = await res.json().catch(() => []);
            const mapped = Array.isArray(data) ? data.map((s: any) => ({
                id: s.StokKodu,
                name: s.StokAdi,
                currentStock: s.Bakiye,
                wholesalePrice: s.SatisFiyat1 || 0,
                unit: s.OlcuBirimi1 || 'Adet',
                type: 'CUTTING',
                category: s.GrupIsim || s.Tip || 'Diğer'
            })) : [];
            setStocks(mapped);
        } catch (err) { }
    };

    React.useEffect(() => {
        const saved = localStorage.getItem('draftSalesOrder_Fidanx');
        if (saved) {
            setDraftOrder(JSON.parse(saved));
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem('draftSalesOrder_Fidanx', JSON.stringify(draftOrder));
    }, [draftOrder]);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/customers?type=120`);
            if (!res.ok) return;
            const data = await res.json().catch(() => []);
            const mapped = Array.isArray(data) ? data.map((c: any) => ({
                id: c.CariKodu,
                name: c.CariAdi,
                phone: c.Telefon,
                email: c.Email,
                address: c.CariAdres,
                taxId: c.CariKodu,
                type: 'Kurumsal'
            })) : [];
            setCustomers(mapped);
        } catch (err) { setCustomers([]); }
    };

    const fetchOrders = async () => {
        try {
            // Netsis satış faturlarını 'Satış' olarak gösteriyoruz
            const res = await fetch(`${API_URL}/netsis/invoices?faturaTuru=1`);
            const data = await res.json();
            const mapped = (data && data.items) ? data.items.map((inv: any) => ({
                id: inv.BelgeNo,
                customerName: inv.CariAdi,
                customerId: inv.CariKodu,
                orderDate: inv.Tarih,
                status: 'Tamamlandı', // Kesilmiş fatura tamamlanmış oluşturulmuştur
                totalAmount: inv.ToplamTutar
            })) : [];
            setOrders(mapped);
        } catch (err) { setOrders([]); }
    };

    const fetchInvoiceDetails = async (belgeNo: string, cariKodu: string) => {
        try {
            const res = await fetch(`${API_URL}/netsis/invoices/${belgeNo}/details?cariKodu=${cariKodu}&faturaTuru=1`);
            if (res.ok) {
                const data = await res.json();
                const mappedItems = Array.isArray(data) ? data.map((item: any) => ({
                    name: item.StokAdi,
                    amount: item.Miktar,
                    unit: item.Birim || 'Adet',
                    unitPrice: item.BirimFiyat,
                    materialId: item.StokKodu
                })) : [];
                return mappedItems;
            }
        } catch (err) {
            console.error('Fatura detayları çekilemedi:', err);
        }
        return [];
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = newCustomer.isEdit
                ? `${API_URL}/sales/customers/${newCustomer.id}?tenantId=demo-tenant`
                : `${API_URL}/sales/customers?tenantId=demo-tenant`;

            const method = newCustomer.isEdit ? 'PATCH' : 'POST';

            const res = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer),
            });
            if (res.ok) {
                setIsCustomerModalOpen(false);
                resetCustomerForm();
                fetchCustomers();
                // Aktivite Logla
                fetch(`${API_URL}/activity?tenantId=demo-tenant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: newCustomer.isEdit ? 'Müşteri Güncelleme' : 'Yeni Müşteri',
                        title: `${newCustomer.name} ${newCustomer.isEdit ? 'güncellendi' : 'eklendi'}.`,
                        icon: '👤',
                        color: 'bg-purple-50 text-purple-600'
                    })
                });
            }
        } catch (err) { }
    };

    const resetCustomerForm = () => {
        setNewCustomer({
            id: '', name: '', phone: '', email: '', address: '', note: '',
            type: 'Bireysel', taxId: '', taxOffice: '', contacts: [], addresses: [], isEdit: false,
            sector: '', currency: 'TRY', paymentTerm: '', riskLimit: '', discountRatio: '', website: '', kepAddress: '', city: '', district: '', zipCode: ''
        });
    };

    const openEditCustomer = (c: any) => {
        setNewCustomer({
            ...newCustomer, // Keep default fields
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            note: c.note || '',
            type: c.type || 'Bireysel',
            taxId: c.taxId || '',
            taxOffice: c.taxOffice || '',
            contacts: c.contacts || [],
            addresses: c.addresses || [],
            isEdit: true,
            // Map new fields if they exist in future backend
            sector: c.sector || '',
            currency: c.currency || 'TRY',
            paymentTerm: c.paymentTerm || '',
            riskLimit: c.riskLimit || '',
            discountRatio: c.discountRatio || '',
            website: c.website || '',
            kepAddress: c.kepAddress || '',
            city: c.city || '',
            district: c.district || '',
            zipCode: c.zipCode || ''
        });
        setIsCustomerModalOpen(true);
    };

    const addDraftItem = () => {
        if (!tempItem.materialId || tempItem.amount <= 0) return alert('Lütfen malzeme ve miktar seçin.');

        const product = stocks.find(s => s.id === tempItem.materialId);
        if (!product) return;

        const existing = draftOrder.items.find((c: any) => c.materialId === tempItem.materialId || c.id === tempItem.materialId);

        const newItem = {
            id: product.id,
            materialId: product.id,
            name: product.name,
            qty: tempItem.amount,
            amount: tempItem.amount,
            price: tempItem.unitPrice,
            unitPrice: tempItem.unitPrice,
            unit: product.unit || 'Adet'
        };

        if (existing) {
            setDraftOrder({
                ...draftOrder,
                items: draftOrder.items.map((c: any) =>
                    c.materialId === tempItem.materialId ? { ...c, amount: c.amount + tempItem.amount, qty: c.qty + tempItem.amount, price: tempItem.unitPrice, unitPrice: tempItem.unitPrice } : c
                )
            });
        } else {
            setDraftOrder({
                ...draftOrder,
                items: [...draftOrder.items, newItem]
            });
        }
        setIsProductModalOpen(false);
        setTempItem({ materialId: '', amount: 1, unitPrice: 0 });
    };

    const handleCompleteOrder = async () => {
        if (!draftOrder.customerId) return alert('Lütfen müşteri seçin.');
        if (draftOrder.items.length === 0) return alert('Kalem listesi boş.');

        const totalAmount = draftOrder.items.reduce((acc: any, item: any) => acc + (item.amount * item.unitPrice), 0);

        // Netsis entegrasyonuna gönderilecek format
        const subTotal = totalAmount;
        const totalTax = draftOrder.taxIncluded ? 0 : totalAmount * 0.20; // Example
        const genTotal = subTotal + totalTax;

        const payload = {
            belgeNo: draftOrder.id,
            cariKodu: draftOrder.customerId,
            faturaTuru: '1', // Satis faturasi
            items: draftOrder.items.map((it: any) => ({
                StokKodu: it.materialId,
                Miktar: it.amount,
                BirimFiyat: it.unitPrice
            })),
            totals: { subTotal, tax: totalTax, total: genTotal },
            description: draftOrder.description
        };

        try {
            const res = await fetch(`${API_URL}/netsis/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                alert('Fatura başarıyla oluşturuldu.');
                // create a new blank draft
                setDraftOrder({
                    id: `FAT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                    customerId: '',
                    customerName: '',
                    orderDate: new Date().toISOString().split('T')[0],
                    dueDate: '',
                    taxIncluded: false,
                    items: [],
                    description: ''
                });
                setActiveTab('ORDERS');
                fetchOrders();
                // Aktivite Logla
                fetch(`${API_URL}/activity?tenantId=demo-tenant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'Satış/Sipariş', title: `${draftOrder.customerName} - ₺${genTotal.toLocaleString()} fatura oluşturuldu.`, icon: '💰', color: 'bg-emerald-50 text-emerald-600' })
                });
            } else {
                alert('Fatura oluşturulurken hata oluştu.');
            }
        } catch (err) { }
    };

    const handleUpdateEditOrder = async () => {
        const totalAmount = editOrder.items.reduce((sum, item) => sum + (item.amount * item.unitPrice), 0);
        const subTotal = totalAmount;
        const totalTax = totalAmount * 0.20;
        const genTotal = subTotal + totalTax;

        try {
            const res = await fetch(`${API_URL}/netsis/invoices/${editOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cariKodu: editOrder.supplierId,
                    faturaTuru: '1', // Satis faturasi
                    items: editOrder.items,
                    totals: { subTotal, tax: totalTax, total: genTotal }
                }),
            });
            if (res.ok) {
                alert('Fatura Netsis üzerinde başarıyla güncellendi.');
                setIsEditOrderModalOpen(false);
                fetchOrders();
            } else {
                alert('Fatura güncellenirken hata oluştu.');
            }
        } catch (err) { }
    };

    const addEditItemToEditOrder = () => {
        if (!tempItem.materialId || tempItem.amount <= 0) return alert('Lütfen malzeme ve miktar seçin.');

        const material = stocks.find(s => s.id === tempItem.materialId);
        const newItem = {
            materialId: tempItem.materialId,
            StokKodu: tempItem.materialId, // For Netsis backward compatibility
            amount: tempItem.amount,
            unitPrice: tempItem.unitPrice,
            name: material?.name || 'Bilinmiyor',
            unit: material?.unit || 'Adet'
        };

        if (editingItemIndex !== null) {
            setEditOrder(prev => ({
                ...prev,
                items: prev.items.map((it: any, i: number) => i === editingItemIndex ? newItem : it)
            }));
            setEditingItemIndex(null);
        } else {
            setEditOrder(prev => ({ ...prev, items: [...prev.items, newItem] }));
        }
        setTempItem({ materialId: '', amount: 1, unitPrice: 0 });
        setIsEditItemModalOpen(false);
    };

    const updateOrderStatus = async (id: string, status: string) => {
        if (status === 'Tamamlandı' && !confirm('Sipariş tamamlandığında stoklar düşülecektir. Emin misiniz?')) return;

        try {
            const res = await fetch(`${API_URL}/sales/orders/${id}/status?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                fetchOrders();
                fetchStocks(); // Stokları güncelle

                // Aktivite
                if (status === 'Tamamlandı') {
                    fetch(`${API_URL}/activity?tenantId=demo-tenant`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'Satış Onayı', title: `Sipariş tamamlandı ve stoktan düşüldü.`, icon: '✅', color: 'bg-emerald-50 text-emerald-600' })
                    });
                }
            }
        } catch (err) { alert('İşlem başarısız.'); }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 p-4 lg:p-6 lg:sticky lg:top-0 z-30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Satış & CRM</h1>
                            <p className="text-xs lg:text-sm text-slate-500">Müşteri satışları ve ilişkileri yönetimi.</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => { resetCustomerForm(); setIsCustomerModalOpen(true); }}
                                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition"
                            >
                                + Yeni Müşteri
                            </button>
                            <button
                                onClick={() => setActiveTab('NEW_ORDER')}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition"
                            >
                                + Yeni Satış
                            </button>
                            {activeTab === 'ORDERS' && <ExportButton title="Satışlar" tableId="orders-table" />}
                            {activeTab === 'CUSTOMERS' && <ExportButton title="Müşteriler" tableId="customers-table" />}
                        </div>
                    </div>

                    <div className="flex gap-8 border-b border-slate-100">
                        {['Satışlar', 'Müşteriler', 'Yeni Satış'].map((tab, idx) => {
                            const val = ['ORDERS', 'CUSTOMERS', 'NEW_ORDER'][idx] as any;
                            return (
                                <button
                                    key={val}
                                    onClick={() => setActiveTab(val)}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === val ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab}
                                    {activeTab === val && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
                                </button>
                            );
                        })}
                    </div>
                </header>

                <div className="p-4 lg:p-8">
                    {activeTab === 'NEW_ORDER' && (
                        <div className="max-w-6xl mx-auto pb-32">
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Yeni Satış Faturası</h2>
                                        <p className="text-xs text-slate-500 mt-1">Sipariş / Fatura oluşturun veya mevcut taslaktan devam edin.</p>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button onClick={() => {
                                            if (confirm('Taslağı silmek ve yeni bir faturaya başlamak istediğinize emin misiniz?')) {
                                                const newId = `TASLAK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                                                setDraftOrder({
                                                    id: newId,
                                                    customerId: '',
                                                    customerName: '',
                                                    orderDate: new Date().toISOString().split('T')[0],
                                                    dueDate: '',
                                                    taxIncluded: false,
                                                    items: [],
                                                    description: ''
                                                });
                                            }
                                        }} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition active:scale-95">İptal / Temizle</button>
                                        <button onClick={handleCompleteOrder} className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold border border-emerald-700 hover:bg-emerald-700 shadow-md transition active:scale-95">Faturayı Kaydet</button>
                                    </div>
                                </div>
                                <div className="p-4 sm:p-8 space-y-8 lg:space-y-12 transition-all">
                                    {/* Fatura Bilgileri */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Fatura Bilgileri</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura No</label>
                                                <input type="text" value={draftOrder.id} disabled className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cari Seçin <span className="text-rose-500">*</span></label>
                                                <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 cursor-pointer shadow-sm" onClick={() => setIsSelectCustomerModalOpen(true)}>
                                                    <div className="p-2 px-3 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-slate-400">
                                                        👤
                                                    </div>
                                                    <input type="text" value={draftOrder.customerName || 'Cari seçin...'} readOnly className="w-full p-2.5 text-sm font-bold text-slate-700 outline-none cursor-pointer bg-transparent" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura Tarihi</label>
                                                <input type="date" value={draftOrder.orderDate} onChange={(e) => setDraftOrder({ ...draftOrder, orderDate: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vade Tarihi (Opsiyonel)</label>
                                                <input type="date" value={draftOrder.dueDate} onChange={(e) => setDraftOrder({ ...draftOrder, dueDate: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700" />
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">KDV Tipi</label>
                                            <div className="flex gap-4">
                                                <button onClick={() => setDraftOrder({ ...draftOrder, taxIncluded: false })} className={`flex-1 sm:flex-none sm:w-48 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${!draftOrder.taxIncluded ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-inner' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {!draftOrder.taxIncluded && <span className="bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                                                    KDV Hariç
                                                </button>
                                                <button onClick={() => setDraftOrder({ ...draftOrder, taxIncluded: true })} className={`flex-1 sm:flex-none sm:w-48 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${draftOrder.taxIncluded ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-inner' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {draftOrder.taxIncluded && <span className="bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                                                    KDV Dahil
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fatura Kalemleri */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800">Fatura Kalemleri</h3>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Sipariş seçimi zorunlu değildir. Ürünleri manuel ekleyebilirsiniz.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsProductModalOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] sm:text-xs font-bold shadow-md hover:bg-blue-600 transition whitespace-nowrap active:scale-95">+ Kalem Ekle</button>
                                            </div>
                                        </div>

                                        {draftOrder.items.length === 0 ? (
                                            <div className="py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                                <span className="text-4xl mb-4 opacity-50 grayscale">📦</span>
                                                <p className="text-xs font-medium italic">Henüz kalem eklenmedi.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                                <table className="w-full text-left min-w-[700px]">
                                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                                                        <tr>
                                                            <th className="p-4 border-b border-slate-200 w-1/3">Stok Kodu / Adı</th>
                                                            <th className="p-4 border-b border-slate-200 text-center w-32">Miktar</th>
                                                            <th className="p-4 border-b border-slate-200 text-right w-36">Birim Fiyat</th>
                                                            <th className="p-4 border-b border-slate-200 text-right w-36">Tutar</th>
                                                            <th className="p-4 border-b border-slate-200 text-center w-20">İşlem</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-sm bg-white">
                                                        {draftOrder.items.map((item: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="p-4 font-bold text-slate-700">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">{item.materialId}</span>
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-sm">
                                                                        <button onClick={() => setDraftOrder({ ...draftOrder, items: draftOrder.items.map((it: any, i: number) => i === idx ? { ...it, amount: Math.max(1, it.amount - 1) } : it) })} className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 border-r border-slate-200 font-bold transition">-</button>
                                                                        <span className="px-4 py-1.5 font-mono text-sm font-bold min-w-[48px] text-center bg-white">{item.amount}</span>
                                                                        <button onClick={() => setDraftOrder({ ...draftOrder, items: draftOrder.items.map((it: any, i: number) => i === idx ? { ...it, amount: it.amount + 1 } : it) })} className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 border-l border-slate-200 font-bold transition">+</button>
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-400 uppercase font-black mt-1 tracking-widest">{item.unit || 'Adet'}</div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="inline-flex items-center gap-1 justify-end">
                                                                        <span className="text-slate-400 font-bold text-xs mt-0.5">₺</span>
                                                                        <input type="number"
                                                                            value={item.unitPrice}
                                                                            onChange={(e) => setDraftOrder({ ...draftOrder, items: draftOrder.items.map((it: any, i: number) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it) })}
                                                                            className="w-24 p-1.5 border border-slate-200 shadow-inner rounded-lg text-right outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right font-black text-slate-800 font-mono text-base">₺{(item.amount * item.unitPrice).toLocaleString()}</td>
                                                                <td className="p-4 text-center">
                                                                    <button onClick={() => setDraftOrder({ ...draftOrder, items: draftOrder.items.filter((_: any, i: number) => i !== idx) })} className="text-rose-400 hover:text-white hover:bg-rose-500 p-2 rounded-lg transition active:scale-90 shadow-sm border border-transparent hover:border-rose-600">
                                                                        🗑️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Toplam Bilgileri */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Toplam Bilgileri</h3>
                                        <div className="flex justify-start sm:justify-end">
                                            <div className="w-full sm:w-96 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-sm shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                                                <div className="flex justify-between items-center text-slate-500 font-bold">
                                                    <span>Ara Toplam:</span>
                                                    <span className="font-mono text-slate-700">₺{draftOrder.items.reduce((s: any, it: any) => s + (it.amount * it.unitPrice), 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 font-bold">
                                                    <span>Öngörülen KDV (%20):</span>
                                                    <span className="font-mono text-slate-700">₺{(draftOrder.items.reduce((s: any, it: any) => s + (it.amount * it.unitPrice), 0) * 0.2).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-200">
                                                    <span className="font-black text-slate-800 uppercase text-xs">Genel Toplam (Dahili)</span>
                                                    <span className="font-mono font-black text-2xl text-emerald-600 tracking-tight">
                                                        ₺{(draftOrder.items.reduce((s: any, it: any) => s + (it.amount * it.unitPrice), 0) * 1.2).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Açıklama */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama (Opsiyonel)</label>
                                        <textarea value={draftOrder.description || ''} onChange={(e) => setDraftOrder({ ...draftOrder, description: e.target.value })} className="w-full p-4 bg-white border border-slate-200 shadow-inner rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm h-28 resize-none font-medium text-slate-700" placeholder="Fatura veya siparişle ilgili notunuz..."></textarea>
                                    </div>

                                </div>
                            </div>

                            {/* Sticky Summary Bar for New Order */}
                            <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 sm:p-6 border-t border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Miktar</span>
                                        <span className="text-xl font-black text-white">{draftOrder.items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0).toLocaleString()} <small className="text-[10px] font-bold text-slate-500">ADET</small></span>
                                    </div>
                                    <div className="flex flex-col border-l border-white/10 pl-8">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahmini Toplam (KDV Dahil)</span>
                                        <span className="text-2xl font-black text-emerald-400">₺{(draftOrder.items.reduce((sum: number, item: any) => sum + (item.amount * item.unitPrice), 0) * 1.2).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => {
                                        if (confirm('Tüm veriler temizlenecek. Devam edilsin mi?')) {
                                            localStorage.removeItem('draftSalesOrder_Fidanx');
                                            window.location.reload();
                                        }
                                    }} className="flex-1 sm:flex-none px-6 py-4 font-bold text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition uppercase text-xs tracking-widest">
                                        TEMİZLE
                                    </button>
                                    <button onClick={handleCompleteOrder} className="flex-1 sm:flex-none px-12 py-4 bg-emerald-600 text-white font-black rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition active:scale-[0.98] uppercase tracking-widest text-sm">
                                        FATURAYI KAYDET (NETSIS)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ORDERS' && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            {/* Desktop Table */}
                            <table className="hidden lg:table w-full text-left font-bold text-sm" id="orders-table">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Müşteri</th>
                                        <th className="px-6 py-4">Tarih</th>
                                        <th className="px-6 py-4">Durum</th>
                                        <th className="px-6 py-4">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map(o => (
                                        <tr key={o.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-slate-700">{o.customerName || 'Belirtilmemiş'}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black border ${o.status === 'Tamamlandı' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    o.status === 'İptal' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 font-mono">₺{(o.totalAmount || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const items = await fetchInvoiceDetails(o.id, o.customerId);
                                                            setEditOrder({
                                                                id: o.id,
                                                                supplier: o.customerName || 'Bilinmiyor',
                                                                supplierId: o.customerId,
                                                                description: o.description || o.id,
                                                                status: o.status,
                                                                category: o.category || 'Diğer',
                                                                items: items
                                                            });
                                                            setIsEditOrderModalOpen(true);
                                                        }}
                                                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition"
                                                    >
                                                        Değiştir
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const items = await fetchInvoiceDetails(o.id, o.customerId);
                                                            setPreviewInvoice({ ...o, items, supplier: o.customerName, supplierId: o.customerId });
                                                            setIsPreviewModalOpen(true);
                                                        }}
                                                        className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition"
                                                    >
                                                        Önizleme
                                                    </button>
                                                    {o.status === 'Bekliyor' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateOrderStatus(o.id, 'Tamamlandı')}
                                                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                                                            >
                                                                ✓ Onayla
                                                            </button>
                                                            <button
                                                                onClick={() => updateOrderStatus(o.id, 'İptal')}
                                                                className="text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                                                            >
                                                                × İptal
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Kayıtlı satış bulunmuyor.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-slate-100">
                                {orders.map(o => (
                                    <div key={o.id} className="p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-700 text-sm">{o.customerName || 'Belirtilmemiş'}</span>
                                            <span className="font-mono font-bold text-slate-900 text-sm">₺{(o.totalAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] text-slate-400 font-mono">{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '-'}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black ${o.status === 'Tamamlandı' ? 'bg-emerald-50 text-emerald-600' :
                                                o.status === 'İptal' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{o.status}</span>
                                        </div>
                                        {o.status === 'Bekliyor' && (
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => updateOrderStatus(o.id, 'Tamamlandı')} className="flex-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">✓ Onayla</button>
                                                <button onClick={() => updateOrderStatus(o.id, 'İptal')} className="flex-1 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">× İptal</button>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={async () => {
                                                const items = await fetchInvoiceDetails(o.id, o.customerId);
                                                setEditOrder({
                                                    id: o.id,
                                                    supplier: o.customerName || 'Bilinmiyor',
                                                    supplierId: o.customerId,
                                                    description: o.description || o.id,
                                                    status: o.status,
                                                    category: o.category || 'Diğer',
                                                    items: items
                                                });
                                                setIsEditOrderModalOpen(true);
                                            }} className="flex-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">Değiştir</button>
                                            <button onClick={async () => {
                                                const items = await fetchInvoiceDetails(o.id, o.customerId);
                                                setPreviewInvoice({ ...o, items, supplier: o.customerName, supplierId: o.customerId });
                                                setIsPreviewModalOpen(true);
                                            }} className="flex-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95">Önizleme</button>
                                        </div>
                                    </div>
                                ))}
                                {orders.length === 0 && (
                                    <div className="px-6 py-12 text-center text-slate-400 italic">Kayıtlı satış bulunmuyor.</div>
                                )}
                            </div>
                        </div>
                    )}


                    {activeTab === 'CUSTOMERS' && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            {/* Desktop Table */}
                            <table className="hidden lg:table w-full text-left" id="customers-table">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Müşteri / Firma</th>
                                        <th className="px-6 py-4">Tür & VKN/TC</th>
                                        <th className="px-6 py-4">İletişim & Yetkili</th>
                                        <th className="px-6 py-4">Adres</th>
                                        <th className="px-6 py-4 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {customers.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 text-sm">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-700">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.type || 'Bireysel'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs">
                                                    {c.taxId ? (
                                                        <>
                                                            <p className="font-mono font-bold text-slate-600">{c.taxId}</p>
                                                            <p className="text-[10px] text-slate-400">{c.taxOffice || 'VD Bilgisi Yok'}</p>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 italic">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <p className="font-bold text-slate-700">{c.phone}</p>
                                                <p className="text-xs">{c.email}</p>
                                                {c.contacts && c.contacts.length > 0 && (
                                                    <div className="mt-1 pt-1 border-t border-slate-100">
                                                        <p className="text-[9px] font-bold text-emerald-600">Yetkili: {c.contacts[0].name}</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">{c.address || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openEditCustomer(c)}
                                                    className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition"
                                                >
                                                    ✏️ Düzenle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Kayıtlı müşteri yok.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-slate-100">
                                {customers.map(c => (
                                    <div key={c.id} className="p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">{c.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{c.type || 'Bireysel'}</p>
                                            </div>
                                            <button
                                                onClick={() => openEditCustomer(c)}
                                                className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold active:scale-95"
                                            >
                                                ✏️ Düzenle
                                            </button>
                                        </div>
                                        <div className="text-[11px] text-slate-500 space-y-0.5">
                                            {c.phone && <p>📞 {c.phone}</p>}
                                            {c.email && <p>✉️ {c.email}</p>}
                                            {c.taxId && <p className="font-mono text-slate-400">VKN: {c.taxId}</p>}
                                        </div>
                                    </div>
                                ))}
                                {customers.length === 0 && (
                                    <div className="px-6 py-12 text-center text-slate-400 italic">Kayıtlı müşteri yok.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed ERP Customer Modal */}
                {isCustomerModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[95vh]">
                            <CustomerModalContent
                                newCustomer={newCustomer}
                                setNewCustomer={setNewCustomer}
                                onClose={() => setIsCustomerModalOpen(false)}
                                onSave={handleCreateCustomer}
                            />
                        </div>
                    </div>
                )}
                {/* Product Modal */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-3xl sm:rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[95vh] overflow-y-auto">
                            <h4 className="font-bold text-slate-800 mb-4">Ürün / Stok Seçimi</h4>

                            <div className="space-y-4">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ürün Grubu Filtresi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['TÜMÜ', ...Array.from(new Set(stocks.map(s => s.category).filter(Boolean)))].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat as string)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedCategory === cat
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {cat as string}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Filter */}
                                <div>
                                    <input
                                        type="text"
                                        placeholder="🔍 Ürün Adı veya Kodu İle Ara..."
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 space-y-4 p-2">
                                    {Array.from(new Set(stocks
                                        .filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory)
                                        .map(s => s.category || 'DİĞER')
                                    )).sort().map(cat => (
                                        <div key={cat} className="space-y-1">
                                            <h5 className="text-[9px] font-black text-slate-400 uppercase px-2 mb-1">{cat}</h5>
                                            <div className="space-y-1">
                                                {stocks
                                                    .filter(s => (s.category || 'DİĞER') === cat)
                                                    .filter(s => s.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) || s.id?.toLowerCase().includes(productSearchQuery.toLowerCase()))
                                                    .map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setTempItem({ ...tempItem, materialId: s.id, unitPrice: (s.wholesalePrice || s.BirimFiyat || 0) })}
                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${tempItem.materialId === s.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[0.99]' : 'bg-white text-slate-700 border-slate-100 hover:border-emerald-300'}`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm truncate">{s.name}</p>
                                                                <p className={`text-[10px] ${tempItem.materialId === s.id ? 'text-emerald-100' : 'text-slate-400'}`}>Kod: {s.id} | Stok: {s.currentStock || 0} Adet</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-bold text-sm">₺{(s.wholesalePrice || s.BirimFiyat || 0).toLocaleString()}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                    {stocks.filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory).filter(s => s.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) || s.id?.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 && (
                                        <p className="py-8 text-center text-slate-400 italic text-xs">Aranan ürün bulunamadı.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Miktar</label>
                                        <input
                                            type="number"
                                            value={tempItem.amount}
                                            onChange={(e) => setTempItem({ ...tempItem, amount: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Birim Fiyat (TL)</label>
                                        <input
                                            type="number"
                                            value={tempItem.unitPrice}
                                            onChange={(e) => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => { setIsProductModalOpen(false); setTempItem({ materialId: '', amount: 1, unitPrice: 0 }); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">Vazgeç</button>
                                    <button onClick={addDraftItem} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-md">+ LİSTEYE EKLE</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Select Customer Modal */}
                {isSelectCustomerModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70]">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Müşteri Seçimi</h3>
                                <button onClick={() => setIsSelectCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                            </div>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="🔍 Müşteri Adı, VKN veya Telefon ile arayın..."
                                    value={customerSearchQuery}
                                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                    className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700"
                                />
                            </div>

                            <div className="overflow-y-auto flex-1 space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50">
                                {customers
                                    .filter(c =>
                                        c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                                        c.phone?.includes(customerSearchQuery) ||
                                        c.taxId?.includes(customerSearchQuery)
                                    )
                                    .map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setDraftOrder({ ...draftOrder, customerId: c.id, customerName: c.name }); setIsSelectCustomerModalOpen(false); }}
                                            className="w-full flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-800">{c.name}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 uppercase">VKN/TC: {c.taxId || 'Yok'} | Tel: {c.phone || 'Yok'}</p>
                                            </div>
                                            <div className="text-emerald-600 font-black text-xl">
                                                ›
                                            </div>
                                        </button>
                                    ))}
                                {customers.length > 0 && customers.filter(c => c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.phone?.includes(customerSearchQuery) || c.taxId?.includes(customerSearchQuery)).length === 0 && (
                                    <div className="p-8 text-center text-slate-400 italic font-medium">Aramanızla eşleşen müşteri bulunamadı.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Order Modal */}
                {isEditOrderModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800">
                                    Satış Faturası Düzenle: {editOrder.id}
                                </h3>
                                <button onClick={() => setIsEditOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Müşteri (Cari)</label>
                                        <input
                                            type="text"
                                            value={editOrder.supplier}
                                            disabled
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-500 disabled:bg-slate-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Durum</label>
                                        <input
                                            type="text"
                                            value={editOrder.status}
                                            disabled
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-500 disabled:bg-slate-50 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fatura Kalemleri</span>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingItemIndex(null); setTempItem({ materialId: '', amount: 1, unitPrice: 0 }); setIsEditItemModalOpen(true); }}
                                            className="text-emerald-600 text-xs font-bold hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg transition"
                                        >
                                            + Kalem Ekle
                                        </button>
                                    </div>

                                    {editOrder.items.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            Kalem bulunamadı.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {editOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-700 text-sm">{item.name || item.StokAdi || item.materialId || item.StokKodu}</p>
                                                        <p className="text-xs text-slate-400">{item.amount || item.Miktar} {item.unit || item.Birim || 'Adet'} x ₺{item.unitPrice || item.BirimFiyat || 0}</p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-2 shrink-0">
                                                        <p className="font-mono font-bold text-slate-800">₺{((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)).toLocaleString()}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTempItem({ materialId: item.materialId || item.StokKodu || '', amount: item.amount || item.Miktar || 1, unitPrice: item.unitPrice || item.BirimFiyat || 0 });
                                                                setEditingItemIndex(idx);
                                                                setIsEditItemModalOpen(true);
                                                            }}
                                                            className="text-amber-600 hover:text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200 hover:bg-amber-50"
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                                            className="text-rose-600 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded border border-rose-200 hover:bg-rose-50"
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Totals Section */}
                                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 relative mt-4">
                                                <div className="flex justify-between items-center text-slate-500 font-bold text-xs uppercase">
                                                    <span>Toplam Miktar:</span>
                                                    <span className="font-mono">{editOrder.items.reduce((sum, item) => sum + (Number(item.amount || item.Miktar) || 0), 0).toLocaleString()} Adet</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 font-bold text-xs uppercase">
                                                    <span>Ara Toplam:</span>
                                                    <span className="font-mono">₺{editOrder.items.reduce((sum, item) => sum + ((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)), 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 font-bold text-xs uppercase">
                                                    <span>Öngörülen KDV (%20):</span>
                                                    <span className="font-mono">₺{(editOrder.items.reduce((sum, item) => sum + ((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)), 0) * 0.2).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                                    <span className="font-bold text-slate-800 uppercase">GENEL TOPLAM</span>
                                                    <span className="font-mono font-black text-2xl text-emerald-600 tracking-tight">
                                                        ₺{(editOrder.items.reduce((sum, item) => sum + ((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)), 0) * 1.2).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
                                <div className="flex gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Miktar</span>
                                        <span className="text-xl font-black text-white">{editOrder.items.reduce((sum, item) => sum + (Number(item.amount || item.Miktar) || 0), 0).toLocaleString()} <small className="text-[10px] font-bold text-slate-500">ADET</small></span>
                                    </div>
                                    <div className="flex flex-col border-l border-white/10 pl-8">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam (KDV Dahil)</span>
                                        <span className="text-2xl font-black text-emerald-400">₺{(editOrder.items.reduce((sum, item) => sum + ((item.amount || item.Miktar || 0) * (item.unitPrice || item.BirimFiyat || 0)), 0) * 1.2).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => setIsEditOrderModalOpen(false)} className="flex-1 sm:flex-none px-6 py-4 font-bold text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition">
                                        VAZGEÇ
                                    </button>
                                    <button onClick={handleUpdateEditOrder} className="flex-1 sm:flex-none px-12 py-4 bg-emerald-600 text-white font-black rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition active:scale-[0.98] uppercase tracking-widest text-sm">
                                        KAYDET & GÜNCELLE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sub Modal: Edit Item from Edit Order */}
                {isEditItemModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-3xl sm:rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[95vh] overflow-y-auto">
                            <h4 className="font-bold text-slate-800 mb-4">{editingItemIndex !== null ? 'Kalem Düzenle' : 'Ürün / Stok Ekle'}</h4>

                            <div className="space-y-4">
                                {/* Category Filter */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ürün Grubu Filtresi</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['TÜMÜ', ...Array.from(new Set(stocks.map(s => s.category).filter(Boolean)))].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat as string)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedCategory === cat
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {cat as string}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Filter */}
                                <div>
                                    <input
                                        type="text"
                                        placeholder="🔍 Ürün Adı veya Kodu İle Ara..."
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 space-y-4 p-2">
                                    {Array.from(new Set(stocks
                                        .filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory)
                                        .map(s => s.category || 'DİĞER')
                                    )).sort().map(cat => (
                                        <div key={cat} className="space-y-1">
                                            <h5 className="text-[9px] font-black text-slate-400 uppercase px-2 mb-1">{cat}</h5>
                                            <div className="space-y-1">
                                                {stocks
                                                    .filter(s => (s.category || 'DİĞER') === cat)
                                                    .filter(s => s.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) || s.id?.toLowerCase().includes(productSearchQuery.toLowerCase()))
                                                    .map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setTempItem({ ...tempItem, materialId: s.id, unitPrice: (s.wholesalePrice || s.BirimFiyat || 0) })}
                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${tempItem.materialId === s.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[0.99]' : 'bg-white text-slate-700 border-slate-100 hover:border-emerald-300'}`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm truncate">{s.name}</p>
                                                                <p className={`text-[10px] ${tempItem.materialId === s.id ? 'text-emerald-100' : 'text-slate-400'}`}>Kod: {s.id} | Stok: {s.currentStock || 0} Adet</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-bold text-sm">₺{(s.wholesalePrice || s.BirimFiyat || 0).toLocaleString()}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                    {stocks.filter(s => selectedCategory === 'TÜMÜ' || s.category === selectedCategory).filter(s => s.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) || s.id?.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 && (
                                        <p className="py-8 text-center text-slate-400 italic text-xs">Aranan ürün bulunamadı.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Miktar</label>
                                        <input
                                            type="number"
                                            value={tempItem.amount}
                                            onChange={(e) => setTempItem({ ...tempItem, amount: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Birim Fiyat (TL)</label>
                                        <input
                                            type="number"
                                            value={tempItem.unitPrice}
                                            onChange={(e) => setTempItem({ ...tempItem, unitPrice: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => { setIsEditItemModalOpen(false); setTempItem({ materialId: '', amount: 1, unitPrice: 0 }); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">Vazgeç</button>
                                    <button onClick={addEditItemToEditOrder} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-md">{editingItemIndex !== null ? 'GÜNCELLE' : '+ LİSTEYE EKLE'}</button>
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

const CustomerModalContent = ({ newCustomer, setNewCustomer, onClose, onSave }: any) => {
    const [tab, setTab] = useState('GENEL');

    const updateContact = (index: number, field: string, value: string) => {
        const updated = [...newCustomer.contacts];
        updated[index][field] = value;
        setNewCustomer({ ...newCustomer, contacts: updated });
    };

    const addContact = () => {
        setNewCustomer({ ...newCustomer, contacts: [...(newCustomer.contacts || []), { name: '', phone: '', role: '' }] });
    };

    const removeContact = (index: number) => {
        setNewCustomer({ ...newCustomer, contacts: newCustomer.contacts.filter((_: any, i: number) => i !== index) });
    };

    return (
        <React.Fragment>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{newCustomer.isEdit ? 'Cari Kartı Düzenle' : 'Yeni Cari Kart / Müşteri'}</h3>
                    <p className="text-xs text-slate-400 font-medium">ERP Standartlarında Tam Detaylı Kayıt</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-100 flex gap-6 bg-white sticky top-0 z-10">
                {['GENEL', 'FİNANSAL', 'İLETİŞİM', 'ADRESLER', 'DİĞER'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`py-4 text-[10px] font-black tracking-widest transition-all relative ${tab === t ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {t} BİLGİLER
                        {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
                    </button>
                ))}
            </div>

            <form onSubmit={onSave} className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#f8fafc]">

                {tab === 'GENEL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ticari Ünvan / Ad Soyad</label>
                            <input required className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm font-bold shadow-sm" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                            <p className="text-[9px] text-slate-400 mt-1 italic">Yasal fatura başlığı buraya girilmelidir.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Müşteri Grubu</label>
                            <select className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.type} onChange={e => setNewCustomer({ ...newCustomer, type: e.target.value })}>
                                <option value="Bireysel">👤 Bireysel (Nihai Tüketici)</option>
                                <option value="Kurumsal">🏢 Kurumsal (Firma)</option>
                                <option value="Bayi">🤝 Bayi / Satıcı</option>
                                <option value="Kamu">🏛️ Kamu Kurumu</option>
                                <option value="Ihracat">🌍 İhracat Müşterisi</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sektör</label>
                            <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" placeholder="Örn: Peyzaj, Tarım, İnşaat" value={newCustomer.sector || ''} onChange={e => setNewCustomer({ ...newCustomer, sector: e.target.value })} />
                        </div>
                    </div>
                )}

                {tab === 'FİNANSAL' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{newCustomer.type === 'Bireysel' ? 'TC Kimlik No' : 'Vergi Kimlik No (VKN)'}</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm font-mono shadow-sm" value={newCustomer.taxId} onChange={e => setNewCustomer({ ...newCustomer, taxId: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vergi Dairesi</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.taxOffice} onChange={e => setNewCustomer({ ...newCustomer, taxOffice: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Para Birimi</label>
                                <select className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.currency || 'TRY'} onChange={e => setNewCustomer({ ...newCustomer, currency: e.target.value })}>
                                    <option value="TRY">₺ Türk Lirası</option>
                                    <option value="USD">$ Amerikan Doları</option>
                                    <option value="EUR">€ Euro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vade (Gün)</label>
                                <input type="number" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" placeholder="Örn: 30" value={newCustomer.paymentTerm || ''} onChange={e => setNewCustomer({ ...newCustomer, paymentTerm: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Risk Limiti (TL)</label>
                                <input type="number" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" placeholder="0.00" value={newCustomer.riskLimit || ''} onChange={e => setNewCustomer({ ...newCustomer, riskLimit: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sabit İskonto (%)</label>
                                <input type="number" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" placeholder="0" value={newCustomer.discountRatio || ''} onChange={e => setNewCustomer({ ...newCustomer, discountRatio: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                            <strong>Bilgi:</strong> e-Fatura mükellef durumu VKN girildiğinde entegratör üzerinden otomatik sorgulanır.
                        </div>
                    </div>
                )}

                {tab === 'İLETİŞİM' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Merkez Telefon</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kurumsal E-Posta</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Web Sitesi</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" placeholder="https://" value={newCustomer.website || ''} onChange={e => setNewCustomer({ ...newCustomer, website: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">KEP Adresi</label>
                                <input className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm shadow-sm" value={newCustomer.kepAddress || ''} onChange={e => setNewCustomer({ ...newCustomer, kepAddress: e.target.value })} />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-700 text-sm">Yetkili Kişiler</h4>
                                <button type="button" onClick={addContact} className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition shadow-sm border border-emerald-100">+ Yeni Kişi Ekle</button>
                            </div>

                            <div className="space-y-3">
                                {(newCustomer.contacts || []).length === 0 && <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center">Henüz yetkili kişi eklenmedi.</p>}
                                {(newCustomer.contacts || []).map((contact: any, idx: number) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group">
                                        <div className="absolute -left-2 top-4 w-1 h-8 bg-emerald-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex-1 w-full space-y-1">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">Ad Soyad</span>
                                            <input className="w-full bg-slate-50 p-2 text-xs rounded border border-slate-200 outline-none focus:border-emerald-400" value={contact.name} onChange={e => updateContact(idx, 'name', e.target.value)} />
                                        </div>
                                        <div className="flex-1 w-full space-y-1">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">Görevi / Pozisyon</span>
                                            <input className="w-full bg-slate-50 p-2 text-xs rounded border border-slate-200 outline-none focus:border-emerald-400" value={contact.role} onChange={e => updateContact(idx, 'role', e.target.value)} />
                                        </div>
                                        <div className="flex-1 w-full space-y-1">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">Dahili / Cep</span>
                                            <input className="w-full bg-slate-50 p-2 text-xs rounded border border-slate-200 outline-none focus:border-emerald-400" value={contact.phone} onChange={e => updateContact(idx, 'phone', e.target.value)} />
                                        </div>
                                        <button type="button" onClick={() => removeContact(idx)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded self-end mb-0.5 transition">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'ADRESLER' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura Adresi (Yasal)</label>
                            <textarea className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 focus:border-emerald-500 text-sm h-24 resize-none shadow-sm" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                            <div className="flex gap-4 mt-2">
                                <div className="flex-1">
                                    <input className="w-full p-2 bg-slate-50 rounded-lg outline-none border border-slate-200 text-xs" placeholder="İl" value={newCustomer.city || ''} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <input className="w-full p-2 bg-slate-50 rounded-lg outline-none border border-slate-200 text-xs" placeholder="İlçe" value={newCustomer.district || ''} onChange={e => setNewCustomer({ ...newCustomer, district: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <input className="w-full p-2 bg-slate-50 rounded-lg outline-none border border-slate-200 text-xs" placeholder="Posta Kodu" value={newCustomer.zipCode || ''} onChange={e => setNewCustomer({ ...newCustomer, zipCode: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-center">
                            <p className="text-slate-500 text-xs font-medium">📍 Çoklu Sevk Adresi ve Depo Yönetimi özelliği yakında eklenecektir.</p>
                        </div>
                    </div>
                )}

                {tab === 'DİĞER' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Özel Notlar / Uyarılar</label>
                            <textarea className="w-full p-4 bg-amber-50 rounded-xl outline-none border border-amber-200 focus:border-amber-400 text-sm h-32 resize-none text-amber-900 placeholder-amber-400/50" placeholder="Bu müşteri için dikkat edilmesi gereken özel durumlar..." value={newCustomer.note} onChange={e => setNewCustomer({ ...newCustomer, note: e.target.value })} />
                        </div>
                    </div>
                )}

            </form>

            <div className="p-6 border-t border-slate-200 bg-white flex gap-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 font-black text-xs uppercase bg-white border border-slate-200 rounded-xl text-slate-500 tracking-widest hover:bg-slate-50 transition active:scale-95">İptal</button>
                <button onClick={onSave} className="flex-1 py-4 font-black text-xs uppercase bg-emerald-600 rounded-xl text-white tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition active:scale-95">Kaydet</button>
            </div>
        </React.Fragment>
    );
};
