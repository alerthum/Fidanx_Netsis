"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const TENANT_ID = 'demo-tenant';

interface BatchDetail {
    id: string;
    partiNo: string;
    bitkiAdi: string;
    netsisStokKodu: string;
    safha: string;
    konum: string;
    baslangicMiktar: number;
    mevcutMiktar: number;
    birimMaliyet: number;
    toplamMaliyet: number;
    fireMiktar: number;
    satilanMiktar: number;
    durum: string;
    baslangicTarihi: string;
    alisFaturaNo: string;
    history: OperationLog[];
}

interface OperationLog {
    id: number;
    islemTipi: string;
    aciklama: string;
    miktar: number;
    maliyetTutar: number;
    birimMaliyetEtkisi: number;
    kullanilanMalzeme: string;
    kullanilanMiktar: number;
    hedefKonum: string;
    hedefSafha: string;
    islemTarihi: string;
}

const ISLEM_TIPI_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    ALIS_GIRIS: { label: 'Alış Girişi', color: 'bg-emerald-500', icon: '📥' },
    SASIRTMA_CIKIS: { label: 'Şaşırtma Çıkış', color: 'bg-orange-400', icon: '📤' },
    SASIRTMA_GIRIS: { label: 'Şaşırtma Giriş', color: 'bg-emerald-500', icon: '🌿' },
    TRANSFER: { label: 'Konum Transferi', color: 'bg-amber-400', icon: '🚚' },
    FIRE: { label: 'Fire', color: 'bg-red-500', icon: '💀' },
    SATIS: { label: 'Satış', color: 'bg-blue-500', icon: '🏷️' },
    ILACLAMA: { label: 'İlaçlama', color: 'bg-purple-400', icon: '💧' },
    GUBRELEME: { label: 'Gübreleme', color: 'bg-yellow-500', icon: '🧪' },
    SULAMA: { label: 'Sulama', color: 'bg-cyan-400', icon: '💦' },
    BUDAMA: { label: 'Budama', color: 'bg-lime-500', icon: '✂️' },
    GIDER_DAGITIM: { label: 'Gider Dağıtımı', color: 'bg-slate-400', icon: '📊' },
    DIGER: { label: 'Diğer', color: 'bg-slate-300', icon: '📝' },
};

export default function BatchDetailPage({ params }: { params: { id: string } }) {
    const [batch, setBatch] = useState<BatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBatch = () => {
        const id = typeof params.id === 'string' ? params.id : (params as any).id;
        if (!id) return;
        setLoading(true);
        setError(null);
        fetch(`${API_URL}/production/batches/${encodeURIComponent(id)}?tenantId=${TENANT_ID}`)
            .then(res => {
                if (!res.ok) throw new Error(res.status === 404 ? 'Parti bulunamadı.' : 'Yüklenemedi.');
                return res.json();
            })
            .then(data => setBatch(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchBatch(); }, [params.id]);

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
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
            <div className="p-8 max-w-6xl mx-auto">
                <p className="text-rose-600 font-medium">{error || 'Parti yüklenemedi.'}</p>
                <Link href="/uretim" className="text-emerald-600 text-sm font-bold mt-2 inline-block hover:underline">← Üretim listesine dön</Link>
            </div>
        );
    }

    const birimMaliyetDisplay = batch.mevcutMiktar > 0
        ? Number(batch.toplamMaliyet / batch.mevcutMiktar).toFixed(2)
        : '0.00';

    return (
        <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <nav className="text-sm text-slate-500 mb-2">
                        <Link href="/uretim" className="hover:text-emerald-600 transition">Üretim</Link>
                        <span className="mx-2">/</span>
                        <span className="font-bold text-slate-700">{batch.partiNo}</span>
                    </nav>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{batch.bitkiAdi}</h1>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">{batch.safha}</span>
                        <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">📍 {batch.konum}</span>
                        <span className={`px-3 py-1 rounded-lg font-bold text-xs ${batch.durum === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {batch.durum}
                        </span>
                        {batch.netsisStokKodu && (
                            <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-500 font-medium text-xs border border-slate-200">Stok: {batch.netsisStokKodu}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/uretim" className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition">
                        ← Listeye Dön
                    </Link>
                </div>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Mevcut Stok" value={`${batch.mevcutMiktar}`} sub={`Başlangıç: ${batch.baslangicMiktar} adet`} />
                <MetricCard title="Toplam Maliyet" value={`₺${Number(batch.toplamMaliyet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} sub={`Birim: ₺${birimMaliyetDisplay}`} color="text-emerald-700" />
                <MetricCard title="Fire" value={`${batch.fireMiktar || 0}`} sub="Kayıp adet" color={batch.fireMiktar > 0 ? "text-red-600" : "text-slate-400"} />
                <MetricCard title="Satılan" value={`${batch.satilanMiktar || 0}`} sub="Satış adedi" color={batch.satilanMiktar > 0 ? "text-blue-600" : "text-slate-400"} />
            </div>

            {/* Fatura & Tarih Bilgisi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Başlangıç Tarihi</p>
                    <p className="font-bold text-slate-800">{batch.baslangicTarihi ? new Date(batch.baslangicTarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alış Fatura No</p>
                    <p className="font-bold text-slate-800">{batch.alisFaturaNo || '-'}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">İşlem Geçmişi</p>
                    <p className="font-bold text-slate-800">{batch.history?.length || 0} kayıt</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Yaşam Döngüsü & İşlem Geçmişi</h2>
                    <span className="text-xs font-bold text-slate-400">{batch.history?.length || 0} kayıt</span>
                </div>
                <div className="p-6">
                    {(!batch.history || batch.history.length === 0) ? (
                        <p className="text-slate-400 italic text-center py-8">Henüz işlem geçmişi yok.</p>
                    ) : (
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                            {batch.history.map((h, i) => {
                                const meta = ISLEM_TIPI_LABELS[h.islemTipi] || ISLEM_TIPI_LABELS.DIGER;

                                return (
                                    <div key={h.id || i} className="relative pl-6">
                                        <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 ${meta.color}`}></div>

                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <span className="text-sm">{meta.icon}</span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{meta.label}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {h.islemTarihi ? new Date(h.islemTarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-slate-800 text-sm leading-snug">{h.aciklama || h.islemTipi}</p>

                                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                        {h.miktar > 0 && (
                                                            <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{h.miktar} adet</span>
                                                        )}
                                                        {h.kullanilanMalzeme && (
                                                            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-100">📦 {h.kullanilanMalzeme}</span>
                                                        )}
                                                        {h.hedefKonum && (
                                                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">📍 {h.hedefKonum}</span>
                                                        )}
                                                        {h.hedefSafha && (
                                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{h.hedefSafha}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                                    {h.maliyetTutar > 0 && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100">
                                                            +{Number(h.maliyetTutar).toFixed(2)} ₺
                                                        </span>
                                                    )}
                                                    {h.birimMaliyetEtkisi > 0 && (
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            Birim: +{Number(h.birimMaliyetEtkisi).toFixed(3)} ₺
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, sub, color = "text-slate-900" }: { title: string; value: React.ReactNode; sub: string; color?: string }) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
    );
}
