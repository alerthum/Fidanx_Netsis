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

export function ModalWrapper({ isOpen, onClose, title, subtitle, children, icon = '📝', large = false }: any) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    if (large) {
        return createPortal(
            <div className="fx-modal-backdrop">
                <div className="fx-modal-large">
                    <div className="fx-modal-header">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-3xl shadow-xl">
                                {icon}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h3>
                                {subtitle && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{subtitle}</p>}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all text-3xl"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="fx-modal-body bg-slate-50/30">
                        {children}
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[6px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999] animate-fade-in touch-none sm:touch-auto">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] w-full sm:max-w-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden transform transition-all relative border border-white/20">
                {/* Header */}
                <div className="px-8 py-7 border-b border-slate-100 flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm border border-emerald-100 flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">{title}</h3>
                        {subtitle && <p className="text-[10px] font-black text-slate-400 mt-1.5 uppercase tracking-widest">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 -mr-3 -mt-3 rounded-2xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Şaşırtma Modalı ──
export function TransplantModal({ isOpen, onClose, batch, stages, locations, onSave, recipes = [] }: any) {
    const [form, setForm] = React.useState({
        hedefSafha: '',
        hedefKonum: '',
        sasirtilanMiktar: 0,
        ekMaliyetTutar: 0,
        kullanilanMalzeme: '',
        recipeId: '',
        hedefNetsisStokKodu: ''
    });

    const selectedRecipe = recipes.find((r: any) => r.id === form.recipeId);
    const recipeCost = selectedRecipe?.totalCost || 0;

    React.useEffect(() => {
        if (batch) {
            setForm(prev => ({
                ...prev,
                sasirtilanMiktar: batch.mevcutMiktar,
                hedefKonum: batch.konum || ''
            }));
        }
    }, [batch]);

    if (!batch) return null;

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Şaşırtma (Safha Geçiş)"
            subtitle={`Parti: ${batch.partiNo} • Mevcut: ${batch.mevcutMiktar} ad (${batch.safha})`}
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
                <div className="col-span-2">
                    <Label>Hedef Netsis stok kodu (opsiyonel)</Label>
                    <Input
                        placeholder="Örn: leylendi 2L — Netsis'te açılmış kart; boşsa mevcut stok kodu ile devam"
                        value={form.hedefNetsisStokKodu}
                        onChange={e => setForm({ ...form, hedefNetsisStokKodu: e.target.value })}
                        className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Farklı kod girerseniz Netsis’te kaynak stoktan düşer, hedef stoğa üretim girişi yazılır (aynı adet).
                    </p>
                </div>
                {recipes.length > 0 && (
                    <div className="col-span-2">
                        <Label>Reçete Seçin (Opsiyonel)</Label>
                        <Select value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e.target.value })}>
                            <option value="">Reçetesiz devam et...</option>
                            {recipes.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                    {r.name} {r.totalCost > 0 ? `(₺${r.totalCost.toLocaleString('tr-TR')})` : ''}
                                </option>
                            ))}
                        </Select>
                        {selectedRecipe && (
                            <div className="mt-2 p-3 bg-indigo-50 rounded-xl text-xs space-y-1">
                                <div className="flex justify-between font-bold text-indigo-700">
                                    <span>Reçete Maliyeti:</span>
                                    <span>₺{recipeCost.toLocaleString('tr-TR')}</span>
                                </div>
                                {selectedRecipe.items?.map((i: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-indigo-500">
                                        <span>{i.materialName}</span>
                                        <span>{i.amount} {i.unit}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div>
                    <Label>Ek Malzeme (Manuel)</Label>
                    <Input placeholder="Örn: 5L Saksı + Torf" value={form.kullanilanMalzeme} onChange={e => setForm({ ...form, kullanilanMalzeme: e.target.value })} />
                </div>
                <div>
                    <Label>Ek Maliyet (₺) {recipeCost > 0 ? `+ Reçete ₺${recipeCost}` : ''}</Label>
                    <Input type="number" placeholder="0.00" value={form.ekMaliyetTutar || ''} onChange={e => setForm({ ...form, ekMaliyetTutar: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-600">Şaşırtılacak Adet</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Mak: {batch.mevcutMiktar}</span>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="range"
                            min="1"
                            max={batch.mevcutMiktar}
                            value={form.sasirtilanMiktar}
                            onChange={e => setForm({ ...form, sasirtilanMiktar: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <Input type="number" min="1" max={batch.mevcutMiktar} value={form.sasirtilanMiktar} onChange={e => setForm({ ...form, sasirtilanMiktar: Number(e.target.value) })} className="text-center text-xl font-black py-4 !border-emerald-200 !text-emerald-700 bg-emerald-50/50 focus:!bg-white" />
                    </div>
                </div>

                <div className="col-span-2 mt-4 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">İptal</button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!form.hedefSafha || form.sasirtilanMiktar <= 0 || form.sasirtilanMiktar > batch.mevcutMiktar}
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

    const kar = (form.birimFiyat - (batch.birimMaliyet || 0)) * form.satisAdet;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Satış & Çıkış" subtitle={batch.partiNo} icon="🏷️">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Satış Adedi</Label>
                    <Input type="number" min="1" max={batch.mevcutMiktar} value={form.satisAdet || ''} onChange={e => setForm({ ...form, satisAdet: Number(e.target.value) })} />
                </div>
                <div>
                    <Label>Birim Satış Fiyatı (₺)</Label>
                    <Input type="number" min="0" value={form.birimFiyat || ''} onChange={e => setForm({ ...form, birimFiyat: Number(e.target.value) })} />
                </div>

                <div className="col-span-2 my-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-blue-800">Parti Birim Maliyeti:</span>
                        <span className="font-mono text-slate-600">{Number(batch.birimMaliyet || 0).toFixed(2)} ₺</span>
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
                        disabled={form.satisAdet <= 0 || form.satisAdet > batch.mevcutMiktar}
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
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Fire Kaydı" subtitle={batch.partiNo} icon="💀">
            <div className="space-y-4">
                <div>
                    <Label>Ölüm / Fire Adedi (Maks: {batch.mevcutMiktar})</Label>
                    <Input type="number" min="1" max={batch.mevcutMiktar} value={form.fireMiktar || ''} onChange={e => setForm({ ...form, fireMiktar: Number(e.target.value) })} />
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
                        disabled={form.fireMiktar <= 0 || form.fireMiktar > batch.mevcutMiktar || !form.sebep}
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
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Maliyet & Şecere" subtitle={`${batch.partiNo} • ${batch.bitkiAdi}`} icon="💰" large>
            <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
                <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
                    <div className="fx-card bg-emerald-600 border-0 text-white p-6 shadow-emerald-900/20">
                        <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-4">Mevcut Durum</p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-bold opacity-60">Toplam Maliyet</p>
                                <p className="text-4xl font-black tracking-tighter">₺{Number(batch.toplamMaliyet || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="h-px bg-white/20 w-full"></div>
                            <div>
                                <p className="text-sm font-bold opacity-60">Birim Maliyet</p>
                                <p className="text-3xl font-black tracking-tighter">₺{Number(batch.birimMaliyet || 0).toLocaleString('tr-TR', { minimumFractionDigits: 3 })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="fx-card bg-slate-900 border-0 text-white p-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Parti Bilgileri</p>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="opacity-50">Safha:</span>
                                <span className="font-bold">{batch.safha}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-50">Stok:</span>
                                <span className="font-bold">{batch.mevcutMiktar} ADET</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="opacity-50">Konum:</span>
                                <span className="font-bold">{batch.konum}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">İşlem Kronolojisi / Hayat Hikayesi</h4>
                        <span className="text-xs font-bold text-slate-400">Toplam {batch.history?.length || 0} İşlem</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-12 pb-12">
                            {(batch.history || []).map((h: any, i: number) => {
                                const isSatis = h.islemTipi === 'SATIS';
                                const isFire = h.islemTipi === 'FIRE';
                                const isGiris = h.islemTipi === 'ALIS_GIRIS' || h.islemTipi === 'SASIRTMA_GIRIS';
                                const isMaliyetEkle = h.maliyetTutar > 0;

                                let dotColor = 'bg-slate-300 border-slate-100';
                                if (isSatis) dotColor = 'bg-blue-500 border-blue-100';
                                else if (isFire) dotColor = 'bg-red-500 border-red-100';
                                else if (isGiris) dotColor = 'bg-emerald-500 border-emerald-100';
                                else if (isMaliyetEkle) dotColor = 'bg-amber-400 border-amber-50';

                                return (
                                    <div key={i} className="relative pl-6">
                                        <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 shadow-sm z-10 ${dotColor}`}></div>

                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1">
                                                        {new Date(h.islemTarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="font-bold text-slate-800 text-sm leading-snug">{h.aciklama || h.islemTipi}</p>

                                                    {h.kullanilanMalzeme && (
                                                        <p className="text-xs font-medium text-slate-500 mt-2 bg-white px-2 py-1 rounded-lg border border-slate-100 inline-flex items-center gap-1.5">
                                                            <span className="text-[10px]">📦</span> {h.kullanilanMalzeme}
                                                            {h.kullanilanMiktar && <span className="font-mono bg-slate-100 px-1 rounded text-[10px] text-slate-600 ml-1">x{Number(h.kullanilanMiktar).toFixed(2)}</span>}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                                    {h.maliyetTutar > 0 && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-100">
                                                            +{Number(h.maliyetTutar).toFixed(2)} ₺
                                                        </span>
                                                    )}
                                                    {h.birimMaliyetEtkisi > 0 && (
                                                        <span className="text-[10px] font-bold text-slate-400 block px-1">
                                                            Birim: +{Number(h.birimMaliyetEtkisi).toFixed(3)} ₺
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
                </div>
            </div>
        </ModalWrapper>
    );
}
