"use client";
import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

interface Batch {
    id: number | string;
    partiNo: string;
    bitkiAdi: string;
    safha: string;
    konum: string;
    mevcutMiktar: number;
    netsisStokKodu?: string;
}

interface BarkodEtiketProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Batch | null;
}

export default function BarkodEtiket({ isOpen, onClose, batch }: BarkodEtiketProps) {
    const [etiketSayisi, setEtiketSayisi] = useState(1);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [etiketBoyut, setEtiketBoyut] = useState<'50x30' | '70x40' | '100x50'>('50x30');

    const generateQR = useCallback(async () => {
        if (!batch) return;
        try {
            const data = JSON.stringify({
                p: batch.partiNo,
                s: batch.netsisStokKodu || '',
                b: batch.bitkiAdi,
                f: batch.safha
            });
            const url = await QRCode.toDataURL(data, {
                width: 200,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'M'
            });
            setQrDataUrl(url);
        } catch { setQrDataUrl(''); }
    }, [batch]);

    useEffect(() => {
        if (isOpen && batch) {
            generateQR();
            setEtiketSayisi(1);
        }
    }, [isOpen, batch, generateQR]);

    if (!isOpen || !batch) return null;

    const boyutlar: Record<string, { w: number; h: number; fontSize: number }> = {
        '50x30': { w: 189, h: 113, fontSize: 7 },
        '70x40': { w: 265, h: 151, fontSize: 9 },
        '100x50': { w: 378, h: 189, fontSize: 11 },
    };
    const b = boyutlar[etiketBoyut];

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const etiketler = Array.from({ length: etiketSayisi }, (_, i) => `
            <div class="etiket" style="width:${b.w}px;height:${b.h}px;border:1px solid #ccc;padding:4px;display:inline-flex;align-items:center;gap:6px;margin:4px;page-break-inside:avoid;font-family:Arial,sans-serif;box-sizing:border-box;">
                <img src="${qrDataUrl}" style="width:${b.h - 10}px;height:${b.h - 10}px;flex-shrink:0;" />
                <div style="flex:1;overflow:hidden;">
                    <div style="font-size:${b.fontSize + 2}px;font-weight:900;letter-spacing:1px;margin-bottom:2px;">${batch.partiNo}</div>
                    <div style="font-size:${b.fontSize}px;font-weight:700;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${batch.bitkiAdi}</div>
                    <div style="font-size:${b.fontSize - 1}px;color:#666;margin-top:1px;">${batch.safha} | ${batch.konum}</div>
                    ${batch.netsisStokKodu ? `<div style="font-size:${b.fontSize - 2}px;color:#999;font-family:monospace;margin-top:1px;">${batch.netsisStokKodu}</div>` : ''}
                </div>
            </div>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>FidanX Etiket - ${batch.partiNo}</title>
            <style>
                body { margin: 8px; }
                @media print {
                    body { margin: 0; }
                    .etiket { border-color: #eee !important; }
                }
            </style>
            </head><body>${etiketler}</body></html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Barkod Etiket Basımı</h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">{batch.partiNo} - {batch.bitkiAdi}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Etiket Önizleme */}
                    <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center">
                        <div className="bg-white border-2 border-slate-200 rounded-lg p-3 flex items-center gap-4 shadow-sm" style={{ minWidth: 260 }}>
                            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-24 h-24 flex-shrink-0" />}
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 tracking-wider">{batch.partiNo}</p>
                                <p className="text-xs font-bold text-slate-600 truncate">{batch.bitkiAdi}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{batch.safha} | {batch.konum}</p>
                                {batch.netsisStokKodu && <p className="text-[9px] font-mono text-slate-300 mt-0.5">{batch.netsisStokKodu}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Ayarlar */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Etiket Boyutu</label>
                            <select
                                value={etiketBoyut}
                                onChange={e => setEtiketBoyut(e.target.value as any)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                            >
                                <option value="50x30">50 x 30 mm (Küçük)</option>
                                <option value="70x40">70 x 40 mm (Orta)</option>
                                <option value="100x50">100 x 50 mm (Büyük)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Adet</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={etiketSayisi}
                                onChange={e => setEtiketSayisi(Math.max(1, Math.min(500, Number(e.target.value))))}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 text-center"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition">
                            Vazgeç
                        </button>
                        <button onClick={handlePrint} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                            Yazdır ({etiketSayisi} Adet)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
