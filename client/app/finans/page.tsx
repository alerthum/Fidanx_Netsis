"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';

export default function FinansPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({
        category: 'Enerji',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        periodType: 'Aylık' as 'Günlük' | 'Aylık',
        periodMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    });
    const [activeTab, setActiveTab] = useState<'summary' | 'payments' | 'cashboxes'>('summary');
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentSummary, setPaymentSummary] = useState<any[]>([]);
    const [paymentFilters, setPaymentFilters] = useState({ startDate: '', endDate: '', cariAdi: '', period: '' });

    const categories = ['Enerji', 'İşçilik', 'Bakım/Onarım', 'Lojistik', 'Kira', 'Vergi', 'Diğer'];

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        fetchData();
    }, []);

    const [bankBalances, setBankBalances] = useState<any[]>([]);
    const [cashBalances, setCashBalances] = useState<any[]>([]);
    const [musteriCekleri, setMusteriCekleri] = useState<any[]>([]);
    const [borcCekleri, setBorcCekleri] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            const [salesRes, purchRes, bankRes, cashRes, payRes, paySumRes, musteriRes, borcRes] = await Promise.all([
                fetch(`${API_URL}/netsis/invoices?faturaTuru=1`),
                fetch(`${API_URL}/netsis/invoices?faturaTuru=2`),
                fetch(`${API_URL}/netsis/finance/banks`),
                fetch(`${API_URL}/netsis/finance/cash-boxes`),
                fetch(`${API_URL}/netsis/finance/payments?cariAdi=${paymentFilters.cariAdi}&startDate=${paymentFilters.startDate}&endDate=${paymentFilters.endDate}&period=${paymentFilters.period}`),
                fetch(`${API_URL}/netsis/finance/payments/summary`),
                fetch(`${API_URL}/netsis/finance/cheques/customer?yeri=*`),
                fetch(`${API_URL}/netsis/finance/cheques/own`)
            ]);

            if (salesRes.ok) {
                const data = await salesRes.json();
                setSales(data.items || []);
            }
            if (purchRes.ok) {
                const data = await purchRes.json();
                setPurchases(data.items || []);
            }
            if (bankRes.ok) setBankBalances(await bankRes.json());
            if (cashRes.ok) setCashBalances(await cashRes.json());
            if (payRes.ok) setPayments(await payRes.json());
            if (paySumRes.ok) setPaymentSummary(await paySumRes.json());
            if (musteriRes.ok) setMusteriCekleri(await musteriRes.json());
            if (borcRes.ok) setBorcCekleri(await borcRes.json());

            // Masrafları (Giderler) yerel endpoint'ten çekmeye devam et veya Netsis'e yönlendir
            const expRes = await fetch(`${API_URL}/finans/expenses?tenantId=demo-tenant`);
            if (expRes.ok) setExpenses(await expRes.json());

        } catch (err) { console.error('Finans fetch error:', err); }
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
                setIsModalOpen(false);
                setNewExpense({ category: 'Enerji', amount: 0, description: '', date: new Date().toISOString().split('T')[0], periodType: 'Aylık', periodMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` });
                fetchData();
            }
        } catch (err) { alert('Hata oluştu'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/finans/expenses/${id}?tenantId=demo-tenant`, { method: 'DELETE' });
            fetchData();
        } catch (err) { }
    };

    // Financial calculations
    const totalSalesIncome = sales.reduce((sum, s) => sum + (s.ToplamTutar || s.totalAmount || 0), 0);
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + (p.ToplamTutar || p.totalAmount || 0), 0);
    const totalOperatingExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalExpense = totalPurchaseCost + totalOperatingExpense;
    const netProfit = totalSalesIncome - totalExpense;

    // Bank and Cash Totals
    const totalBankBalance = bankBalances.reduce((sum, b) => sum + ((b.BorcBakiye || 0) - (b.AlacakBakiye || 0)), 0);
    const totalCashBalance = cashBalances.reduce((sum, c) => sum + (c.Bakiye || 0), 0);
    const totalMusteriCekleri = musteriCekleri.reduce((sum, c) => sum + (c.Tutar || 0), 0);
    const totalBorcCekleri = borcCekleri.reduce((sum, c) => sum + (c.Tutar || 0), 0);

    // Merge transactions for timeline list
    const transactions = [
        ...sales.map(s => ({
            id: s.BelgeNo || s.id, type: 'income', date: s.Tarih || s.orderDate, amount: s.ToplamTutar || s.totalAmount || 0, label: `Satış: ${s.CariAdi || s.customerName}`, category: 'Satış Geliri', isDeletable: false
        })),
        ...purchases.map(p => ({
            id: p.BelgeNo || p.id, type: 'expense', date: p.Tarih || p.orderDate, amount: p.ToplamTutar || p.totalAmount || 0, label: `Satınalma: ${p.CariAdi || p.supplier}`, category: 'Hammadde', isDeletable: false
        })),
        ...expenses.map(e => ({
            id: e.id, type: 'expense', date: e.date, amount: e.amount || 0, label: e.description, category: e.category, isDeletable: true
        }))
    ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Finans & Gider Yönetimi</h1>
                        <p className="text-xs lg:text-sm text-slate-500">Gelir, gider ve nakit akışı takibi.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <ExportButton title="Finans Raporu" tableId="finance-table" />
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 sm:flex-none bg-rose-600 text-white px-4 lg:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 shadow-md transition active:scale-95"
                        >
                            - Gider Ekle
                        </button>
                    </div>
                </header>

                <div className="bg-white border-b border-slate-200 px-8 flex gap-8">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition ${activeTab === 'summary' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
                    >
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition ${activeTab === 'payments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
                    >
                        Ödemeler (Tedarikçi)
                    </button>
                    <button
                        onClick={() => setActiveTab('cashboxes')}
                        className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition ${activeTab === 'cashboxes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}
                    >
                        Kasa & Banka
                    </button>
                </div>

                <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
                    {activeTab === 'summary' && (
                        <>
                            {/* Financial Summary Cards */}
                            {/* Main Financial Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
                                <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-emerald-100 shadow-sm">
                                    <h3 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Nakit & Banka</h3>
                                    <p className="text-2xl lg:text-3xl font-black text-slate-800 mt-1 lg:mt-2">
                                        {(totalBankBalance + totalCashBalance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <div className="flex justify-between mt-2 text-[10px] font-bold">
                                        <span className="text-blue-500">Banka: {totalBankBalance.toLocaleString('tr-TR')}</span>
                                        <span className="text-amber-500">Kasa: {totalCashBalance.toLocaleString('tr-TR')}</span>
                                    </div>
                                </div>

                                <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-emerald-50 shadow-sm">
                                    <h3 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Aylık Satış</h3>
                                    <p className="text-2xl lg:text-3xl font-black text-emerald-600 mt-1 lg:mt-2">
                                        {totalSalesIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <p className="text-[10px] text-emerald-400 font-bold mt-1">Realize Edilen Gelir</p>
                                </div>

                                <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-rose-50 shadow-sm">
                                    <h3 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Aylık Gider</h3>
                                    <p className="text-2xl lg:text-3xl font-black text-rose-600 mt-1 lg:mt-2">
                                        {totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <p className="text-[10px] text-rose-400 font-bold mt-1">Satınalma + Operasyon</p>
                                </div>

                                <div className={`bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border shadow-sm ${netProfit >= 0 ? 'border-blue-50' : 'border-amber-50'}`}>
                                    <h3 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Net Durum</h3>
                                    <p className={`text-2xl lg:text-3xl font-black mt-1 lg:mt-2 ${netProfit >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                        {netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <p className={`text-[10px] font-bold mt-1 ${netProfit >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                                        {netProfit >= 0 ? '📈 Artıda' : '📉 Ekside'}
                                    </p>
                                </div>
                            </div>

                            {/* Transaction List */}
                            <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-xs lg:text-sm font-black text-slate-500 uppercase tracking-widest">Son İşlemler (Nakit Akışı)</h3>
                                </div>

                                {/* Desktop Table */}
                                <table className="hidden lg:table w-full text-left" id="finance-table">
                                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Tarih</th>
                                            <th className="px-6 py-4">Açıklama</th>
                                            <th className="px-6 py-4">Kategori</th>
                                            <th className="px-6 py-4 text-right">Tutar</th>
                                            <th className="px-6 py-4 text-center">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {transactions.map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{t.label}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-wide ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {t.category}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === 'income' ? '+' : '-'} {Number(t.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {t.isDeletable && (
                                                        <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 transition text-lg leading-none">×</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && (
                                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">Kayıtlı işlem yok.</td></tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Card View */}
                                <div className="lg:hidden divide-y divide-slate-100">
                                    {transactions.map((t, i) => (
                                        <div key={i} className="p-4 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${t.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                {t.type === 'income' ? '💰' : '💸'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-sm truncate">{t.label}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString('tr-TR')}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {t.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-bold font-mono text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                                                </p>
                                                {t.isDeletable && (
                                                    <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 transition text-xs mt-0.5">Sil</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {transactions.length === 0 && (
                                        <div className="py-12 text-center text-slate-400 italic">Kayıtlı işlem yok.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end shadow-sm">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cari Adı Ara</label>
                                    <input type="text" placeholder="Tedarikçi ismi..." value={paymentFilters.cariAdi} onChange={(e) => setPaymentFilters({ ...paymentFilters, cariAdi: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 text-xs outline-none" />
                                </div>
                                <button onClick={fetchData} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700">Filtrele</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {paymentSummary.slice(0, 3).map((s, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-2xl border border-blue-50 shadow-sm relative overflow-hidden">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase">{s.Yil} {s.Ay}. Ay</h3>
                                        <p className="text-2xl font-black text-blue-600 mt-2">₺{s.ToplamOdeme?.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left font-sans">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                                        <tr>
                                            <th className="px-6 py-4">Tarih</th>
                                            <th className="px-6 py-4">Tedarikçi</th>
                                            <th className="px-6 py-4 text-right">Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-sm">
                                        {payments.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-xs font-mono">{new Date(p.Tarih).toLocaleDateString('tr-TR')}</td>
                                                <td className="px-6 py-4 font-bold">{p.CariAdi}</td>
                                                <td className="px-6 py-4 text-right font-bold text-rose-600">₺{p.Tutar?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cashboxes' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Bankalar */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase text-slate-500 flex justify-between">
                                    <span>Banka Hesapları (Netsis)</span>
                                    <span className="text-blue-600">Toplam: ₺{totalBankBalance.toLocaleString()}</span>
                                </div>
                                <div className="divide-y max-h-80 overflow-y-auto">
                                    {bankBalances.map((b, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{b.BankaHesapAdi || b.HesapKodu}</p>
                                                <p className="text-[10px] text-slate-400">{b.AnaBankaAdi}</p>
                                            </div>
                                            <p className="font-mono font-bold text-blue-600">₺{((b.BorcBakiye || 0) - (b.AlacakBakiye || 0)).toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {bankBalances.length === 0 && <p className="p-8 text-center text-slate-400 italic">Banka detayı bulunamadı.</p>}
                                </div>
                            </div>

                            {/* Kasalar */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase text-slate-500 flex justify-between">
                                    <span>Kasa Durumu (Netsis)</span>
                                    <span className="text-amber-600">Toplam: ₺{totalCashBalance.toLocaleString()}</span>
                                </div>
                                <div className="divide-y max-h-80 overflow-y-auto">
                                    {cashBalances.map((c, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{c.Aciklama}</p>
                                                <p className="text-[10px] text-slate-400">{c.KasaKodu}</p>
                                            </div>
                                            <p className="font-mono font-bold text-amber-600">₺{c.Bakiye?.toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {cashBalances.length === 0 && <p className="p-8 text-center text-slate-400 italic">Kasa kaydı bulunamadı.</p>}
                                </div>
                            </div>

                            {/* Müşteri Çekleri */}
                            <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-emerald-50 bg-emerald-50/50 font-bold text-xs uppercase text-emerald-700 flex justify-between">
                                    <span>Müşteri Çek / Senetleri</span>
                                    <span>Toplam: ₺{totalMusteriCekleri.toLocaleString()}</span>
                                </div>
                                <div className="divide-y max-h-80 overflow-y-auto">
                                    {musteriCekleri.map((c, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{c.BelgeNo} - {c.CariAdi}</p>
                                                <p className="text-[10px] text-emerald-500 font-bold">Vade: {new Date(c.VadeTarihi).toLocaleDateString('tr-TR')} | Durum: {c.Durum}</p>
                                            </div>
                                            <p className="font-mono font-bold text-emerald-600">₺{c.Tutar?.toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {musteriCekleri.length === 0 && <p className="p-8 text-center text-slate-400 italic">Müşteri çeki bulunamadı.</p>}
                                </div>
                            </div>

                            {/* Borç Çekleri (Kendi Çeklerimiz) */}
                            <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-rose-50 bg-rose-50/50 font-bold text-xs uppercase text-rose-700 flex justify-between">
                                    <span>Bizim Çekler (Borç)</span>
                                    <span>Toplam: ₺{totalBorcCekleri.toLocaleString()}</span>
                                </div>
                                <div className="divide-y max-h-80 overflow-y-auto">
                                    {borcCekleri.map((c, i) => (
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{c.BelgeNo} - {c.CariAdi}</p>
                                                <p className="text-[10px] text-rose-500 font-bold">Vade: {new Date(c.VadeTarihi).toLocaleDateString('tr-TR')}</p>
                                            </div>
                                            <p className="font-mono font-bold text-rose-600">₺{c.Tutar?.toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {borcCekleri.length === 0 && <p className="p-8 text-center text-slate-400 italic">Borç çeki bulunamadı.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Expense Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-slate-800 mb-6">Yeni Gider Kaydı</h3>
                            <form onSubmit={handleCreateExpense} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategori</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Açıklama</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
                                        placeholder="Örn: Elektrik Faturası"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tutar (TL)</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dönem Tipi</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, periodType: 'Günlük' })}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition border ${newExpense.periodType === 'Günlük' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}
                                        >
                                            📅 Günlük
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, periodType: 'Aylık' })}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition border ${newExpense.periodType === 'Aylık' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-purple-300'}`}
                                        >
                                            🗓️ Aylık
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1.5 italic">
                                        İşçilik gibi giderler günlük, Enerji gibi giderler aylık kaydedilebilir.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        {newExpense.periodType === 'Günlük' ? 'Tarih' : 'Ay / Yıl'}
                                    </label>
                                    {newExpense.periodType === 'Günlük' ? (
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
                                            value={newExpense.date}
                                            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                        />
                                    ) : (
                                        <input
                                            required
                                            type="month"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
                                            value={newExpense.periodMonth}
                                            onChange={(e) => setNewExpense({ ...newExpense, periodMonth: e.target.value, date: e.target.value + '-01' })}
                                        />
                                    )}
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition">İptal</button>
                                    <button type="submit" className="flex-1 py-3 text-white font-bold bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition">Harcamayı Kaydet</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
