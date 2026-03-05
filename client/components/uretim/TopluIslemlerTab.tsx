"use client";
import React, { useState } from 'react';
import { Label, Input, Select } from './Modals';

export default function TopluIslemlerTab({ batches, locations, API_URL, tenantId, onRefresh }: any) {
    const [form, setForm] = useState({
        islemTipi: '',
        konum: '',
        maliyetTutar: 0,
        kullanilanMalzeme: '',
        kullanilanMiktar: 0,
        aciklama: ''
    });

    const [isLoading, setIsLoading] = useState(false);

    // Seçilen konumdaki aktif partileri listele
    const etkilenenPartiler = batches.filter((b: any) => b.Konum === form.konum && Number(b.MevcutMiktar) > 0);
    const toplamMiktar = etkilenenPartiler.reduce((sum: number, b: any) => sum + Number(b.MevcutMiktar), 0);
    const birimBasinaDusmeDahil = form.maliyetTutar > 0 && toplamMiktar > 0 ? (form.maliyetTutar / toplamMiktar).toFixed(3) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.konum || !form.islemTipi || etkilenenPartiler.length === 0) {
            alert('Lütfen geçerli bir konum seçin. Bu konumda aktif ürün bulunmuyor.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/production/islem?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setForm({ islemTipi: '', konum: '', maliyetTutar: 0, kullanilanMalzeme: '', kullanilanMiktar: 0, aciklama: '' });
                onRefresh();
            } else {
                alert('İşlem kaydedilirken hata oluştu.');
            }
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 lg:p-8 animate-fade-in flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <div className="w-full lg:w-1/3 bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-[160px]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
                        💧
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-xl tracking-tight">Kümülatif Gider/Operasyonlar</h3>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">Toplu İlaçlama, Gübreleme, Sulama vb.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <Label>Uygulama Konumu</Label>
                        <Select value={form.konum} onChange={e => setForm({ ...form, konum: e.target.value })} required>
                            <option value="">Seçiniz</option>
                            {locations.map((l: any) => <option key={l} value={l}>{l}</option>)}
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label>İşlem / Gider Tipi</Label>
                        <Select value={form.islemTipi} onChange={e => setForm({ ...form, islemTipi: e.target.value })} required>
                            <option value="">Seçiniz</option>
                            <option value="ILACLAMA">İlaçlama</option>
                            <option value="GUBRELEME">Gübreleme</option>
                            <option value="SULAMA">Sulama (İşçilik/Gider)</option>
                            <option value="BUDAMA">Budama (İşçilik/Gider)</option>
                            <option value="DIGER">Diğer / Genel Gider</option>
                        </Select>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Kullanılan Madde (Ops.)</Label>
                                <Input placeholder="Örn: 20-20-20 NPK" value={form.kullanilanMalzeme} onChange={e => setForm({ ...form, kullanilanMalzeme: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Toplam Tüketim Miktarı</Label>
                                <Input type="number" placeholder="Örn: 5 (kg/lt)" value={form.kullanilanMiktar || ''} onChange={e => setForm({ ...form, kullanilanMiktar: Number(e.target.value) })} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Toplam Fatura Tutarı (₺) Gider</Label>
                            <div className="relative group">
                                <Input type="number" required placeholder="0.00" value={form.maliyetTutar || ''} onChange={e => setForm({ ...form, maliyetTutar: Number(e.target.value) })} className="pl-14 !text-xl !font-black !text-emerald-700 !bg-emerald-50 !border-emerald-200 group-hover:!border-emerald-400" />
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₺</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Ek Açıklamalar</Label>
                            <Input placeholder="Notlar..." value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading || etkilenenPartiler.length === 0}
                            className="w-full py-5 rounded-[1.25rem] bg-slate-900 text-white font-black text-lg hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 relative overflow-hidden group"
                        >
                            <span className="relative z-10">{isLoading ? 'Uygulanıyor...' : 'İşlemi ve Maliyeti Dağıt'}</span>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                </form>
            </div>

            {/* Önizleme Paneli */}
            <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
                <div className={`p-6 rounded-3xl border ${form.konum && etkilenenPartiler.length > 0 ? 'bg-blue-50 border-blue-200 border-dashed' : 'bg-slate-50 border-slate-200 border-dashed'} transition-colors`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${form.konum ? 'bg-white text-blue-500' : 'bg-slate-200 text-slate-400'}`}>
                            {form.konum ? '📍' : '❓'}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Maliyet Dağılım Önizlemesi</p>
                            <p className="font-bold text-slate-800 text-sm">{form.konum ? `Seçilen alan: ${form.konum}` : 'Lütfen işlem yapılacak alanı seçiniz'}</p>
                        </div>
                    </div>

                    {form.konum && etkilenenPartiler.length > 0 && (
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Etkilenen Parti Sayısı</p>
                                <p className="text-2xl font-black text-slate-800 mt-1">{etkilenenPartiler.length}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Toplam Bitki Adedi</p>
                                <p className="text-2xl font-black text-slate-800 mt-1">{toplamMiktar}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -m-6 w-16 h-16 bg-emerald-50 rounded-full blur-xl"></div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Bitki Başına Düşen (+Maliyet)</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1 relative z-10">₺{birimBasinaDusmeDahil}</p>
                            </div>
                        </div>
                    )}
                </div>

                {form.konum && etkilenenPartiler.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                        <p className="text-sm font-black text-slate-800 mb-4 px-2">Bu İşlemden Etkilenecek Ürünler ({form.konum})</p>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {etkilenenPartiler.map((b: any) => {
                                const eklenecekMaliyetTutar = (Number(b.MevcutMiktar) / toplamMiktar) * form.maliyetTutar;

                                return (
                                    <div key={b.Id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono font-bold text-slate-800 text-sm">{b.PartiNo}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-500 shadow-sm border border-slate-100">{b.Safha}</span>
                                            </div>
                                            <p className="font-bold text-emerald-700 truncate">{b.BitkiAdi}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className="text-xs font-bold text-slate-600 px-2.5 py-1 bg-white border border-slate-200 rounded-lg">{b.MevcutMiktar} Adet</span>
                                                {form.maliyetTutar > 0 && (
                                                    <span className="text-[10px] font-medium text-emerald-600">Partiye Yansıyan Gider Payı: <b className="text-xs">+{eklenecekMaliyetTutar.toFixed(2)}₺</b></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
