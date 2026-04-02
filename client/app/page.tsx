"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TurkeyMap from '@/components/TurkeyMap';
import Link from 'next/link';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [stats, setStats] = useState({ totalStock: 0, totalOrders: 0, totalExpenses: 0, viyolCount: 0, celikCount: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState({ healthy: 0, observation: 0, critical: 0 });
  const [regionalSales, setRegionalSales] = useState<Record<string, number>>({});
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const [tempStats, setTempStats] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      // Netsis'ten son fatura hareketlerini "aktivite" olarak gösteriyoruz
      const res = await fetch(`${API_URL}/netsis/invoices?pageSize=10`);
      const data = await res.json();
      if (data && data.items) {
        setActivities(data.items.map((inv: any) => ({
          id: inv.BelgeNo,
          title: inv.CariAdi,
          action: inv.FaturaTuruLabel,
          date: inv.Tarih,
          icon: inv.FaturaTuru === '1' ? '📤' : '📥',
          color: inv.FaturaTuru === '1' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        })));
      }
    } catch (err) { }
  };

  const fetchStats = async () => {
    try {
      const [stockRes, salesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/netsis/dashboard/stock-summary`),
        fetch(`${API_URL}/netsis/dashboard/sales-comparison`),
        fetch(`${API_URL}/netsis/invoices/summary`)
      ]);

      const [stockSummary, salesComparison, shipmentSummary] = await Promise.all([
        stockRes.ok ? stockRes.json() : [],
        salesRes.ok ? salesRes.json() : [],
        summaryRes.ok ? summaryRes.json() : []
      ]);

      const stockData = stockSummary[0] || {};
      const totalSales = Array.isArray(salesComparison)
        ? salesComparison.reduce((acc: number, s: any) => acc + (s.ToplamSatış || 0), 0)
        : 0;

      // Alış faturası toplamlarını gider olarak gösteriyoruz
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

      // Sıcaklık: production/sicaklik API (veritabanı)
      try {
        const tempRes = await fetch(`${API_URL}/production/sicaklik?tenantId=demo-tenant`);
        if (tempRes.ok) {
          const tempLogs = await tempRes.json();
          // Group by date to show daily or average? 
          // The current UI shows bars for different months/periods.
          // Let's just show the last 12 individual logs with their period.
          const mapped = (Array.isArray(tempLogs) ? tempLogs.slice(0, 12) : []).map((l: any) => ({
            sabah: l.periyot === 'SABAH' ? l.icSicaklik : 0,
            ogle: l.periyot === 'OGLE' ? l.icSicaklik : 0,
            aksam: l.periyot === 'AKSAM' ? l.icSicaklik : 0,
            month: l.date ? new Date(l.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-',
            fullDate: l.date ? new Date(l.date).toLocaleDateString() : '',
            periyot: l.periyot,
            temp: l.icSicaklik
          }));
          setTempStats(mapped);
        } else {
          setTempStats([]);
        }
      } catch (_) {
        setTempStats([]);
      }

    } catch (err) { console.error('Stats fetch error:', err); }
  };



  return (
    <div className="flex flex-col lg:flex-row min-h-screen fx-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 lg:top-0 z-30 shadow-xs gap-4">
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
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest leading-relaxed">Ortalama İç Sıcaklık Takibi (°C)</p>
                </div>
                <Link href="/sera" className="bg-slate-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">Detaylı Rapor</Link>
              </div>

              {tempStats.length > 0 ? (
                <div className="flex items-end justify-between gap-1 lg:gap-3 h-64 w-full pt-4">
                  {tempStats.slice().reverse().map((stat, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-slate-900 shadow-2xl text-white text-[10px] p-3 rounded-2xl whitespace-nowrap z-10 pointer-events-none text-center">
                        <span className="font-black opacity-50 uppercase tracking-widest block mb-1">{stat.fullDate}</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="font-bold">{stat.periyot}: {stat.temp}°C</span>
                        </div>
                      </div>

                      {/* Bar Container */}
                      <div className="relative w-full h-[85%] flex items-end justify-center bg-slate-50 rounded-2xl overflow-hidden p-1 group-hover:bg-indigo-50/30 transition-all">
                        <div
                          className={`w-full rounded-xl transition-all duration-700 hover:brightness-110 shadow-sm ${stat.periyot === 'SABAH' ? 'bg-indigo-300' :
                            stat.periyot === 'OGLE' ? 'bg-indigo-600' :
                              'bg-indigo-400'
                            }`}
                          style={{ height: `${Math.min(100, (parseFloat(stat.temp) / 45) * 100)}%` }}
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
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Veri bulunamadı</p>
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
                          {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
