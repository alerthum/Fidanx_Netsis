"use client";
import React from 'react';

export default function PartilerTab({
    batches = [],
    openCostModal,
    openTransplantModal,
    openFireModal,
    openSatisModal
}: {
    batches: any[],
    openCostModal: any,
    openTransplantModal: any,
    openFireModal: any,
    openSatisModal: any
}) {

    return (
        <div className="p-4 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Desktop view */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Parti BILGISI</th>
                                <th className="px-6 py-4">Safha & Konum</th>
                                <th className="px-6 py-4 text-center">Miktar</th>
                                <th className="px-6 py-4 text-right">Birim Maliyet</th>
                                <th className="px-6 py-4 text-center">Hızlı İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {batches.map(batch => (
                                <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100">
                                                {batch.safha?.includes('TEPSİ') ? '🌱' : '🪴'}
                                            </div>
                                            <div>
                                                <p className="font-mono font-bold text-slate-900">{batch.partiNo}</p>
                                                <p className="font-bold text-emerald-700 shadow-sm">{batch.bitkiAdi}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Stok Kodu: {batch.netsisStokKodu}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100 flex items-center gap-1.5 shadow-[0_2px_10px_-4px_rgba(59,130,246,0.3)]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                {batch.safha}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                <span className="text-slate-400">📍</span>
                                                {batch.konum}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-baseline gap-1">
                                            <span className="font-mono font-black text-slate-800 text-lg">{batch.mevcutMiktar}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Adet</span>
                                        </div>
                                        {Number(batch.fireMiktar) > 0 && (
                                            <p className="text-[10px] font-bold text-red-500 mt-0.5">-{batch.fireMiktar} Fire</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-slate-900 text-base">{Number(batch.birimMaliyet || 0).toFixed(2)} ₺</span>
                                            <button
                                                onClick={() => openCostModal(batch)}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition opacity-0 group-hover:opacity-100 -mr-1 pr-1"
                                            >
                                                Maliyet Detayı İzle →
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                title="Detay"
                                                onClick={() => window.location.href = `/uretim/${batch.id}`}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-95"
                                            >
                                                📋
                                            </button>
                                            <button
                                                title="Şaşırtma Yap"
                                                onClick={() => openTransplantModal(batch)}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-95"
                                            >
                                                🔄
                                            </button>
                                            <button
                                                title="Satış Yap"
                                                onClick={() => openSatisModal(batch)}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-95"
                                            >
                                                🏷️
                                            </button>
                                            <button
                                                title="Fire Kaydı"
                                                onClick={() => openFireModal(batch)}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-95"
                                            >
                                                💀
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {batches.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-slate-400">
                                        <div className="text-4xl mb-3 opacity-30">🌱</div>
                                        <p className="font-bold">Henüz üretim partisi bulunmamaktadır.</p>
                                        <p className="text-xs mt-1">Yeni Parti Başlat butonunu kullanarak üretime başlayabilirsiniz.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden divide-y divide-slate-100">
                    {batches.map(batch => (
                        <div key={batch.id} className="p-4 bg-white">
                            <div className="flex items-start gap-4 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm border border-emerald-100 flex-shrink-0">
                                    {batch.safha?.includes('TEPSİ') ? '🌱' : '🪴'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono font-bold text-slate-900 text-sm truncate">{batch.partiNo}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 truncate flex-shrink-0 max-w-[100px]">{batch.safha}</span>
                                    </div>
                                    <p className="font-bold text-emerald-700 truncate">{batch.bitkiAdi}</p>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate flex items-center gap-1">
                                        📍 {batch.konum}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-b border-slate-50 border-dashed my-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Miktar</span>
                                    <span className="font-mono font-black text-slate-800">{batch.mevcutMiktar} <span className="text-[10px] font-medium text-slate-500">Adet</span></span>
                                </div>
                                <div className="w-px h-6 bg-slate-200"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Birim Maliyet</span>
                                    <button onClick={() => openCostModal(batch)} className="font-black text-emerald-600">{Number(batch.birimMaliyet || 0).toFixed(2)} ₺</button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => window.location.href = `/uretim/${batch.id}`} className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 active:scale-95 transition-all">
                                    📋 Detay
                                </button>
                                <button onClick={() => openTransplantModal(batch)} className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 active:scale-95 transition-all">
                                    🔄 Şaşırtma
                                </button>
                                <button onClick={() => openSatisModal(batch)} className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 active:scale-95 transition-all">
                                    🏷️ Satış
                                </button>
                                <button onClick={() => openFireModal(batch)} className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all">
                                    💀 Fire
                                </button>
                            </div>
                        </div>
                    ))}
                    {batches.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">Parti bulunamadı.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
