"use client";
import React from 'react';

// Ortak Kullanılan Input Bileşenleri
export const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 select-none">
        {children}
    </label>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all font-medium text-slate-800 ${props.className || ''}`}
    />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
        {...props}
        className={`w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all font-medium text-slate-800 appearance-none cursor-pointer ${props.className || ''}`}
    >
        {props.children}
    </select>
);

import { createPortal } from 'react-dom';

export function ModalWrapper({ isOpen, onClose, title, subtitle, children, icon = '📝' }: any) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999] animate-fade-in touch-none sm:touch-auto">
            <div className="bg-white rounded-t-[2rem] sm:rounded-3xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden transform transition-transform duration-300 translate-y-0 relative border border-white/20">
                {/* Header */}
                <div className="px-6 py-5 sm:p-8 sm:pb-6 border-b border-slate-100 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm border border-emerald-100 flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{title}</h3>
                        {subtitle && <p className="text-xs font-bold text-slate-400 mt-1">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                    >
                        ✕
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Şaşırtma Modalı ──
export function TransplantModal({ isOpen, onClose, batch, stages, locations, onSave }: any) {
    const [form, setForm] = React.useState({
        hedefSafha: '',
        hedefKonum: '',
        sasirtilanMiktar: 0,
        ekMaliyetTutar: 0,
        kullanilanMalzeme: ''
    });

    React.useEffect(() => {
        if (batch) {
            setForm(prev => ({
                ...prev,
                sasirtilanMiktar: batch.MevcutMiktar,
                hedefKonum: batch.Konum || ''
            }));
        }
    }, [batch]);

    if (!batch) return null;

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Şaşırtma (Safha Geçiş)"
            subtitle={`Parti: ${batch.PartiNo} • Mevcut: ${batch.MevcutMiktar} ad (${batch.Safha})`}
            icon="🔄"
        >
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <Label>Hedef Safha</Label>
                    <Select value={form.hedefSafha} onChange={e => setForm({ ...form, hedefSafha: e.target.value })}>
                        <option value="">Seçiniz...</option>
                        {stages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                </div>
                <div className="col-span-2">
                    <Label>Hedef Konum</Label>
                    <Select value={form.hedefKonum} onChange={e => setForm({ ...form, hedefKonum: e.target.value })}>
                        <option value="">Seçiniz</option>
                        {locations.map((l: any) => <option key={l} value={l}>{l}</option>)}
                    </Select>
                </div>
                <div>
                    <Label>Kullanılan Malzeme (Bilgi)</Label>
                    <Input placeholder="Örn: 5L Saksı + Torf" value={form.kullanilanMalzeme} onChange={e => setForm({ ...form, kullanilanMalzeme: e.target.value })} />
                </div>
                <div>
                    <Label>Ek Maliyet Tutarı (₺)</Label>
                    <Input type="number" placeholder="0.00" value={form.ekMaliyetTutar || ''} onChange={e => setForm({ ...form, ekMaliyetTutar: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-600">Şaşırtılacak Adet</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Mak: {batch.MevcutMiktar}</span>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="range"
                            min="1"
                            max={batch.MevcutMiktar}
                            value={form.sasirtilanMiktar}
                            onChange={e => setForm({ ...form, sasirtilanMiktar: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <Input type="number" min="1" max={batch.MevcutMiktar} value={form.sasirtilanMiktar} onChange={e => setForm({ ...form, sasirtilanMiktar: Number(e.target.value) })} className="text-center text-xl font-black py-4 !border-emerald-200 !text-emerald-700 bg-emerald-50/50 focus:!bg-white" />
                    </div>
                </div>

                <div className="col-span-2 mt-4 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">İptal</button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!form.hedefSafha || form.sasirtilanMiktar <= 0 || form.sasirtilanMiktar > batch.MevcutMiktar}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Onayla & Böl
                    </button>
                </div>
            </div>
        </ModalWrapper>
    )
}

// ── Satış Modalı ──
export function SatisModal({ isOpen, onClose, batch, onSave }: any) {
    const [form, setForm] = React.useState({ satisAdet: 0, birimFiyat: 0 });

    React.useEffect(() => {
        if (batch) {
            setForm({ satisAdet: 1, birimFiyat: 0 });
        }
    }, [batch]);

    if (!batch) return null;

    const kar = (form.birimFiyat - (batch.BirimMaliyet || 0)) * form.satisAdet;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Satış & Çıkış" subtitle={batch.PartiNo} icon="🏷️">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Satış Adedi</Label>
                    <Input type="number" min="1" max={batch.MevcutMiktar} value={form.satisAdet || ''} onChange={e => setForm({ ...form, satisAdet: Number(e.target.value) })} />
                </div>
                <div>
                    <Label>Birim Satış Fiyatı (₺)</Label>
                    <Input type="number" min="0" value={form.birimFiyat || ''} onChange={e => setForm({ ...form, birimFiyat: Number(e.target.value) })} />
                </div>

                <div className="col-span-2 my-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-blue-800">Parti Birim Maliyeti:</span>
                        <span className="font-mono text-slate-600">{Number(batch.BirimMaliyet || 0).toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-blue-800">Toplam Satış Tutarı:</span>
                        <span className="font-mono font-bold text-slate-900">{(form.satisAdet * form.birimFiyat).toFixed(2)} ₺</span>
                    </div>
                    <div className="h-px bg-blue-200/50 w-full my-1"></div>
                    <div className="flex justify-between items-center text-base">
                        <span className="font-black text-blue-900">Tahmini Kâr:</span>
                        <span className={`font-mono font-black ${kar >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {kar > 0 ? '+' : ''}{kar.toFixed(2)} ₺
                        </span>
                    </div>
                </div>

                <div className="col-span-2 flex gap-3">
                    <button onClick={onClose} className="py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">İptal</button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={form.satisAdet <= 0 || form.satisAdet > batch.MevcutMiktar}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        Satış Kaydet
                    </button>
                </div>
            </div>
        </ModalWrapper>
    )
}

// ── Fire Modalı ──
export function FireModal({ isOpen, onClose, batch, onSave }: any) {
    const [form, setForm] = React.useState({ fireMiktar: 0, sebep: '' });

    if (!batch) return null;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Fire Kaydı" subtitle={batch.PartiNo} icon="💀">
            <div className="space-y-4">
                <div>
                    <Label>Ölüm / Fire Adedi (Maks: {batch.MevcutMiktar})</Label>
                    <Input type="number" min="1" max={batch.MevcutMiktar} value={form.fireMiktar || ''} onChange={e => setForm({ ...form, fireMiktar: Number(e.target.value) })} />
                </div>
                <div>
                    <Label>Sebep</Label>
                    <Select value={form.sebep} onChange={e => setForm({ ...form, sebep: e.target.value })}>
                        <option value="">Seçiniz</option>
                        <option value="Hastalık / Mantar">Hastalık / Mantar</option>
                        <option value="Kuruma / Susuzluk">Kuruma / Susuzluk</option>
                        <option value="Fiziksel Hasar">Fiziksel Hasar</option>
                        <option value="Mekanik / İş Kurulumu">Mekanik</option>
                        <option value="Diğer">Diğer</option>
                    </Select>
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-xs font-medium text-red-800 leading-relaxed shadow-inner">
                    <b>Bilgi:</b> Fire düşüldüğünde üretim partisinin toplam maliyeti değişmez, ancak içeride daha az bitki kaldığı için <b>Birim Maliyet artacaktır.</b>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">İptal</button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={form.fireMiktar <= 0 || form.fireMiktar > batch.MevcutMiktar || !form.sebep}
                        className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        Fire Düş
                    </button>
                </div>
            </div>
        </ModalWrapper>
    )
}

// ── Maliyet Geçmişi Modalı ──
export function CostHistoryModal({ isOpen, onClose, batch }: any) {
    if (!batch) return null;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Maliyet & Şecere" subtitle={`${batch.PartiNo} • ${batch.BitkiAdi}`} icon="💰">
            <div className="flex gap-4 mb-2">
                <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -m-4 w-16 h-16 bg-emerald-100 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest relative z-10 mb-1">Toplam Maliyet</p>
                    <p className="text-2xl font-black text-emerald-600 relative z-10">{Number(batch.ToplamMaliyet || 0).toFixed(2)} <span className="text-sm font-bold opacity-50">₺</span></p>
                </div>
                <div className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -m-4 w-16 h-16 bg-blue-100 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest relative z-10 mb-1">Birim Maliyet</p>
                    <p className="text-2xl font-black text-blue-600 relative z-10">{Number(batch.BirimMaliyet || 0).toFixed(2)} <span className="text-sm font-bold opacity-50">₺</span></p>
                </div>
            </div>

            <div className="mt-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 px-1">İşlem Kronolojisi</h4>

                <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 pb-4">
                    {(batch.history || []).map((h: any, i: number) => {
                        const isSatis = h.IslemTipi === 'SATIS';
                        const isFire = h.IslemTipi === 'FIRE';
                        const isGiris = h.IslemTipi === 'ALIS_GIRIS' || h.IslemTipi === 'SASIRTMA_GIRIS';
                        const isMaliyetEkle = h.MaliyetTutar > 0;

                        let dotColor = 'bg-slate-300 border-slate-100';
                        if (isSatis) dotColor = 'bg-blue-500 border-blue-100';
                        else if (isFire) dotColor = 'bg-red-500 border-red-100';
                        else if (isGiris) dotColor = 'bg-emerald-500 border-emerald-100';
                        else if (isMaliyetEkle) dotColor = 'bg-amber-400 border-amber-50';

                        return (
                            <div key={i} className="relative pl-6">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 shadow-sm z-10 ${dotColor}`}></div>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">
                                                {new Date(h.IslemTarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="font-bold text-slate-800 text-sm leading-snug">{h.Aciklama || h.IslemTipi}</p>

                                            {h.KullanilanMalzeme && (
                                                <p className="text-xs font-medium text-slate-500 mt-2 bg-white px-2 py-1 rounded-lg border border-slate-100 inline-flex items-center gap-1.5">
                                                    <span className="text-[10px]">📦</span> {h.KullanilanMalzeme}
                                                    {h.KullanilanMiktar && <span className="font-mono bg-slate-100 px-1 rounded text-[10px] text-slate-600 ml-1">x{Number(h.KullanilanMiktar).toFixed(2)}</span>}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                            {h.MaliyetTutar > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100">
                                                    +{Number(h.MaliyetTutar).toFixed(2)} ₺
                                                </span>
                                            )}
                                            {h.BirimMaliyetEtkisi > 0 && (
                                                <span className="text-[10px] font-bold text-slate-400 block px-1">
                                                    Birim: +{Number(h.BirimMaliyetEtkisi).toFixed(3)} ₺
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {(!batch.history || batch.history.length === 0) && (
                        <div className="pl-6 text-sm text-slate-400 font-medium py-4 italic">İşlem geçmişi bulunamadı.</div>
                    )}
                </div>
            </div>
        </ModalWrapper>
    )
}
