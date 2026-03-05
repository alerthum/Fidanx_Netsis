"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function BatchDetailPage({ params }: { params: { id: string } }) {
    const [batch, setBatch] = useState<{
        id: string;
        plantName: string;
        source: string;
        plantedAt: string;
        totalQuantity: number;
        currentQuantity: number;
        totalCost: string;
        status: string;
        history: { date: string; stage?: string; action: string; note?: string; cost?: string }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const id = typeof params.id === 'string' ? params.id : (params as any).id;
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${API_URL}/production/batches/${encodeURIComponent(id)}?tenantId=demo-tenant`)
            .then(res => {
                if (!res.ok) throw new Error(res.status === 404 ? 'Parti bulunamadı.' : 'Yüklenemedi.');
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                const startDate = data.StartDate || data.startDate;
                const dateStr = startDate ? new Date(startDate).toISOString().slice(0, 10) : '-';
                const historyList = Array.isArray(data.history) ? data.history : [];
                setBatch({
                    id: data.LotId || data.id || id,
                    plantName: data.PlantName || data.plantName || '—',
                    source: data.Location || data.location || '—',
                    plantedAt: dateStr,
                    totalQuantity: Number(data.Quantity ?? data.quantity ?? 0),
                    currentQuantity: Number(data.Quantity ?? data.quantity ?? 0),
                    totalCost: (data.AccumulatedCost ?? data.accumulatedCost ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL',
                    status: data.Status || data.status || 'AKTIF',
                    history: historyList.map((h: any) => ({
                        date: h.date ? new Date(h.date).toISOString().slice(0, 10) : '-',
                        action: h.action || h.Action || '',
                        note: h.note || h.Note,
                        stage: h.stage || data.Stage || data.stage,
                        cost: h.amount != null ? `${Number(h.amount).toFixed(0)} TL` : undefined
                    }))
                });
            })
            .catch(err => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [params.id]);

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <p className="text-rose-600 font-medium">{error || 'Parti yüklenemedi.'}</p>
                <Link href="/uretim" className="text-emerald-600 text-sm font-bold mt-2 inline-block hover:underline">← Üretim listesine dön</Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            <header className="flex justify-between items-start">
                <div>
                    <nav className="text-sm text-slate-500 mb-2">Üretim / Partiler / {batch.id}</nav>
                    <h1 className="text-3xl font-extrabold text-slate-900">{batch.plantName}</h1>
                    <p className="text-slate-500 mt-1">Kaynak: <span className="font-semibold text-slate-700">{batch.source}</span></p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm">
                        Barkod Yazdır
                    </button>
                    <Link href={`/uretim?batchId=${batch.id}`} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md">
                        Saksı Değiştir (Büyüt)
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard title="Mevcut Stok" value={batch.currentQuantity} sub={`${batch.totalQuantity} adet ile başlandı`} />
                <MetricCard title="Toplam Maliyet" value={batch.totalCost} sub={batch.totalQuantity > 0 ? `Birim: ${(parseFloat(batch.totalCost.replace(/[^\d,.]/g, '').replace(',', '.')) / batch.totalQuantity).toFixed(2)} TL` : ''} />
                <MetricCard title="Durum" value={batch.status} sub="Parti durumu" />
                <MetricCard title="Kayıt" value={batch.history.length} sub="Geçmiş kayıt sayısı" color="text-slate-700" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">Yaşam Döngüsü & Geçmiş</h2>
                    <span className="text-sm font-medium text-slate-500">Kayıt Sayısı: {batch.history.length}</span>
                </div>
                <div className="p-6">
                    {batch.history.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-8">Henüz geçmiş kaydı yok.</p>
                    ) : (
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {batch.history.map((log, i) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-green-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                        <span className="text-xs font-bold">{i + 1}</span>
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                            <div className="font-bold text-slate-900">{log.action}</div>
                                            <time className="font-mono text-xs text-indigo-500 font-bold">{log.date}</time>
                                        </div>
                                        {log.note && <div className="text-slate-500 text-sm mb-2">{log.note}</div>}
                                        <div className="flex items-center gap-2">
                                            {log.stage && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{log.stage}</span>}
                                            {log.cost && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold">Maliyet: {log.cost}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <section className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 border-dashed">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Satış Sonrası Takip</h2>
                <p className="text-slate-600 text-sm">Bu bölüm satış ve müşteri deneyimi verileri entegre edildiğinde doldurulacaktır.</p>
            </section>
        </div>
    );
}

function MetricCard({ title, value, sub, color = "text-slate-900" }: { title: string; value: React.ReactNode; sub: string; color?: string }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
    );
}
