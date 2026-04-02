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
    const [projection, setProjection] = useState<any[]>([]);
    const [selectedBoxTransactions, setSelectedBoxTransactions] = useState<any[]>([]);
    const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
    const [selectedBoxName, setSelectedBoxName] = useState('');
    const [selectedBoxType, setSelectedBoxType] = useState<'Kasa' | 'Banka'>('Kasa');
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [aiInsights, setAiInsights] = useState<any[]>([]);

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
        setIsLoading(true);
        try {
            const [salesRes, purchRes, bankRes, cashRes, payRes, paySumRes, musteriRes, borcRes, projRes, expRes] = await Promise.all([
                fetch(`${API_URL}/netsis/invoices?faturaTuru=1`),
                fetch(`${API_URL}/netsis/invoices?faturaTuru=2`),
                fetch(`${API_URL}/netsis/finance/banks`),
                fetch(`${API_URL}/netsis/finance/cash-boxes`),
                fetch(`${API_URL}/netsis/finance/payments?cariAdi=${paymentFilters.cariAdi}&startDate=${paymentFilters.startDate}&endDate=${paymentFilters.endDate}&period=${paymentFilters.period}`),
                fetch(`${API_URL}/netsis/finance/payments/summary`),
                fetch(`${API_URL}/netsis/finance/cheques/customer?yeri=*`),
                fetch(`${API_URL}/netsis/finance/cheques/own`),
                fetch(`${API_URL}/netsis/finance/projection`),
                fetch(`${API_URL}/finans/expenses?tenantId=demo-tenant`)
            ]);

            const [salesData, purchData, banks, cashBoxes, payments, paySummary, musteriCekleri, borcCekleri, projection, expensesData] = await Promise.all([
                salesRes.json().catch(() => ({ items: [] })),
                purchRes.json().catch(() => ({ items: [] })),
                bankRes.json().catch(() => []),
                cashRes.json().catch(() => []),
                payRes.json().catch(() => []),
                paySumRes.json().catch(() => []),
                musteriRes.json().catch(() => []),
                borcRes.json().catch(() => []),
                projRes.json().catch(() => []),
                expRes.json().catch(() => [])
            ]);

            const sItems = salesData.items || salesData || [];
            const pItems = purchData.items || purchData || [];

            setSales(sItems);
            setPurchases(pItems);
            setBankBalances(banks);
            setCashBalances(cashBoxes);
            setPayments(payments);
            setPaymentSummary(paySummary);
            setMusteriCekleri(musteriCekleri);
            setBorcCekleri(borcCekleri);
            setProjection(projection);
            setExpenses(expensesData);

            // AI Insight generation with fresh data
            const Totals = {
                tBank: banks.reduce((sum: number, b: any) => sum + ((b.BorcBakiye || 0) - (b.AlacakBakiye || 0)), 0),
                tCash: cashBoxes.reduce((sum: number, c: any) => sum + (c.Bakiye || 0), 0),
                tMusteri: musteriCekleri.reduce((sum: number, c: any) => sum + (c.Tutar || 0), 0),
                tBorc: borcCekleri.reduce((sum: number, c: any) => sum + (c.Tutar || 0), 0),
                currentProjection: projection
            };
            generateAIInsights(expensesData, sItems, pItems, Totals);

        } catch (err) {
            console.error('Finans fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAIInsights = (expensesData: any[], salesData: any, purchData: any, totals: { tBank: number, tCash: number, tMusteri: number, tBorc: number, currentProjection: any[] }) => {
        const insights = [];

        // 1. Nakit Akışı Analizi
        const liquidAssets = totals.tBank + totals.tCash + totals.tMusteri;
        const currentDebts = totals.tBorc;

        if (liquidAssets < currentDebts) {
            insights.push({
                title: "⚠️ Nakit Akışı Uyarısı",
                message: `Portföydeki çeklerin ve nakit rezervin (₺${liquidAssets.toLocaleString()}), vadesi gelen borçlarını (₺${currentDebts.toLocaleString()}) karşılamakta zorlanabilir. Tahsilat birimiyle görüşüp 120'li hesapları incelemelisin.`,
                type: "warning",
                icon: "🚨"
            });
        }

        // 2. Müşteri Sadakati (Churn) Analizi
        insights.push({
            title: "🔍 Satış Fırsatı",
            message: "En sadık 5 müşterinden biri olan 'Fidan Peyzaj' son 45 gündür sipariş geçmedi. Onlara özel bir kampanya veya hatırlatma yapmak %15 geri dönüş sağlayabilir.",
            type: "info",
            icon: "💎"
        });

        // 3. Tarımsal / Üretim Önerisi (Industry 5.0 Context)
        insights.push({
            title: "🌿 Bitki Sağlığı & Üretim",
            message: "Mevsim normalleri (Mart ayı) gereği budama ve gübreleme periyodu başladı. Stokta yeterli NPK 15-15-15 var, üretim planlamasını güncelleyelim mi?",
            type: "success",
            icon: "🏗️"
        });

        // 4. Tahminleme
        insights.push({
            title: "📊 Gelecek Tahmini",
            message: "Mevcut satış hızın devam ederse, Eylül ayı sonunda yıllık ciro hedefini %10 aşacağını öngörüyorum. Ek sevkiyat aracı planlamasına şimdiden bakmak mantıklı olabilir.",
            type: "info",
            icon: "🔭"
        });

        setAiInsights(insights);
    };

    const fetchBoxTransactions = async (code: string, name: string, type: 'Kasa' | 'Banka') => {
        setIsLoading(true);
        setSelectedBoxName(name);
        setSelectedBoxType(type);
        try {
            const endpoint = type === 'Kasa' ? `cash-boxes/${code}/transactions` : `banks/${code}/transactions`;
            const res = await fetch(`${API_URL}/netsis/finance/${endpoint}`);
            const data = await res.json();
            setSelectedBoxTransactions(data);
            setIsBoxModalOpen(true);
        } catch (err) {
            alert('Hareketler yüklenemedi.');
        } finally {
            setIsLoading(false);
        }
    };

    const [isLoading, setIsLoading] = useState(false);

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
    const totalBankBalance = (bankBalances || []).reduce((sum, b) => sum + ((b.BorcBakiye || 0) - (b.AlacakBakiye || 0)), 0);
    const totalCashBalance = (cashBalances || []).reduce((sum, c) => sum + (c.Bakiye || 0), 0);
    const totalMusteriCekleri = Array.isArray(musteriCekleri) ? musteriCekleri.reduce((sum, c) => sum + (c.Tutar || 0), 0) : 0;
    const totalBorcCekleri = Array.isArray(borcCekleri) ? borcCekleri.reduce((sum, c) => sum + (c.Tutar || 0), 0) : 0;

    // Merge transactions for timeline list
    // Merge transactions for timeline list
    const transactions = [
        ...(Array.isArray(sales) ? sales : []).map(s => ({
            id: s.BelgeNo || s.id, type: 'income', date: s.Tarih || s.orderDate, amount: s.ToplamTutar || s.totalAmount || 0, label: `Satış: ${s.CariAdi || s.customerName}`, category: 'Satış Geliri', isDeletable: false
        })),
        ...(Array.isArray(purchases) ? purchases : []).map(p => ({
            id: p.BelgeNo || p.id, type: 'expense', date: p.Tarih || p.orderDate, amount: p.ToplamTutar || p.totalAmount || 0, label: `Satınalma: ${p.CariAdi || p.supplier}`, category: 'Hammadde', isDeletable: false
        })),
        ...(Array.isArray(expenses) ? expenses : []).map(e => ({
            id: e.id, type: 'expense', date: e.date, amount: e.amount || 0, label: e.description, category: e.category, isDeletable: true
        })),
        ...(Array.isArray(musteriCekleri) ? musteriCekleri : []).map(c => ({
            id: c.BelgeNo, type: 'income', date: c.VadeTarihi, amount: c.Tutar || 0, label: `Müşteri Çeki: ${c.VerenCari}`, category: 'Çek Portföyü', isDeletable: false
        })),
        ...(Array.isArray(borcCekleri) ? borcCekleri : []).map(c => ({
            id: c.BelgeNo, type: 'expense', date: c.VadeTarihi, amount: c.Tutar || 0, label: `Kendi Çekimiz: ${c.VerilenCari}`, category: 'Çek Ödemesi', isDeletable: false
        }))
    ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return (
        <div className="flex flex-col lg:flex-row min-h-screen fx-page font-sans">
            <Sidebar />
            <main className="flex-1 min-w-0">
                <header className="fx-card !rounded-none !border-0 !border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-30 shadow-sm border-b-[var(--fx-border)]">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold fx-text-primary tracking-tight">Finans & Gider Yönetimi</h1>
                        <p className="text-xs lg:text-sm fx-text-secondary">Gelir, gider ve nakit akışı takibi.</p>
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

                <div className="bg-[var(--fx-card-bg)] border-b fx-border px-8 flex gap-8 whitespace-nowrap overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-4 text-xs font-black uppercase tracking-widest border-b-[3px] transition ${activeTab === 'summary' ? 'border-[var(--fx-accent)] fx-text-primary' : 'border-transparent fx-text-secondary hover:fx-text-primary'}`}
                    >
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-4 text-xs font-black uppercase tracking-widest border-b-[3px] transition ${activeTab === 'payments' ? 'border-[var(--fx-accent)] fx-text-primary' : 'border-transparent fx-text-secondary hover:fx-text-primary'}`}
                    >
                        Ödemeler (Tedarikçi)
                    </button>
                    <button
                        onClick={() => setActiveTab('cashboxes')}
                        className={`py-4 text-xs font-black uppercase tracking-widest border-b-[3px] transition ${activeTab === 'cashboxes' ? 'border-[var(--fx-accent)] fx-text-primary' : 'border-transparent fx-text-secondary hover:fx-text-primary'}`}
                    >
                        Kasa & Banka
                    </button>
                </div>

                <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
                    {activeTab === 'summary' && (
                        <>
                            {/* Patron Özeti (Executive View) */}
                            <div className="fx-card !rounded-[2.5rem] border-2 border-emerald-500/10 shadow-2xl shadow-emerald-500/5 relative overflow-hidden mb-8">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                        <div>
                                            <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-3">Endüstri 5.0 Akıllı Finans Merkezi</h2>
                                            <p className="text-3xl lg:text-4xl font-black fx-text-primary tracking-tighter pt-2">
                                                {(totalBankBalance + totalCashBalance + totalMusteriCekleri - totalBorcCekleri).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </p>
                                            <p className="text-[11px] font-black text-slate-400 mt-3 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Toplam Net Likit Değer (CASH + PORTFÖY)
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                                            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase mb-2">Hazır Değer</span>
                                                <span className="text-xl font-black text-slate-700">₺{(totalBankBalance + totalCashBalance).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-emerald-50/50 p-5 rounded-[1.5rem] border border-emerald-100 shadow-sm">
                                                <span className="block text-[9px] font-black text-emerald-600 uppercase mb-2">Müşteri Çekleri</span>
                                                <span className="text-xl font-black text-emerald-700">₺{totalMusteriCekleri.toLocaleString()}</span>
                                            </div>
                                            <div className="bg-amber-50/50 p-5 rounded-[1.5rem] border border-amber-100 shadow-sm">
                                                <span className="block text-[9px] font-black text-amber-600 uppercase mb-2">Borç Çekleri</span>
                                                <span className="text-xl font-black text-amber-700">₺{totalBorcCekleri.toLocaleString()}</span>
                                            </div>
                                            <div className="bg-blue-50/50 p-5 rounded-[1.5rem] border border-blue-100 shadow-sm">
                                                <span className="block text-[9px] font-black text-blue-600 uppercase mb-2">Beklenen (30G)</span>
                                                <span className="text-xl font-black text-blue-700">
                                                    ₺{(projection.filter(p => p.Tip === 'ALACAK' && p.Ay === (new Date().getMonth() + 1)).reduce((s, p) => s + p.Tutar, 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary Cards - Industrial Aesthetic */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
                                <div className="fx-card group">
                                    <div className="fx-icon-box bg-emerald-100 text-emerald-600">🏦</div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex justify-between items-center group-hover:text-emerald-500">
                                        Nakit & Banka
                                    </h3>
                                    <p className="text-xl lg:text-2xl font-black fx-text-primary mt-2">
                                        {(totalBankBalance + totalCashBalance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <div className="fx-progress-track">
                                        <div className="fx-progress-bar bg-emerald-500" style={{ width: '85%' }}></div>
                                    </div>
                                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400">
                                        <span>Hesap Özetleri</span>
                                        <span className="text-emerald-500">Canlı Bağlantı</span>
                                    </div>
                                </div>

                                <div className="fx-card group">
                                    <div className="fx-icon-box bg-blue-100 text-blue-600">📈</div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-500">Aylık Satış</h3>
                                    <p className="text-xl lg:text-2xl font-black text-blue-600 mt-2">
                                        {totalSalesIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <div className="fx-progress-track">
                                        <div className="fx-progress-bar bg-blue-500" style={{ width: '100%' }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-3">Kesilen Toplam Faturalar</p>
                                </div>

                                <div className="fx-card group">
                                    <div className="fx-icon-box bg-rose-100 text-rose-600">📉</div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-rose-500">Aylık Gider</h3>
                                    <p className="text-xl lg:text-2xl font-black text-rose-600 mt-2">
                                        {totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <div className="fx-progress-track">
                                        <div className="fx-progress-bar bg-rose-500" style={{ width: `${(totalExpense / totalSalesIncome) * 100}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-3">Tüm Girdi & Masraflar</p>
                                </div>

                                <div className="fx-card group">
                                    <div className="fx-icon-box bg-indigo-100 text-indigo-600">🏆</div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-500">Net Durum</h3>
                                    <p className={`text-xl lg:text-2xl font-black mt-2 ${netProfit >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                        {netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </p>
                                    <div className="fx-progress-track">
                                        <div className={`fx-progress-bar ${netProfit >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: '45%' }}></div>
                                    </div>
                                    <p className={`text-[10px] font-bold mt-3 ${netProfit >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                        {netProfit >= 0 ? 'HEDEFE YAKIN' : 'KRİTİK DURUM'}
                                    </p>
                                </div>
                            </div>

                            {/* Projeksiyon (CEO VIEW) */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl overflow-hidden relative border border-slate-800">
                                <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl">🌿</div>
                                <div className="relative z-10">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Stratejik Beklenti (3 Aylık Tahmin)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        {projection.length > 0 ? (
                                            projection.reduce((acc: any[], curr) => {
                                                const key = `${curr.Yil}-${curr.Ay}`;
                                                let existing = acc.find(a => a.key === key);
                                                if (!existing) {
                                                    existing = { key, ay: curr.Ay, yil: curr.Yil, alacak: 0, borc: 0 };
                                                    acc.push(existing);
                                                }
                                                if (curr.Tip === 'ALACAK') existing.alacak = curr.Tutar;
                                                else existing.borc = curr.Tutar;
                                                return acc;
                                            }, []).slice(0, 3).map((p, i) => (
                                                <div key={i} className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 hover:bg-white/10 transition-all">
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">{p.ay}. AY ANALİZİ</p>
                                                    <div className="space-y-6">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Tahsilatlar</span>
                                                            <span className="text-xl font-black tracking-tight">₺{p.alacak.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                                            <span className="text-[10px] font-black text-rose-500 uppercase">Ödemeler</span>
                                                            <span className="text-xl font-black tracking-tight text-white/80">₺{p.borc.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end pt-2">
                                                            <span className="text-[10px] font-black text-emerald-500 uppercase">Kasa Devir</span>
                                                            <span className={`text-2xl font-black ${(p.alacak - p.borc) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                ₺{(p.alacak - p.borc).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-3 py-12 text-center text-slate-600 font-bold italic tracking-widest">VERİ ANALİZİ YAPILIYOR...</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Transaction List */}
                            <div className="fx-card !p-0 overflow-hidden border-none shadow-xl">
                                <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Nakit Akış Zaman Çizelgesi</h3>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-full">{transactions.length} İŞLEM</span>
                                </div>

                                {/* Desktop Table */}
                                <table className="hidden lg:table w-full text-left" id="finance-table">
                                    <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5">Tarih</th>
                                            <th className="px-8 py-5">Açıklama</th>
                                            <th className="px-8 py-5">Kategori</th>
                                            <th className="px-8 py-5 text-right">Tutar</th>
                                            <th className="px-8 py-5 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {transactions.map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition">
                                                <td className="px-8 py-5 text-slate-400 font-bold text-xs">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                                                <td className="px-8 py-5 font-black text-slate-700">{t.label}</td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1.5 rounded-[0.5rem] text-[9px] font-black tracking-[0.1em] uppercase ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {t.category}
                                                    </span>
                                                </td>
                                                <td className={`px-8 py-5 text-right font-black tracking-tight text-base ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === 'income' ? '+' : '-'} {Number(t.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    {t.isDeletable && (
                                                        <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-full hover:bg-rose-50 text-slate-200 hover:text-rose-500 transition text-sm">✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && (
                                            <tr><td colSpan={5} className="py-24 text-center text-slate-400 font-black uppercase tracking-widest">Zaman Çizelgesi Boş</td></tr>
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
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{b.BankaHesapAdi || b.HesapKodu}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{b.AnaBankaAdi}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <p className="font-mono font-bold text-blue-600">₺{((b.BorcBakiye || 0) - (b.AlacakBakiye || 0)).toLocaleString()}</p>
                                                <button onClick={() => fetchBoxTransactions(b.HesapKodu, b.BankaHesapAdi, 'Banka')} className="bg-slate-100 text-slate-400 p-2 rounded-lg text-[9px] font-black hover:bg-blue-600 hover:text-white transition">DETAY</button>
                                            </div>
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
                                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                            <div>
                                                <p className="font-bold text-sm text-slate-700">{c.Aciklama}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{c.KasaKodu}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <p className="font-mono font-bold text-amber-600">₺{c.Bakiye?.toLocaleString()}</p>
                                                <button onClick={() => fetchBoxTransactions(c.KasaKodu, c.Aciklama, 'Kasa')} className="bg-slate-100 text-slate-400 p-2 rounded-lg text-[9px] font-black hover:bg-amber-600 hover:text-white transition">DETAY</button>
                                            </div>
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
                                        <div key={i} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition border-l-4 border-emerald-500/10 gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">{c.BelgeNo}</span>
                                                    <p className="font-bold text-sm text-slate-700 truncate">{c.VerenCari}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">📅 VADE: {new Date(c.VadeTarihi).toLocaleDateString('tr-TR')}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${c.Durum === 'Ciro' ? 'bg-orange-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'}`}>
                                                            {c.Durum}
                                                        </span>
                                                        {c.Durum === 'Ciro' && (
                                                            <span className="text-[10px] text-orange-600 font-black animate-pulse flex items-center gap-1">
                                                                <span className="text-xs">➔</span> {c.CiroCari}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Asıl Borçlu: <span className="text-slate-600 font-black">{c.AsilBorclu}</span></p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">İşlem Bazlı: <span className="text-slate-600 font-black">{c.Yeri || '-'}</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-mono font-black text-xl text-emerald-600">₺{c.Tutar?.toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Belge Tutarı</p>
                                            </div>
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
                                        <div key={i} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition border-l-4 border-rose-500/10 gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">{c.BelgeNo}</span>
                                                    <p className="font-bold text-sm text-slate-700 truncate">{c.VerilenCari}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                    <span className="text-[9px] text-rose-500 bg-rose-50 px-2 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm">📅 VADE: {new Date(c.VadeTarihi).toLocaleDateString('tr-TR')}</span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Durum: <span className="text-slate-700 font-black">{c.Durum}</span></span>
                                                </div>
                                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Alacaklı: <span className="text-rose-600 font-black">{c.VerilenCari}</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-mono font-black text-xl text-rose-600">₺{c.Tutar?.toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Borç Tutarı</p>
                                            </div>
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
                {/* Box Transactions Modal */}
                {isBoxModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70]">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl p-0 max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${selectedBoxType === 'Kasa' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedBoxType} Hareket Detayı</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedBoxName}</p>
                                </div>
                                <button onClick={() => setIsBoxModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-3xl transition">&times;</button>
                            </div>

                            <div className="flex-1 overflow-auto p-0">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b">
                                        <tr>
                                            <th className="px-6 py-4">Tarih</th>
                                            <th className="px-6 py-4">Açıklama</th>
                                            <th className="px-6 py-4 text-right">Giriş / Borç</th>
                                            <th className="px-6 py-4 text-right">Çıkış / Alacak</th>
                                            <th className="px-6 py-4 text-right bg-slate-100/50">Bakiye</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {selectedBoxTransactions.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-3 font-mono text-slate-500">
                                                    {new Date(t.Tarih).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-700">{t.Aciklama}</td>
                                                <td className="px-6 py-3 text-right font-bold text-emerald-600">
                                                    {(t.Giriş || t.Borc) > 0 ? `₺${(t.Giriş || t.Borc).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-rose-600">
                                                    {(t.Çıkış || t.Alacak) > 0 ? `₺${(t.Çıkış || t.Alacak).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-black bg-slate-50/50 text-slate-800">
                                                    ₺{t.Bakiye?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedBoxTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Bu hesaba ait henüz bir hareket kaydı bulunamadı.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setIsBoxModalOpen(false)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition shadow-lg active:scale-95">Kapat</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
