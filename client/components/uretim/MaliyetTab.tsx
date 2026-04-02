"use client";
import React, { useMemo } from 'react';

interface MaliyetTabProps {
    batches: any[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function MaliyetTab({ batches }: MaliyetTabProps) {
    const aktifBatches = useMemo(() => batches.filter(b => b.durum === 'AKTIF' && b.mevcutMiktar > 0), [batches]);

    const toplamMaliyet = useMemo(() => aktifBatches.reduce((s, b) => s + (b.toplamMaliyet || 0), 0), [aktifBatches]);
    const toplamAdet = useMemo(() => aktifBatches.reduce((s, b) => s + (b.mevcutMiktar || 0), 0), [aktifBatches]);

    const safhaDagilim = useMemo(() => {
        const map: Record<string, { adet: number; maliyet: number }> = {};
        aktifBatches.forEach(b => {
            const key = b.safha || 'DİĞER';
            if (!map[key]) map[key] = { adet: 0, maliyet: 0 };
            map[key].adet += b.mevcutMiktar || 0;
            map[key].maliyet += b.toplamMaliyet || 0;
        });
        return Object.entries(map).map(([safha, data]) => ({ safha, ...data }));
    }, [aktifBatches]);

    const konumDagilim = useMemo(() => {
        const map: Record<string, { adet: number; maliyet: number }> = {};
        aktifBatches.forEach(b => {
            const key = b.konum || 'Belirtilmemiş';
            if (!map[key]) map[key] = { adet: 0, maliyet: 0 };
            map[key].adet += b.mevcutMiktar || 0;
            map[key].maliyet += b.toplamMaliyet || 0;
        });
        return Object.entries(map).map(([konum, data]) => ({ konum, ...data }));
    }, [aktifBatches]);

    const enPahaliPartiler = useMemo(() =>
        [...aktifBatches].sort((a, b) => (b.toplamMaliyet || 0) - (a.toplamMaliyet || 0)).slice(0, 10),
        [aktifBatches]
    );

    const renderPieChart = (data: { label: string; value: number; color: string }[], size = 180) => {
        const total = data.reduce((s, d) => s + d.value, 0);
        if (total === 0) return null;
        let cumulative = 0;
        const slices = data.map((d) => {
            const start = cumulative;
            cumulative += d.value;
            const startAngle = (start / total) * 360;
            const endAngle = (cumulative / total) * 360;
            return { ...d, startAngle, endAngle };
        });

        const r = size / 2;
        const cx = r;
        const cy = r;
        const radius = r - 10;

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {slices.map((s, i) => {
                    if (s.endAngle - s.startAngle >= 360) {
                        return <circle key={i} cx={cx} cy={cy} r={radius} fill={s.color} />;
                    }
                    const startRad = ((s.startAngle - 90) * Math.PI) / 180;
                    const endRad = ((s.endAngle - 90) * Math.PI) / 180;
                    const x1 = cx + radius * Math.cos(startRad);
                    const y1 = cy + radius * Math.sin(startRad);
                    const x2 = cx + radius * Math.cos(endRad);
                    const y2 = cy + radius * Math.sin(endRad);
                    const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
                    return (
                        <path
                            key={i}
                            d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={s.color}
                            stroke="white"
                            strokeWidth="2"
                        />
                    );
                })}
                <circle cx={cx} cy={cy} r={radius * 0.5} fill="white" />
                <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-black fill-slate-800">
                    ₺{(total / 1000).toFixed(0)}K
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" className="text-[9px] font-bold fill-slate-400 uppercase">
                    Toplam
                </text>
            </svg>
        );
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Özet Kartlar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="fx-card !p-6 text-center">
                    <p className="text-3xl font-black text-emerald-600">₺{toplamMaliyet.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                    <p className="text-[10px] font-bold fx-text-secondary uppercase tracking-widest mt-2">Toplam Yatırım</p>
                </div>
                <div className="fx-card !p-6 text-center">
                    <p className="text-3xl font-black text-blue-600">{toplamAdet.toLocaleString('tr-TR')}</p>
                    <p className="text-[10px] font-bold fx-text-secondary uppercase tracking-widest mt-2">Toplam Bitki</p>
                </div>
                <div className="fx-card !p-6 text-center">
                    <p className="text-3xl font-black text-amber-600">₺{toplamAdet > 0 ? (toplamMaliyet / toplamAdet).toFixed(2) : '0'}</p>
                    <p className="text-[10px] font-bold fx-text-secondary uppercase tracking-widest mt-2">Ort. Birim Maliyet</p>
                </div>
                <div className="fx-card !p-6 text-center">
                    <p className="text-3xl font-black text-purple-600">{aktifBatches.length}</p>
                    <p className="text-[10px] font-bold fx-text-secondary uppercase tracking-widest mt-2">Aktif Parti</p>
                </div>
            </div>

            {/* Grafikler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Safha Dağılımı */}
                <div className="fx-card !p-8">
                    <h3 className="font-black text-sm fx-text uppercase tracking-widest mb-6">Safha Bazlı Maliyet Dağılımı</h3>
                    <div className="flex items-center justify-center gap-8">
                        {renderPieChart(safhaDagilim.map((d, i) => ({
                            label: d.safha,
                            value: d.maliyet,
                            color: COLORS[i % COLORS.length]
                        })))}
                        <div className="space-y-3">
                            {safhaDagilim.map((d, i) => (
                                <div key={d.safha} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <div>
                                        <p className="text-xs font-bold fx-text">{d.safha}</p>
                                        <p className="text-[10px] fx-text-secondary">{d.adet} ad / ₺{d.maliyet.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Konum Dağılımı */}
                <div className="fx-card !p-8">
                    <h3 className="font-black text-sm fx-text uppercase tracking-widest mb-6">Konum Bazlı Maliyet Dağılımı</h3>
                    <div className="flex items-center justify-center gap-8">
                        {renderPieChart(konumDagilim.map((d, i) => ({
                            label: d.konum,
                            value: d.maliyet,
                            color: COLORS[(i + 3) % COLORS.length]
                        })))}
                        <div className="space-y-3">
                            {konumDagilim.map((d, i) => (
                                <div key={d.konum} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }}></div>
                                    <div>
                                        <p className="text-xs font-bold fx-text">{d.konum}</p>
                                        <p className="text-[10px] fx-text-secondary">{d.adet} ad / ₺{d.maliyet.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* En Pahalı Partiler Tablosu */}
            <div className="fx-card !p-0 overflow-hidden">
                <div className="p-6 border-b fx-border">
                    <h3 className="font-black text-sm fx-text uppercase tracking-widest">En Yüksek Maliyetli Partiler (Top 10)</h3>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black fx-text-secondary tracking-widest">
                        <tr>
                            <th className="px-6 py-3">Parti No</th>
                            <th className="px-6 py-3">Bitki</th>
                            <th className="px-6 py-3">Safha</th>
                            <th className="px-6 py-3">Konum</th>
                            <th className="px-6 py-3 text-right">Adet</th>
                            <th className="px-6 py-3 text-right">Birim ₺</th>
                            <th className="px-6 py-3 text-right">Toplam ₺</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y fx-border text-sm">
                        {enPahaliPartiler.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                <td className="px-6 py-3 font-mono font-bold text-xs">{b.partiNo}</td>
                                <td className="px-6 py-3 font-bold fx-text">{b.bitkiAdi}</td>
                                <td className="px-6 py-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">{b.safha}</span></td>
                                <td className="px-6 py-3 fx-text-secondary text-xs">{b.konum}</td>
                                <td className="px-6 py-3 text-right font-bold">{b.mevcutMiktar}</td>
                                <td className="px-6 py-3 text-right font-mono text-xs">₺{(b.birimMaliyet || 0).toFixed(2)}</td>
                                <td className="px-6 py-3 text-right font-black text-emerald-600">₺{(b.toplamMaliyet || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                            </tr>
                        ))}
                        {enPahaliPartiler.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center fx-text-secondary">Henüz maliyet verisi yok</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
