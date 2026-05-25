"use client";
import React, { useState } from 'react';

interface MigrationKalem {
    saksiBoyutu: string;
    miktar: number;
    birimMaliyet: number;
    yeniStokKodu: string;
    yeniStokAdi: string;
    lokasyonAdi: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedStock: { id: string; name: string; sku: string; currentStock?: number } | null;
    onComplete: () => void;
}

const SAKSI_BOYUTLARI = [
    '0.5L', '1L', '1.5L', '2L', '2.5L', '3L', '3.5L', '5L', '7L', '10L',
    '12L', '15L', '20L', '25L', '30L', '50L', '70L', '100L',
    'Açık Köklü', 'Tepsi/Viyol'
];

import PremiumModal from '@/components/PremiumModal';

export default function StokDonusumModal({ isOpen, onClose, selectedStock, onComplete }: Props) {
    const [step, setStep] = useState(1);
    const [fireMiktar, setFireMiktar] = useState(0);
    const [fireAciklama, setFireAciklama] = useState('');
    const [kalemler, setKalemler] = useState<MigrationKalem[]>([
        { saksiBoyutu: '5L', miktar: 0, birimMaliyet: 0, yeniStokKodu: '', yeniStokAdi: '', lokasyonAdi: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    if (!isOpen || !selectedStock) return null;

    const toplamYeni = kalemler.reduce((s, k) => s + (k.miktar || 0), 0);
    const toplamCikis = toplamYeni + (fireMiktar || 0);
    const mevcutStok = selectedStock.currentStock || 0;
    const fark = mevcutStok - toplamCikis;

    const addKalem = () => {
        setKalemler([...kalemler, { saksiBoyutu: '5L', miktar: 0, birimMaliyet: 0, yeniStokKodu: '', yeniStokAdi: '', lokasyonAdi: '' }]);
    };

    const removeKalem = (idx: number) => {
        if (kalemler.length <= 1) return;
        setKalemler(kalemler.filter((_, i) => i !== idx));
    };

    const updateKalem = (idx: number, field: keyof MigrationKalem, value: any) => {
        const updated = [...kalemler];
        (updated[idx] as any)[field] = value;
        // Otomatik stok adı oluştur
        if (field === 'saksiBoyutu' && !updated[idx].yeniStokAdi) {
            updated[idx].yeniStokAdi = `${selectedStock.name} ${value}`;
        }
        setKalemler(updated);
    };

    const handleSubmit = async () => {
        if (toplamCikis <= 0) return alert('En az bir kalem giriniz.');
        if (toplamCikis > mevcutStok) return alert(`Toplam çıkış (${toplamCikis}) mevcut stoktan (${mevcutStok}) fazla olamaz.`);

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/netsis/stocks/stock-migration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eskiStokKodu: selectedStock.sku || selectedStock.id,
                    fireMiktar,
                    fireAciklama,
                    kalemler: kalemler.filter(k => k.miktar > 0).map(k => ({
                        saksiBoyutu: k.saksiBoyutu,
                        miktar: k.miktar,
                        birimMaliyet: k.birimMaliyet,
                        yeniStokKodu: k.yeniStokKodu || undefined,
                        yeniStokAdi: k.yeniStokAdi || undefined,
                        lokasyonAdi: k.lokasyonAdi || undefined,
                        kod1: k.saksiBoyutu,
                    })),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
                setStep(3);
                onComplete();
            } else {
                alert(`Hata: ${data.message || JSON.stringify(data)}`);
            }
        } catch (err: any) {
            alert(`Bağlantı hatası: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetAndClose = () => {
        setStep(1);
        setFireMiktar(0);
        setFireAciklama('');
        setKalemler([{ saksiBoyutu: '5L', miktar: 0, birimMaliyet: 0, yeniStokKodu: '', yeniStokAdi: '', lokasyonAdi: '' }]);
        setResult(null);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <PremiumModal
            isOpen={isOpen}
            onClose={resetAndClose}
            title="🔄 Stok Dönüşüm (Sayım Geçiş)"
            subtitle={`${selectedStock.name} → Saksı boyutuna göre yeni stok kartlarına ayır`}
        >
            <div className="flex flex-col gap-6">
                {/* Step Indicators */}
                <div className="flex gap-4">
                    {['Sayım & Fire', 'Saksı Dağılımı', 'Sonuç'].map((label, i) => (
                        <div key={i} className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition ${step === i + 1 ? 'bg-orange-500 text-white' : step > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            <span>{step > i + 1 ? '✓' : i + 1}</span>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* Step 1: Sayım & Fire */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                                <p className="text-base text-blue-800 font-medium">
                                    <strong>Mevcut Stok:</strong> <span className="font-mono text-2xl font-black">{mevcutStok.toLocaleString()}</span> Adet
                                    <br />
                                    <span className="text-sm text-blue-600">Netsis&apos;te <code className="bg-blue-100 px-1.5 py-0.5 rounded font-bold">{selectedStock.sku}</code> stoğunun güncel bakiyesi</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">🔥 Fire (Ölen/Kayıp Bitki) Miktarı</label>
                                    <input type="number" min={0} max={mevcutStok} value={fireMiktar || ''} onChange={e => setFireMiktar(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition text-base font-mono" placeholder="0" />
                                </div>
                                {fireMiktar > 0 && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Fire Açıklaması</label>
                                        <input type="text" value={fireAciklama} onChange={e => setFireAciklama(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition text-base" placeholder="Sayımda tespit edilen kayıp" />
                                    </div>
                                )}
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-base text-amber-800">
                                <strong className="block mb-2">ℹ️ Bu işlem ne yapacak?</strong>
                                <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
                                    <li>Eski stoktan ({selectedStock.sku}) Netsis&apos;te sarf çıkışı yapılacak</li>
                                    <li>Fire varsa ayrıca loglanacak</li>
                                    <li>Her saksı boyutu için yeni stok kartı açılıp Netsis&apos;e devir girişi yapılacak</li>
                                    <li>Her yeni stoka otomatik parti numarası (DVR-YYMM-SIRA) atanacak</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Saksı Dağılımı */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="text-base font-black text-slate-700">Sahadaki gerçek dağılımı giriniz:</h4>
                                <button onClick={addKalem} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition shadow-sm">+ Saksı Boyutu Ekle</button>
                            </div>

                            {kalemler.map((kalem, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm hover:border-slate-300 transition-colors">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Kalem #{idx + 1}</span>
                                        {kalemler.length > 1 && (
                                            <button onClick={() => removeKalem(idx)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-bold transition">Sil ✕</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saksı Boyutu</label>
                                            <select value={kalem.saksiBoyutu} onChange={e => updateKalem(idx, 'saksiBoyutu', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-orange-300 bg-slate-50">
                                                {SAKSI_BOYUTLARI.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Miktar (Adet)</label>
                                            <input type="number" min={0} value={kalem.miktar || ''} onChange={e => updateKalem(idx, 'miktar', Number(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-300" placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Birim Maliyet (₺)</label>
                                            <input type="number" min={0} step="0.01" value={kalem.birimMaliyet || ''} onChange={e => updateKalem(idx, 'birimMaliyet', Number(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-orange-300" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Y. Stok Kodu (Opsiyonel)</label>
                                            <input type="text" value={kalem.yeniStokKodu} onChange={e => updateKalem(idx, 'yeniStokKodu', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-orange-300" placeholder={`${selectedStock.sku}-${kalem.saksiBoyutu.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Y. Stok Adı (Opsiyonel)</label>
                                            <input type="text" value={kalem.yeniStokAdi} onChange={e => updateKalem(idx, 'yeniStokAdi', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-300" placeholder={`${selectedStock.name} ${kalem.saksiBoyutu}`} />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Özet */}
                            <div className={`rounded-2xl p-6 border-2 mt-8 ${fark === 0 ? 'bg-emerald-50 border-emerald-200' : fark < 0 ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200/50">
                                    <div className="py-2">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Mevcut Stok</p>
                                        <p className="text-3xl font-black text-slate-800 font-mono">{mevcutStok.toLocaleString()}</p>
                                    </div>
                                    <div className="py-2">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Toplam Çıkış</p>
                                        <p className="text-3xl font-black text-orange-600 font-mono">{toplamCikis.toLocaleString()}</p>
                                        <p className="text-sm font-bold text-slate-400 mt-1">{toplamYeni} yeni + {fireMiktar} fire</p>
                                    </div>
                                    <div className="py-2">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Fark</p>
                                        <p className={`text-3xl font-black font-mono ${fark === 0 ? 'text-emerald-600' : fark < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                            {fark === 0 ? '✓ Dengede' : fark > 0 ? `+${fark} kaldı` : `${fark} eksik!`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Sonuç */}
                    {step === 3 && result && (
                        <div className="space-y-6">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm">
                                <div className="text-6xl mb-4">✅</div>
                                <h4 className="text-2xl font-black text-emerald-700 mb-2">Stok Dönüşüm Tamamlandı!</h4>
                                <p className="text-sm text-emerald-600 font-medium">Fiş No: <code className="bg-emerald-100 px-2 py-1 rounded font-mono font-bold">{result.fisNo}</code></p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b-2 border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Stok Kodu</th>
                                            <th className="px-6 py-4">Saksı</th>
                                            <th className="px-6 py-4 text-center">Miktar</th>
                                            <th className="px-6 py-4">Parti No</th>
                                            <th className="px-6 py-4 text-center">Yeni Kart</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.kalemler?.map((k: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-700 text-sm">{k.stokKodu}</td>
                                                <td className="px-6 py-4 text-slate-600 font-bold text-sm">{k.saksiBoyutu}</td>
                                                <td className="px-6 py-4 text-center font-black text-emerald-700 text-lg">{k.miktar}</td>
                                                <td className="px-6 py-4 font-mono text-sm text-slate-500">{k.partiNo}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {k.stokKartiOlusturuldu ? <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">✓ Oluşturuldu</span> : <span className="text-slate-400 text-xs font-bold">Mevcut</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {result.fireMiktar > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-base font-medium text-rose-700 shadow-sm flex items-center gap-3">
                                    <span className="text-2xl">🔥</span> 
                                    <span><strong>{result.fireMiktar}</strong> adet fire olarak kaydedildi.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 -mx-6 lg:-mx-8 -mb-6 lg:-mb-8 mt-6 lg:mt-8 p-6 lg:p-8 border-t border-slate-100 flex justify-between items-center">
                    {step < 3 ? (
                        <>
                            <button onClick={step === 1 ? resetAndClose : () => setStep(step - 1)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition shadow-sm active:scale-95">
                                {step === 1 ? 'İptal' : '← Geri'}
                            </button>
                            <button
                                onClick={step === 1 ? () => setStep(2) : handleSubmit}
                                disabled={isSubmitting || (step === 2 && (toplamCikis <= 0 || toplamCikis > mevcutStok))}
                                className="px-8 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 active:scale-95"
                            >
                                {isSubmitting ? <><span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> İşleniyor...</> : step === 1 ? 'Devam →' : '🚀 Dönüşümü Başlat'}
                            </button>
                        </>
                    ) : (
                        <button onClick={resetAndClose} className="ml-auto px-8 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition shadow-lg active:scale-95">Kapat & Bitir</button>
                    )}
                </div>
            </div>
        </PremiumModal>
    );
}
