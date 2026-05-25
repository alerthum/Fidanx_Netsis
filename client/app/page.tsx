"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TurkeyMap from '@/components/TurkeyMap';
import Link from 'next/link';

function formatInvoiceTime(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [stats, setStats] = useState({ totalStock: 0, totalOrders: 0, totalExpenses: 0, viyolCount: 0, celikCount: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState({ healthy: 0, observation: 0, critical: 0 });
  const [regionalSales, setRegionalSales] = useState<Record<string, number>>({});
  const [financeStats, setFinanceStats] = useState({
    bank: 0, cash: 0, musteriCekleri: 0, borcCekleri: 0, netLikit: 0, projection: [] as any[]
  });
  const API_URL = '/api';

  const [tempStats, setTempStats] = useState<any[]>([]);
  const [tempKonum, setTempKonum] = useState('TÜMÜ');
  const [tempKonumlar, setTempKonumlar] = useState<string[]>([]);
  const [tempLastReading, setTempLastReading] = useState<any>(null);

  const fetchFinanceStats = async () => {
    try {
      const [bankRes, cashRes, musteriRes, borcRes, projRes] = await Promise.all([
        fetch(`${API_URL}/netsis/finance/banks`),
        fetch(`${API_URL}/netsis/finance/cash-boxes`),
        fetch(`${API_URL}/netsis/finance/cheques/customer?yeri=*`),
        fetch(`${API_URL}/netsis/finance/cheques/own`),
        fetch(`${API_URL}/netsis/finance/projection`)
      ]);
      const [banks, cash, musteriCekleri, borcCekleri, projection] = await Promise.all([
        bankRes.ok ? bankRes.json().catch(()=>[]) : [],
        cashRes.ok ? cashRes.json().catch(()=>[]) : [],
        musteriRes.ok ? musteriRes.json().catch(()=>[]) : [],
        borcRes.ok ? borcRes.json().catch(()=>[]) : [],
        projRes.ok ? projRes.json().catch(()=>[]) : []
      ]);

      const b = (banks||[]).reduce((sum:number, b:any) => sum + ((b.BorcBakiye||0) - (b.AlacakBakiye||0)), 0);
      const c = (cash||[]).reduce((sum:number, box:any) => sum + (box.Bakiye||0), 0);
      const m = (musteriCekleri||[]).reduce((sum:number, c:any) => sum + (c.Tutar||0), 0);
      const bo = (borcCekleri||[]).reduce((sum:number, c:any) => sum + (c.Tutar||0), 0);
      setFinanceStats({ bank: b, cash: c, musteriCekleri: m, borcCekleri: bo, netLikit: b+c+m-bo, projection: projection || [] });
    } catch(err){}
  };

  const fetchActivities = async () => {
    try {
      // Netsis'ten son fatura hareketlerini "aktivite" olarak gösteriyoruz
      const res = await fetch(`${API_URL}/netsis/invoices?pageSize=10`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data?.items || !Array.isArray(data.items)) return;
      setActivities(data.items.map((inv: any) => ({
        id: inv.BelgeNo,
        title: inv.CariAdi,
        action: inv.FaturaTuruLabel,
        date: inv.Tarih,
        icon: inv.FaturaTuru === '1' ? '📤' : '📥',
        color: inv.FaturaTuru === '1' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
      })));
    } catch (err) { }
  };

  const fetchStats = async () => {
    try {
      const [stockRes, salesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/netsis/dashboard/stock-summary`),
        fetch(`${API_URL}/netsis/dashboard/sales-comparison`),
        fetch(`${API_URL}/netsis/invoices/summary`)
      ]);

      const [stockSummaryRaw, salesComparisonRaw, shipmentSummaryRaw] = await Promise.all([
        stockRes.ok ? stockRes.json().catch(() => []) : [],
        salesRes.ok ? salesRes.json().catch(() => []) : [],
        summaryRes.ok ? summaryRes.json().catch(() => []) : []
      ]);

      const stockSummary = Array.isArray(stockSummaryRaw) ? stockSummaryRaw : [];
      const salesComparison = Array.isArray(salesComparisonRaw) ? salesComparisonRaw : [];
      const shipmentSummary = Array.isArray(shipmentSummaryRaw) ? shipmentSummaryRaw : [];

      const stockData = stockSummary[0] || {};
      const totalSales = salesComparison.reduce((acc: number, s: any) => acc + (s.ToplamSatış || 0), 0);

      const purchaseData = shipmentSummary.find((s: any) => s.FaturaTuru === '2');
      const totalExpenses = purchaseData ? purchaseData.ToplamTL : 0;

      setStats({
        totalStock: stockData.ToplamKartSayisi || 0,
        totalOrders: totalSales,
        totalExpenses: totalExpenses,
        viyolCount: stockData.StokluUrunSayisi || 0,
        celikCount: stockData.GrupSayisi || 0
      });

      // Kritik Stok Durumu (Sağlık Skoru olarak yansıtıyoruz) - Basit bir puanlama
      const criticalRes = await fetch(`${API_URL}/netsis/dashboard/critical-stocks`);
      const criticalStocks = criticalRes.ok ? await criticalRes.json() : [];
      const healthyCount = (stockData.ToplamKartSayisi || 0) - (Array.isArray(criticalStocks) ? criticalStocks.length : 0);
      const healthyPercentage = stockData.ToplamKartSayisi > 0
        ? Math.round((healthyCount / stockData.ToplamKartSayisi) * 100)
        : 100;

      setHealthStatus({
        healthy: healthyPercentage,
        observation: Math.max(0, 100 - healthyPercentage - 5),
        critical: 5
      });

      // Bölgesel Satış - Netsis'ten carileri çekip illere göre grupluyoruz (Mock yerine gerçek veri denemesi)
      const customerRes = await fetch(`${API_URL}/netsis/customers`);
      const customers = customerRes.ok ? await customerRes.json() : [];

      const regionMap: Record<string, string> = {
        'İSTANBUL': 'marmara', 'BURSA': 'marmara', 'EDİRNE': 'marmara', 'KOCAELİ': 'marmara',
        'İZMİR': 'ege', 'MANİSA': 'ege', 'AYDIN': 'ege', 'DENİZLİ': 'ege',
        'ANTALYA': 'akdeniz', 'ADANA': 'akdeniz', 'MERSİN': 'akdeniz', 'HATAY': 'akdeniz',
        'ANKARA': 'ic-anadolu', 'KONYA': 'ic-anadolu', 'ESKİŞEHİR': 'ic-anadolu', 'KAYSERİ': 'ic-anadolu',
        'TRABZON': 'karadeniz', 'SAMSUN': 'karadeniz', 'ORDU': 'karadeniz', 'RİZE': 'karadeniz',
        'ERZURUM': 'dogu', 'VAN': 'dogu', 'MALATYA': 'dogu', 'ELAZIĞ': 'dogu',
        'DİYARBAKIR': 'guneydogu', 'GAZİANTEP': 'guneydogu', 'ŞANLIURFA': 'guneydogu', 'MARDİN': 'guneydogu'
      };

      const salesByRegion: Record<string, number> = {};
      if (Array.isArray(customers)) {
        customers.forEach((c: any) => {
          const il = (c.CariIl || '').toUpperCase();
          const region = regionMap[il];
          if (region) {
            salesByRegion[region] = (salesByRegion[region] || 0) + (Math.abs(c.BakiyeTl) || 0);
          }
        });
      }
      setRegionalSales(salesByRegion);

      // Sıcaklık: production/sicaklik API (veritabanı) — Günlük ortalama + konum filtreli
      try {
        const tempRes = await fetch(`${API_URL}/production/sicaklik?tenantId=demo-tenant`);
        if (tempRes.ok) {
          const tempLogs = await tempRes.json();
          const allLogs = Array.isArray(tempLogs) ? tempLogs : [];

          // Benzersiz konumları çıkar
          const konumSet = new Set<string>();
          allLogs.forEach((l: any) => { if (l.konum) konumSet.add(l.konum); });
          setTempKonumlar(Array.from(konumSet));

          // Son ölçümü kaydet
          if (allLogs.length > 0) {
            const last = allLogs[0];
            setTempLastReading({
              temp: last.icSicaklik,
              konum: last.konum || '-',
              periyot: last.periyot || '-',
              date: last.date ? new Date(last.date).toLocaleDateString('tr-TR') : '-',
              nem: last.nem,
            });
          }

          // Günlük ortalamaya grupla (son 14 gün)
          const dayMap = new Map<string, { temps: number[]; date: string }>();
          allLogs.forEach((l: any) => {
            if (!l.date || l.icSicaklik == null) return;
            const dayKey = new Date(l.date).toISOString().split('T')[0];
            if (!dayMap.has(dayKey)) dayMap.set(dayKey, { temps: [], date: l.date });
            dayMap.get(dayKey)!.temps.push(Number(l.icSicaklik));
          });

          const dailyAvg = Array.from(dayMap.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 14)
            .map(([, val]) => {
              const avg = val.temps.reduce((s, t) => s + t, 0) / val.temps.length;
              return {
                temp: Math.round(avg * 10) / 10,
                month: new Date(val.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                fullDate: new Date(val.date).toLocaleDateString('tr-TR'),
                kayitSayisi: val.temps.length,
              };
            });

          setTempStats(dailyAvg);
        } else {
          setTempStats([]);
        }
      } catch (_) {
        setTempStats([]);
      }

    } catch (err) { console.error('Stats fetch error:', err); }
  };


  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchFinanceStats();
  }, []);



  return (
    <div className="flex flex-col lg:flex-row min-h-screen fx-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-0 lg:h-[88px] flex flex-col lg:flex-row lg:items-center justify-between sticky top-0 lg:top-0 z-30 shadow-xs gap-4 shrink-0">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800">Fidanx Kontrol Paneli</h1>
            <p className="text-xs lg:text-sm text-slate-500">İşletmenizin genel durumu ve üretim verileri.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full sm:w-auto">
            {/* Buttons removed per request */}
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-8 space-y-8 overflow-y-auto">

          {/* Hoşgeldin ve İlk Adım Rehberi */}
          <div className="bg-emerald-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold mb-3">Hoş Geldiniz! 🌳</h2>
              <p className="text-emerald-100 text-lg mb-6 leading-relaxed">
                FidanX Üretim ve Yönetim Sistemi'ne hoş geldiniz. Bu panel üzerinden tüm süreçlerinizi takip edebilirsiniz.
              </p>
            </div>
            {/* Decoration Icons */}
            <div className="absolute right-[-20px] top-[-20px] text-[180px] opacity-10 rotate-12 pointer-events-none">🌱</div>
            <div className="absolute right-[100px] bottom-[-40px] text-[120px] opacity-10 -rotate-12 pointer-events-none">🌳</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Toplam Stok" value={stats.totalStock.toLocaleString()} change="+5%" positive={true} />
            <StatCard title="Viyol / Çelik" value={`${stats.viyolCount?.toLocaleString() || 0} / ${stats.celikCount?.toLocaleString() || 0}`} change="Adet" neutral={true} smallerText={true} />
            <StatCard title="Toplam Satış" value={`₺${stats.totalOrders.toLocaleString()}`} change="+12%" positive={true} />
            <StatCard title="Toplam Gider" value={`₺${stats.totalExpenses.toLocaleString()}`} change="-3%" positive={false} />
            <StatCard title="Sağlık Skoru" value={`%${healthStatus.healthy}`} change="+2%" positive={true} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Finansal Özüt (Executive View) - Phase G */}
            <div className="xl:col-span-3 fx-card !rounded-[2.5rem] border-2 border-emerald-500/10 shadow-2xl shadow-emerald-500/5 relative overflow-hidden bg-slate-900 border-slate-800">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-2">
                <div>
                  <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-3">Finansal Durum & Nakit Akış</h2>
                  <p className="text-3xl lg:text-4xl font-black text-white tracking-tighter pt-2">
                    {financeStats.netLikit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                  <p className="text-[11px] font-black text-slate-400 mt-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Toplam Net Likit Değer (CASH + PORTFÖY)
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/10 shadow-sm">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-2">Hazır Değer</span>
                    <span className="text-xl font-black text-white">₺{(financeStats.bank + financeStats.cash).toLocaleString()}</span>
                  </div>
                  <div className="bg-emerald-500/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-emerald-500/20 shadow-sm">
                    <span className="block text-[9px] font-black text-emerald-400 uppercase mb-2">Müşteri Çekleri</span>
                    <span className="text-xl font-black text-emerald-400">₺{financeStats.musteriCekleri.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-500/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-amber-500/20 shadow-sm">
                    <span className="block text-[9px] font-black text-amber-400 uppercase mb-2">Borç Çekleri</span>
                    <span className="text-xl font-black text-amber-400">₺{financeStats.borcCekleri.toLocaleString()}</span>
                  </div>
                  <div className="bg-blue-500/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-blue-500/20 shadow-sm">
                    <span className="block text-[9px] font-black text-blue-400 uppercase mb-2">Beklenen (30G)</span>
                    <span className="text-xl font-black text-blue-400">
                      ₺{(financeStats.projection.filter(p => p.Tip === 'ALACAK' && p.Ay === (new Date().getMonth() + 1)).reduce((s, p) => s + p.Tutar, 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bölgesel Satış Analizi (Türkiye Haritası) */}
            <div className="xl:col-span-2 fx-card !p-8 space-y-8 flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center border-b fx-border pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">BÖLGESEL SATIŞ ANALİZİ</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Türkiye Genel Dağılım</p>
                </div>
              </div>
              <div className="flex-1 bg-slate-50/50 rounded-3xl border fx-border flex items-center justify-center overflow-hidden relative group">
                <div className="w-full h-full max-w-[800px] p-4 scale-90 origin-center transition-transform group-hover:scale-95 duration-700">
                  <TurkeyMap data={regionalSales} />
                </div>
              </div>
            </div>

            {/* Sağlık & Hızlı İşlemler */}
            <div className="space-y-8">
              <div className="fx-card !p-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em] border-b fx-border pb-4">FİDAN SAĞLIK DURUMU</h3>
                <div className="space-y-8">
                  {healthStatus.healthy === 0 && healthStatus.observation === 0 && healthStatus.critical === 0 ? (
                    <p className="text-slate-400 text-sm italic">Veri bulunamadı.</p>
                  ) : (
                    <>
                      <HealthBar label="Sağlıklı" percentage={healthStatus.healthy} color="bg-indigo-500" />
                      <HealthBar label="Gözlem Altında" percentage={healthStatus.observation} color="bg-amber-400" />
                      <HealthBar label="Kritik (Hastalık Riski)" percentage={healthStatus.critical} color="bg-rose-500" />
                    </>
                  )}
                </div>
              </div>

              <div className="fx-card !p-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-[0.2em] border-b fx-border pb-4">HIZLI OPERASYONLAR</h3>
                <div className="grid grid-cols-2 gap-4">
                  <QuickAction icon="🚜" label="Gübreleme" href="/operasyon" />
                  <QuickAction icon="💧" label="Sulama" href="/operasyon" />
                  <QuickAction icon="📦" label="Sayım" href="/stoklar" />
                  <QuickAction icon="🚚" label="Sevkiyat" href="/satislar" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Sera İklim Analizi (Yeni Konum - Sol) */}
            <div className="fx-card !p-8 space-y-6">
              <div className="flex justify-between items-center border-b fx-border pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">SERA İKLİM ANALİZİ</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest leading-relaxed">Günlük Ortalama İç Sıcaklık (°C)</p>
                </div>
                <Link href="/sera" className="bg-slate-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">Detaylı Rapor</Link>
              </div>

              {/* Son Ölçüm Kartı */}
              {tempLastReading && (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl shadow-sm">🌡️</div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Son Ölçüm</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-700">{tempLastReading.temp}°C</span>
                      {tempLastReading.nem != null && <span className="text-sm font-bold text-indigo-400">💧 %{tempLastReading.nem}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">{tempLastReading.konum}</span>
                    <span className="text-[10px] font-bold text-indigo-300 block mt-0.5">{tempLastReading.periyot} • {tempLastReading.date}</span>
                  </div>
                </div>
              )}

              {/* Konum Filtresi */}
              {tempKonumlar.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setTempKonum('TÜMÜ')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tempKonum === 'TÜMÜ' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >Tümü</button>
                  {tempKonumlar.map(k => (
                    <button
                      key={k}
                      onClick={() => setTempKonum(k)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tempKonum === k ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >{k}</button>
                  ))}
                </div>
              )}

              {tempStats.length > 0 ? (
                <div className="flex items-end justify-between gap-1 lg:gap-3 h-64 w-full pt-4">
                  {tempStats.slice().reverse().map((stat, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-slate-900 shadow-2xl text-white text-[10px] p-3 rounded-2xl whitespace-nowrap z-10 pointer-events-none text-center">
                        <span className="font-black opacity-50 uppercase tracking-widest block mb-1">{stat.fullDate}</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="font-bold">Ort: {stat.temp}°C ({stat.kayitSayisi} ölçüm)</span>
                        </div>
                      </div>

                      {/* Bar Container */}
                      <div className="relative w-full h-[85%] flex items-end justify-center bg-slate-50 rounded-2xl overflow-hidden p-1 group-hover:bg-indigo-50/30 transition-all">
                        <div
                          className="w-full rounded-xl transition-all duration-700 hover:brightness-110 shadow-sm bg-gradient-to-t from-indigo-600 to-indigo-400"
                          style={{ height: `${Math.min(100, ((Number(stat.temp) || 0) / 45) * 100)}%` }}
                        ></div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-tighter">{stat.month}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                  <span className="text-4xl mb-4 grayscale opacity-20">🌡️</span>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Sıcaklık verisi bulunamadı</p>
                  <Link href="/uretim" className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                    Sera Verisi Girin →
                  </Link>
                </div>
              )}
            </div>


            {/* Son Aktiviteler (Yeni Konum - Sağ) */}
            <div className="fx-card overflow-hidden flex flex-col h-full !p-0">
              <div className="px-8 py-6 border-b fx-border flex justify-between items-center bg-slate-50/50">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SON SİSTEM KAYITLARI</h2>
                <button className="bg-white px-4 py-2 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 border fx-border transition-colors">Tümünü Gör</button>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[450px] custom-scrollbar">
                {activities.map((item, i) => (
                  <div key={item.id || i} className="flex items-center gap-6 px-8 py-6 hover:bg-slate-50/80 transition-all cursor-pointer group">
                    <div className={`w-14 h-14 ${item.color || 'bg-slate-50'} rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform`}>{item.icon || '📝'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 mb-1 tracking-tight group-hover:text-indigo-600 transition-colors">{item.title}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none bg-slate-100 px-2 py-1 rounded-md">
                          {item.action}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">
                          {formatInvoiceTime(item.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-slate-200 group-hover:text-indigo-500 transition-colors transform group-hover:translate-x-1 duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="p-16 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Henüz sistem kaydı bulunmuyor</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main >
    </div >
  );
}

function StatCard({ title, value, change, positive, neutral, smallerText }: any) {
  return (
    <div className="fx-card !p-8 group cursor-default">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b fx-border pb-3 group-hover:text-indigo-600 transition-colors leading-none">{title}</p>
      <div className="flex justify-between items-end">
        <h3 className={`${smallerText ? 'text-lg' : 'text-3xl'} font-black text-slate-900 tracking-tighter`}>{value}</h3>
        <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-widest shadow-xs ${neutral ? 'bg-slate-50 text-slate-400 border border-slate-100' :
          positive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}>
          {change}
        </span>
      </div>
    </div>
  );
}

function HealthBar({ label, percentage, color }: any) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-black mb-3 text-slate-800 uppercase tracking-[0.2em]">
        <span>{label}</span>
        <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-500">%{percentage}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border fx-border p-0.5">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, href }: any) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 border-2 border-transparent hover:border-indigo-100 group relative overflow-hidden">
      <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/[0.02] transition-colors"></div>
      <span className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-500 block relative z-10">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-600 transition-all relative z-10">{label}</span>
    </Link>
  );
}
