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

      // Sıcaklık: production/temperature-logs API (veritabanı)
      try {
        const tempRes = await fetch(`${API_URL}/production/temperature-logs?tenantId=demo-tenant`);
        if (tempRes.ok) {
          const tempLogs = await tempRes.json();
          const mapped = (Array.isArray(tempLogs) ? tempLogs.slice(0, 12) : []).map((l: any) => ({
            sabah: l.seraIci?.sabah ?? l.SeraIciSabah ?? '-',
            ogle: l.seraIci?.ogle ?? l.SeraIciOgle ?? '-',
            aksam: l.seraIci?.aksam ?? l.SeraIciAksam ?? '-',
            month: l.date ? new Date(l.date).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }) : '-'
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
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
            <div className="xl:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Bölgesel Satış</h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">Genel Dağılım</p>
                </div>
              </div>
              <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                <div className="w-full h-full max-w-[800px] p-4 scale-90 origin-center">
                  <TurkeyMap data={regionalSales} />
                </div>
              </div>
            </div>

            {/* Sağlık & Hızlı İşlemler */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em]">Fidan Sağlık Durumu</h3>
                <div className="space-y-6">
                  {healthStatus.healthy === 0 && healthStatus.observation === 0 && healthStatus.critical === 0 ? (
                    <p className="text-slate-400 text-sm italic">Veri bulunamadı.</p>
                  ) : (
                    <>
                      <HealthBar label="Sağlıklı" percentage={healthStatus.healthy} color="bg-emerald-500" />
                      <HealthBar label="Gözlem Altında" percentage={healthStatus.observation} color="bg-amber-500" />
                      <HealthBar label="Kritik (Hastalık Riski)" percentage={healthStatus.critical} color="bg-rose-500" />
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-[0.2em]">Hızlı Operasyonlar</h3>
                <div className="grid grid-cols-2 gap-4">
                  <QuickAction icon="🚜" label="Gübreleme" href="/operasyon" />
                  <QuickAction icon="💧" label="Sulama" href="/operasyon" />
                  <QuickAction icon="📦" label="Sayım" href="/stoklar" />
                  <QuickAction icon="🚚" label="Sevkiyat Onay" href="/satislar" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Sera İklim Analizi (Yeni Konum - Sol) */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Sera İklim Analizi</h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">En Yüksek Sıcaklıklar (Sabah / Öğle / Akşam)</p>
                </div>
                <Link href="/sera" className="text-emerald-600 text-xs font-black uppercase tracking-widest hover:underline">Detaylı Rapor</Link>
              </div>

              {tempStats.length > 0 ? (
                <div className="flex items-end justify-between gap-4 h-64 w-full pt-4">
                  {tempStats.map((stat, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-2 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                        Sabah: {stat.sabah}° <br /> Öğle: {stat.ogle}° <br /> Akşam: {stat.aksam}°
                      </div>

                      {/* Bars Container */}
                      <div className="relative w-full max-w-[50px] h-full flex items-end justify-center bg-slate-50 rounded-xl overflow-hidden gap-[2px] p-1">
                        {/* Sabah (Blue) */}
                        <div className="w-1/3 bg-blue-300 hover:bg-blue-400 transition-all rounded-t-sm relative group/bar" style={{ height: `${Math.min(100, (parseFloat(stat.sabah) / 45) * 100)}%` }}></div>
                        {/* Öğle (Orange/Red) */}
                        <div className="w-1/3 bg-orange-400 hover:bg-orange-500 transition-all rounded-t-sm relative group/bar" style={{ height: `${Math.min(100, (parseFloat(stat.ogle) / 45) * 100)}%` }}></div>
                        {/* Akşam (Indigo) */}
                        <div className="w-1/3 bg-indigo-300 hover:bg-indigo-400 transition-all rounded-t-sm relative group/bar" style={{ height: `${Math.min(100, (parseFloat(stat.aksam) / 45) * 100)}%` }}></div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="block text-xs font-bold text-slate-700">{stat.month}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                  <span className="text-4xl mb-2">🌡️</span>
                  <p className="text-sm italic">Veri bulunamadı.</p>
                </div>
              )}
            </div>

            {/* Son Aktiviteler (Yeni Konum - Sağ) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Son Sistem Kayıtları</h2>
                <button className="text-emerald-600 text-xs font-black uppercase tracking-widest hover:underline">Tümünü Gör</button>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                {activities.map((item, i) => (
                  <div key={item.id || i} className="flex items-center gap-6 px-8 py-5 hover:bg-slate-50/80 transition cursor-pointer group">
                    <div className={`w-12 h-12 ${item.color || 'bg-slate-50'} rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform`}>{item.icon || '📝'}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 mb-0.5">{item.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">
                        {item.action} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-slate-300 group-hover:text-emerald-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="p-8 text-center text-slate-400 italic">Henüz sistem kaydı bulunmuyor.</p>
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{title}</p>
      <div className="flex justify-between items-end">
        <h3 className={`${smallerText ? 'text-lg' : 'text-2xl'} font-bold text-slate-800 tracking-tight`}>{value}</h3>
        <span className={`text-[9px] font-black px-2 py-1.5 rounded-lg uppercase tracking-widest ${neutral ? 'bg-slate-100 text-slate-500' :
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
      <div className="flex justify-between text-[10px] font-black mb-2 text-slate-500 uppercase tracking-widest">
        <span>{label}</span>
        <span>%{percentage}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, href }: any) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all duration-300 border border-slate-100 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200 group">
      <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-center">{label}</span>
    </Link>
  );
}
