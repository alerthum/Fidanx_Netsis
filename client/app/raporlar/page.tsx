"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';

export default function RaporlarPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [plants, setPlants] = useState<any[]>([]);
    const [production, setProduction] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [fertilizerLogs, setFertilizerLogs] = useState<any[]>([]);
    const [temperatureLogs, setTemperatureLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const tabParam = searchParams.get('tab');
    const [activeSection, setActiveSection] = useState<'overview' | 'monthly' | 'cost' | 'operations'>(() =>
        tabParam === 'cost' || tabParam === 'maliyet' ? 'cost' : tabParam === 'monthly' ? 'monthly' : tabParam === 'operations' ? 'operations' : 'overview'
    );

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        if (tabParam === 'cost' || tabParam === 'maliyet') setActiveSection('cost');
        else if (tabParam === 'monthly') setActiveSection('monthly');
        else if (tabParam === 'operations') setActiveSection('operations');
        else if (tabParam === 'overview') setActiveSection('overview');
    }, [tabParam]);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [stocksRes, prodRes, summaryRes, salesRes, purchRes, tempRes, fertRes] = await Promise.all([
                fetch(`${API_URL}/netsis/stocks/list`),
                fetch(`${API_URL}/production?tenantId=demo-tenant`),
                fetch(`${API_URL}/netsis/invoices/summary`),
                fetch(`${API_URL}/netsis/invoices?faturaTuru=1`),
                fetch(`${API_URL}/netsis/invoices?faturaTuru=2`),
                fetch(`${API_URL}/production/temperature-logs?tenantId=demo-tenant`),
                fetch(`${API_URL}/production/fertilizer-logs?tenantId=demo-tenant`)
            ]);

            if (stocksRes.ok) {
                const data = await stocksRes.json();
                setPlants(Array.isArray(data) ? data.map((s: any) => ({
                    ...s,
                    currentStock: s.Bakiye,
                    type: s.StokKodu?.includes('ANA') ? 'MOTHER_TREE' : 'CUTTING'
                })) : []);
            }
            if (prodRes.ok) setProduction(await prodRes.json());
            if (salesRes.ok) setSales((await salesRes.json()).items || []);
            if (purchRes.ok) setPurchases((await purchRes.json()).items || []);

            if (tempRes.ok) setTemperatureLogs(await tempRes.json());
            if (fertRes.ok) setFertilizerLogs(await fertRes.json());

            // Masraflar için şimdilik satın alma faturalarını kullanıyoruz (basitleştirme)
            setExpenses([]);
        } catch (err) {
            console.error('Rapor verileri yüklenemedi:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculations
    const totalStock = plants.reduce((sum, p) => sum + (p.currentStock || 0), 0);
    const totalBatches = production.length;
    const totalCuttings = production.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const totalSalesIncome = sales.reduce((sum, s) => sum + (s.ToplamTutar || 0), 0);
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + (p.ToplamTutar || 0), 0);
    const totalExpense = totalPurchaseCost; // Basitleştirilmiş
    const netProfit = totalSalesIncome - totalExpense;

    // Monthly breakdown
    const getMonthlyData = () => {
        const months: Record<string, { income: number, expense: number }> = {};
        sales.forEach(s => {
            const month = new Date(s.Tarih).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
            if (!months[month]) months[month] = { income: 0, expense: 0 };
            months[month].income += s.ToplamTutar || 0;
        });
        purchases.forEach(p => {
            const month = new Date(p.Tarih).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
            if (!months[month]) months[month] = { income: 0, expense: 0 };
            months[month].expense += p.ToplamTutar || 0;
        });
        return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
    };

    // Expense categories
    const getExpenseByCategory = () => {
        const cats: Record<string, number> = {};
        expenses.forEach(e => {
            const cat = e.category || 'Diğer';
            cats[cat] = (cats[cat] || 0) + (Number(e.amount) || 0);
        });
        return Object.entries(cats).sort((a, b) => b[1] - a[1]);
    };

    // Plant cost analysis from production batches
    const getPlantCosts = () => {
        return production
            .filter(b => b.quantity > 0)
            .map(b => ({
                name: b.name || b.plantName || 'İsimsiz',
                lotId: b.lotId,
                quantity: b.quantity,
                totalCost: b.accumulatedCost || 0,
                unitCost: b.quantity > 0 ? (b.accumulatedCost || 0) / b.quantity : 0,
                location: b.location || 'Belirsiz',
                stage: b.stage || '-'
            }))
            .sort((a, b) => b.unitCost - a.unitCost);
    };

    const monthlyData = getMonthlyData();
    const expenseCategories = getExpenseByCategory();
    const plantCosts = getPlantCosts();
    const maxMonthlyValue = Math.max(...monthlyData.map(([, d]) => Math.max(d.income, d.expense)), 1);

    const tabs = [
        { id: 'overview' as const, label: 'Genel Durum', icon: '📊' },
        { id: 'monthly' as const, label: 'Aylık Rapor', icon: '📅' },
        { id: 'cost' as const, label: 'Maliyet Analizi', icon: '💰' },
        { id: 'operations' as const, label: 'Operasyonlar', icon: '🌡️' },
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc] font-sans">
            <Sidebar />
            <main className="flex-1 min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-row justify-between items-center sticky top-0 z-30 shadow-sm gap-4">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Gelişmiş Raporlar</h1>
                        <p className="hidden lg:block text-xs lg:text-sm text-slate-500">İşletmenizin tüm verilerini tek ekrandan inceleyin.</p>
                    </div>
                    <div className="flex gap-3">
                        <ExportButton title="Genel Rapor" tableId="report-table" iconOnly={true} />
                        <button
                            onClick={fetchAllData}
                            title="Verileri Yenile"
                            className="bg-white border border-slate-200 text-slate-600 w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition active:scale-95 group"
                        >
                            <span className="text-lg group-hover:rotate-180 transition duration-500">🔄</span>
                        </button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="sticky top-[73px] lg:top-[81px] z-20 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-200/60 py-3 px-4 lg:px-8 shadow-sm">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveSection(tab.id);
                                    const q = tab.id === 'overview' ? '' : `?tab=${tab.id}`;
                                    router.replace(`/raporlar${q}`, { scroll: false });
                                }}
                                className={`
                                    snap-start shrink-0 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border
                                    ${activeSection === tab.id
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                    }
                                `}
                            >
                                <span className="mr-2 text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 lg:p-8 space-y-8">
                    {isLoading ? (
                        <div className="py-24 text-center">
                            <div className="inline-block w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-400 mt-4 font-bold text-[10px] uppercase tracking-widest">Rapor Verileri Yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* ===================== OVERVIEW ===================== */}
                            {activeSection === 'overview' && (
                                <div className="space-y-8 animate-fade-in">
                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                                        <KPICard icon="🌱" label="Toplam Stok" value={totalStock.toLocaleString()} color="emerald" />
                                        <KPICard icon="🧪" label="Üretim Partisi" value={totalBatches.toString()} color="blue" />
                                        <KPICard icon="🌿" label="Toplam Çelik" value={totalCuttings.toLocaleString()} color="teal" />
                                        <KPICard icon="💰" label="Satış Geliri" value={`₺${totalSalesIncome.toLocaleString('tr-TR')}`} color="emerald" />
                                        <KPICard icon="📉" label="Toplam Gider" value={`₺${totalExpense.toLocaleString('tr-TR')}`} color="rose" />
                                        <KPICard icon={netProfit >= 0 ? "🎉" : "⚠️"} label="Net Kar/Zarar" value={`₺${netProfit.toLocaleString('tr-TR')}`} color={netProfit >= 0 ? "blue" : "amber"} />
                                    </div>

                                    {/* Stock by Type */}
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Stok Dağılımı (Tür Bazında)</h3>
                                            <div className="space-y-3">
                                                {['MOTHER_TREE', 'CUTTING', 'RAW_MATERIAL', 'PACKAGING'].map(type => {
                                                    const items = plants.filter(p => p.type === type);
                                                    const total = items.reduce((s, p) => s + (p.currentStock || 0), 0);
                                                    const labels: Record<string, string> = { MOTHER_TREE: '🌳 Ana Ağaç', CUTTING: '🌱 Üretim Materyali', RAW_MATERIAL: '🧱 Hammadde', PACKAGING: '📦 Ambalaj' };
                                                    return (
                                                        <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                            <span className="text-sm font-bold text-slate-600">{labels[type] || type}</span>
                                                            <div className="text-right">
                                                                <span className="font-bold text-slate-800">{total.toLocaleString()}</span>
                                                                <span className="text-[10px] text-slate-400 ml-1">({items.length} çeşit)</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Gider Dağılımı (Kategori)</h3>
                                            <div className="space-y-3">
                                                {expenseCategories.length === 0 ? (
                                                    <p className="text-slate-400 italic text-sm text-center py-6">Gider kaydı yok.</p>
                                                ) : (
                                                    expenseCategories.map(([cat, amount]) => {
                                                        const maxCat = expenseCategories[0][1];
                                                        const pct = maxCat > 0 ? (amount / maxCat) * 100 : 0;
                                                        return (
                                                            <div key={cat}>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="font-bold text-slate-600">{cat}</span>
                                                                    <span className="font-bold text-rose-600">₺{amount.toLocaleString('tr-TR')}</span>
                                                                </div>
                                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tedarikçi Özet */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Tedarikçi Sipariş Özeti</h3>
                                        <div className="hidden lg:block overflow-x-auto">
                                            <table className="w-full text-left text-sm" id="report-table">
                                                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-4 py-3">Tedarikçi</th>
                                                        <th className="px-4 py-3 text-center">Sipariş Sayısı</th>
                                                        <th className="px-4 py-3 text-center">Tamamlanan</th>
                                                        <th className="px-4 py-3 text-right">Toplam Tutar</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(() => {
                                                        const suppliers: Record<string, { count: number, completed: number, total: number }> = {};
                                                        purchases.forEach(p => {
                                                            const s = p.CariAdi || 'Bilinmeyen';
                                                            if (!suppliers[s]) suppliers[s] = { count: 0, completed: 0, total: 0 };
                                                            suppliers[s].count++;
                                                            suppliers[s].completed++; // Netsis'te fatura zaten tamamlanmıştır
                                                            suppliers[s].total += p.ToplamTutar || 0;
                                                        });
                                                        const supplierEntries = Object.entries(suppliers);
                                                        return (
                                                            <>
                                                                {supplierEntries.map(([name, data]) => (
                                                                    <tr key={name} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-3 font-bold text-slate-700">{name}</td>
                                                                        <td className="px-4 py-3 text-center font-mono">{data.count}</td>
                                                                        <td className="px-4 py-3 text-center font-mono text-emerald-600">{data.completed}</td>
                                                                        <td className="px-4 py-3 text-right font-bold text-slate-800">₺{data.total.toLocaleString('tr-TR')}</td>
                                                                    </tr>
                                                                ))}
                                                            </>
                                                        );
                                                    })()}
                                                    {purchases.length === 0 && (
                                                        <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">Sipariş kaydı yok.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Card View for Suppliers */}
                                        <div className="lg:hidden space-y-3">
                                            {(() => {
                                                const suppliers: Record<string, { count: number, completed: number, total: number }> = {};
                                                purchases.forEach(p => {
                                                    const s = p.supplier || 'Bilinmeyen';
                                                    if (!suppliers[s]) suppliers[s] = { count: 0, completed: 0, total: 0 };
                                                    suppliers[s].count++;
                                                    if (p.status === 'Tamamlandı') {
                                                        suppliers[s].completed++;
                                                        suppliers[s].total += p.totalAmount || 0;
                                                    }
                                                });
                                                const supplierEntries = Object.entries(suppliers);

                                                if (supplierEntries.length === 0) return <p className="text-slate-400 italic text-sm text-center py-6">Sipariş kaydı yok.</p>;

                                                return supplierEntries.map(([name, data]) => (
                                                    <div key={name} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 text-sm mb-1">{name}</h4>
                                                            <div className="flex gap-2 text-[10px] text-slate-500">
                                                                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Toplam: {data.count}</span>
                                                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">Tamamlanan: {data.completed}</span>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-slate-800 text-sm">₺{data.total.toLocaleString('tr-TR')}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===================== MONTHLY ===================== */}
                            {activeSection === 'monthly' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Aylık Gelir / Gider Karşılaştırması</h3>
                                        {monthlyData.length === 0 ? (
                                            <p className="text-slate-400 italic text-sm text-center py-12">Yeterli veri yok.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {monthlyData.map(([month, data]) => (
                                                    <div key={month} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="font-bold text-slate-700 text-sm">{month}</span>
                                                            <span className={`font-bold text-xs px-2 py-1 rounded-lg ${(data.income - data.expense) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                {(data.income - data.expense) >= 0 ? '+' : ''}{(data.income - data.expense).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                                    <span>Gelir</span>
                                                                    <span className="text-emerald-600">₺{data.income.toLocaleString('tr-TR')}</span>
                                                                </div>
                                                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700" style={{ width: `${(data.income / maxMonthlyValue) * 100}%` }}></div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                                                    <span>Gider</span>
                                                                    <span className="text-rose-600">₺{data.expense.toLocaleString('tr-TR')}</span>
                                                                </div>
                                                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-700" style={{ width: `${(data.expense / maxMonthlyValue) * 100}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ===================== COST ANALYSIS ===================== */}
                            {activeSection === 'cost' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bitki Bazlı Maliyet Analizi (Üretim Partileri)</h3>
                                        </div>
                                        <div className="hidden lg:block overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4">Parti / Ürün</th>
                                                        <th className="px-6 py-4 text-center">Miktar</th>
                                                        <th className="px-6 py-4 text-center">Konum</th>
                                                        <th className="px-6 py-4 text-center">Safha</th>
                                                        <th className="px-6 py-4 text-right">Toplam Maliyet</th>
                                                        <th className="px-6 py-4 text-right">Birim Maliyet</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {plantCosts.map((pc, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-slate-700">{pc.name}</p>
                                                                <p className="text-[10px] text-emerald-600 font-mono">{pc.lotId}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-mono font-bold">{pc.quantity.toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">{pc.location}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">{pc.stage}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-slate-800">₺{pc.totalCost.toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`font-bold ${pc.unitCost > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    ₺{pc.unitCost.toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {plantCosts.length === 0 && (
                                                        <tr><td colSpan={6} className="py-12 text-center text-slate-400 italic">Üretim partisi bulunamadı.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Card View for Cost Analysis */}
                                        <div className="lg:hidden divide-y divide-slate-100">
                                            {plantCosts.map((pc, i) => (
                                                <div key={i} className="p-4 first:pt-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm">{pc.name}</h4>
                                                            <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{pc.lotId}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`font-bold text-sm ${pc.unitCost > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                ₺{pc.unitCost.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ adet</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 mt-3">
                                                        <div className="bg-slate-50 p-2 rounded text-center">
                                                            <span className="block font-bold text-slate-700">{pc.quantity.toLocaleString()}</span>
                                                            <span>Miktar</span>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded text-center">
                                                            <span className="block font-bold text-slate-700">{pc.location}</span>
                                                            <span>Konum</span>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded text-center">
                                                            <span className="block font-bold text-slate-700">₺{pc.totalCost.toFixed(0)}</span>
                                                            <span>Top. Mal.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {plantCosts.length === 0 && <p className="text-slate-400 italic text-sm text-center py-6">Kayıt yok.</p>}
                                        </div>
                                    </div>

                                    {/* Labor & Energy Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">👷 İşçilik Giderleri</h3>
                                            {(() => {
                                                const laborExpenses = expenses.filter(e => e.category === 'İşçilik');
                                                const laborTotal = laborExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                                                return (
                                                    <div>
                                                        <p className="text-3xl font-black text-slate-800 mb-2">₺{laborTotal.toLocaleString('tr-TR')}</p>
                                                        <p className="text-xs text-slate-400">{laborExpenses.length} kayıt</p>
                                                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                                            {laborExpenses.slice(0, 10).map((e, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                                                                    <span className="text-slate-600 truncate max-w-[60%]">{e.description}</span>
                                                                    <span className="font-bold text-slate-800">₺{Number(e.amount).toLocaleString('tr-TR')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">⚡ Enerji Giderleri</h3>
                                            {(() => {
                                                const energyExpenses = expenses.filter(e => e.category === 'Enerji');
                                                const energyTotal = energyExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                                                return (
                                                    <div>
                                                        <p className="text-3xl font-black text-slate-800 mb-2">₺{energyTotal.toLocaleString('tr-TR')}</p>
                                                        <p className="text-xs text-slate-400">{energyExpenses.length} kayıt</p>
                                                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                                            {energyExpenses.slice(0, 10).map((e, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                                                                    <span className="text-slate-600 truncate max-w-[60%]">{e.description}</span>
                                                                    <span className="font-bold text-slate-800">₺{Number(e.amount).toLocaleString('tr-TR')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===================== OPERATIONS ===================== */}
                            {activeSection === 'operations' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                                    <div className="lg:col-span-2 space-y-8">
                                        <TemperatureChart data={temperatureLogs} />

                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🌡️ Sera Sıcaklık Kayıtları</h3>
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">{temperatureLogs.length} Kayıt</span>
                                            </div>
                                            <div className="hidden lg:block overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-3">Tarih</th>
                                                            <th className="px-4 py-3 text-center" colSpan={3}>Sera İçi (S/Ö/A)</th>
                                                            <th className="px-4 py-3 text-center" colSpan={3}>Sera Dışı (S/Ö/A)</th>
                                                            <th className="px-4 py-3 text-center">Mazot</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {temperatureLogs.slice(0, 20).map((log: any, i: number) => {
                                                            const si = log.seraIci || {};
                                                            const sd = log.seraDisi || {};
                                                            const dateStr = log.date ? new Date(log.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                                                            return (
                                                                <tr key={i} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{dateStr}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-orange-500">{si.sabah != null ? `${si.sabah}°` : '-'}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-orange-600">{si.ogle != null ? `${si.ogle}°` : '-'}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-orange-400">{si.aksam != null ? `${si.aksam}°` : '-'}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-blue-500">{sd.sabah != null ? `${sd.sabah}°` : '-'}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-blue-600">{sd.ogle != null ? `${sd.ogle}°` : '-'}</td>
                                                                    <td className="px-2 py-3 text-center text-xs font-bold text-blue-400">{sd.aksam != null ? `${sd.aksam}°` : '-'}</td>
                                                                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">{log.mazot != null ? `${log.mazot} Lt` : '-'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {temperatureLogs.length === 0 && (
                                                            <tr><td colSpan={8} className="py-8 text-center text-slate-400 italic">Sıcaklık kaydı yok.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card View for Temperatures */}
                                            <div className="lg:hidden space-y-3 p-4">
                                                {temperatureLogs.slice(0, 10).map((log: any, i: number) => {
                                                    const si = log.seraIci || {};
                                                    const sd = log.seraDisi || {};
                                                    const dateStr = log.date ? new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '-';
                                                    return (
                                                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <span className="font-bold text-slate-700 text-sm">{dateStr}</span>
                                                                {log.mazot && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">⛽ {log.mazot} Lt</span>}
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-white p-2 rounded-lg border border-orange-100">
                                                                    <span className="block text-[9px] font-black text-orange-400 uppercase mb-1 text-center">Sera İçi</span>
                                                                    <div className="flex justify-between text-xs font-bold text-orange-600">
                                                                        <span>S:{si.sabah ?? '-'}</span>
                                                                        <span>Ö:{si.ogle ?? '-'}</span>
                                                                        <span>A:{si.aksam ?? '-'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-white p-2 rounded-lg border border-blue-100">
                                                                    <span className="block text-[9px] font-black text-blue-400 uppercase mb-1 text-center">Dışarı</span>
                                                                    <div className="flex justify-between text-xs font-bold text-blue-600">
                                                                        <span>S:{sd.sabah ?? '-'}</span>
                                                                        <span>Ö:{sd.ogle ?? '-'}</span>
                                                                        <span>A:{sd.aksam ?? '-'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {temperatureLogs.length === 0 && <p className="text-slate-400 italic text-sm text-center">Kayıt yok.</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Fertilizer Logs */}
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🌿 Gübre Uygulama</h3>
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{fertilizerLogs.length}</span>
                                            </div>
                                            <div className="hidden lg:block overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-4 py-3">Tarih</th>
                                                            <th className="px-4 py-3">Uygulama</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {fertilizerLogs.slice(0, 15).map((log: any, i: number) => {
                                                            const dateStr = log.date ? new Date(log.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '-';
                                                            const apps: string[] = [];
                                                            if (log.fungusit) apps.push('🧪 Fungusit');
                                                            if (log.aminoAsit) apps.push('💧 Amino Asit');
                                                            if (log.start) apps.push('🚀 Start');
                                                            if (log.note) apps.push(log.note);
                                                            return (
                                                                <tr key={i} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{dateStr}</td>
                                                                    <td className="px-4 py-2">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {apps.map((a, j) => (
                                                                                <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{a}</span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {fertilizerLogs.length === 0 && (
                                                            <tr><td colSpan={2} className="py-8 text-center text-slate-400 italic">Kayıt yok.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card View for Fertilizer Logs */}
                                            <div className="lg:hidden space-y-3 p-4">
                                                {fertilizerLogs.slice(0, 15).map((log: any, i: number) => {
                                                    const dateStr = log.date ? new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '-';
                                                    const apps: string[] = [];
                                                    if (log.fungusit) apps.push('🧪 Fungusit');
                                                    if (log.aminoAsit) apps.push('💧 Amino Asit');
                                                    if (log.start) apps.push('🚀 Start');
                                                    if (log.note) apps.push(log.note);

                                                    return (
                                                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                                                            <span className="font-bold text-slate-700 text-sm whitespace-nowrap mr-3">{dateStr}</span>
                                                            <div className="flex flex-wrap gap-1 justify-end">
                                                                {apps.map((a, j) => (
                                                                    <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-100 shadow-sm">{a}</span>
                                                                ))}
                                                                {apps.length === 0 && <span className="text-[10px] text-slate-400">-</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {fertilizerLogs.length === 0 && <p className="text-slate-400 italic text-sm text-center">Kayıt yok.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main >
        </div >
    );
}

function KPICard({ icon, label, value, color }: { icon: string, label: string, value: string, color: string }) {
    const colorMap: Record<string, string> = {
        emerald: 'border-emerald-100 bg-emerald-50/30',
        blue: 'border-blue-100 bg-blue-50/30',
        teal: 'border-teal-100 bg-teal-50/30',
        rose: 'border-rose-100 bg-rose-50/30',
        amber: 'border-amber-100 bg-amber-50/30',
    };
    const textMap: Record<string, string> = {
        emerald: 'text-emerald-700',
        blue: 'text-blue-700',
        teal: 'text-teal-700',
        rose: 'text-rose-700',
        amber: 'text-amber-700',
    };
    return (
        <div className={`p-4 rounded-2xl border shadow-sm ${colorMap[color] || colorMap.emerald}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-lg font-black ${textMap[color] || textMap.emerald}`}>{value}</p>
        </div>
    );
}

function TemperatureChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-slate-400 italic text-sm">Grafik için yeterli veri yok.</p>
        </div>
    );

    // Sort data by date, take last 10 entries
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);

    // Extract max temps per day from seraIci/seraDisi
    const chartData = sortedData.map(d => {
        const si = d.seraIci || {};
        const sd = d.seraDisi || {};
        const insideMax = Math.max(Number(si.sabah || 0), Number(si.ogle || 0), Number(si.aksam || 0));
        const outsideMax = Math.max(Number(sd.sabah || 0), Number(sd.ogle || 0), Number(sd.aksam || 0));
        return { date: d.date, insideMax, outsideMax };
    });

    const temps = chartData.flatMap(d => [d.insideMax, d.outsideMax]);
    const minTemp = Math.min(...temps, 0) - 5;
    const maxTemp = Math.max(...temps, 30) + 5;
    const range = maxTemp - minTemp;

    const w = 1000;
    const h = 200;

    const getX = (i: number) => (i / (Math.max(chartData.length - 1, 1))) * w;
    const getYPix = (val: number) => h - ((val - minTemp) / range) * h;

    const pathInside = chartData.map((d, i) => `${getX(i)},${getYPix(d.insideMax)}`).join(' ');
    const pathOutside = chartData.map((d, i) => `${getX(i)},${getYPix(d.outsideMax)}`).join(' ');

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sıcaklık Değişimi (Son 10 Kayıt — Günlük Maks.)</h3>
                <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Sera İçi</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Sera Dışı</div>
                </div>
            </div>

            <div className="w-full h-[200px] relative">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <line key={p} x1="0" y1={p * h} x2={w} y2={p * h} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
                    ))}

                    {/* Paths */}
                    <polyline points={pathOutside} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={pathInside} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Dots */}
                    {chartData.map((d, i) => (
                        <g key={i}>
                            <circle cx={getX(i)} cy={getYPix(d.outsideMax)} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                            <circle cx={getX(i)} cy={getYPix(d.insideMax)} r="4" fill="white" stroke="#f97316" strokeWidth="2" />

                            {/* Labels for last point */}
                            {i === chartData.length - 1 && (
                                <>
                                    <text x={getX(i)} y={getYPix(d.outsideMax) - 10} textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">{d.outsideMax}°</text>
                                    <text x={getX(i)} y={getYPix(d.insideMax) - 10} textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">{d.insideMax}°</text>
                                </>
                            )}
                        </g>
                    ))}
                </svg>
            </div>

            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-mono uppercase">
                {chartData.map((d, i) => (
                    <span key={i}>{new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
                ))}
            </div>
        </div>
    );
}
