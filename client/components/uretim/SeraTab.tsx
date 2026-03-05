"use client";
import React, { useState, useEffect } from 'react';
import { ModalWrapper, Label, Input, Select } from './Modals';

export default function SeraTab({ tenantId, API_URL, locations }: any) {
    const [logs, setLogs] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        konum: '',
        date: new Date().toISOString().split('T')[0],
        icSabah: '', icOgle: '', icAksam: '',
        disSabah: '', disOgle: '', disAksam: '',
        mazot: '',
        note: ''
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/production/sicaklik?tenantId=${tenantId}`);
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (err) { console.error("Sıcaklık verisi çekilemedi", err); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const periods = [
                { id: 'SABAH', ic: form.icSabah, dis: form.disSabah },
                { id: 'OGLE', ic: form.icOgle, dis: form.disOgle },
                { id: 'AKSAM', ic: form.icAksam, dis: form.disAksam }
            ];

            let savedAny = false;
            for (const p of periods) {
                if (p.ic !== '' || p.dis !== '' || form.mazot !== '' || form.note !== '') {
                    await fetch(`${API_URL}/production/sicaklik?tenantId=${tenantId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            konum: form.konum,
                            date: form.date,
                            periyot: p.id,
                            icSicaklik: p.ic || null,
                            disSicaklik: p.dis || null,
                            nem: null,
                            mazot: form.mazot || null,
                            note: form.note || null
                        })
                    });
                    savedAny = true;
                }
            }

            if (savedAny) {
                setForm({
                    konum: '',
                    date: new Date().toISOString().split('T')[0],
                    icSabah: '', icOgle: '', icAksam: '',
                    disSabah: '', disOgle: '', disAksam: '',
                    mazot: '', note: ''
                });
                setIsModalOpen(false);
                fetchLogs();
            }
        } catch (err) { alert('Hata oluştu'); }
        setIsLoading(false);
    };

    const handleDeleteMultiple = async (ids: string[]) => {
        if (!confirm('Bu tarihteki tüm kayıtları silmek istediğinize emin misiniz?')) return;
        try {
            for (const id of ids) {
                await fetch(`${API_URL}/production/sicaklik/${id}?tenantId=${tenantId}`, { method: 'DELETE' });
            }
            fetchLogs();
        } catch (err) { alert('Hata'); }
    };

    // Group logs by Date
    const groupedData: Record<string, any> = {};
    const allKonumsSet = new Set<string>();

    logs.forEach(log => {
        const dStr = new Date(log.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Remove "Eski Kayıt" label if it's there
        let kName = log.konum === 'Eski Kayıt' ? 'Varsayılan' : log.konum;
        allKonumsSet.add(kName);

        if (!groupedData[dStr]) {
            groupedData[dStr] = {
                dateStr: dStr,
                rawDate: new Date(log.date),
                konums: {},
                mazots: [],
                notes: [],
                rawIds: []
            };
        }

        if (!groupedData[dStr].konums[kName]) {
            groupedData[dStr].konums[kName] = {
                ic: { SABAH: '-', OGLE: '-', AKSAM: '-' },
                dis: { SABAH: '-', OGLE: '-', AKSAM: '-' }
            };
        }

        if (log.icSicaklik != null) groupedData[dStr].konums[kName].ic[log.periyot] = log.icSicaklik;
        if (log.disSicaklik != null) groupedData[dStr].konums[kName].dis[log.periyot] = log.disSicaklik;

        if (log.mazot && !groupedData[dStr].mazots.includes(log.mazot)) groupedData[dStr].mazots.push(log.mazot);
        if (log.note && !groupedData[dStr].notes.includes(log.note)) groupedData[dStr].notes.push(log.note);
        groupedData[dStr].rawIds.push(log.id);
    });

    const konumsList = Array.from(allKonumsSet).sort();
    const sortedDates = Object.values(groupedData).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return (
        <div className="p-4 lg:p-8 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sera & İklim Takibi</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Sıcaklık ölçümleri ve yakıt tüketim kayıtları.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all text-sm w-full sm:w-auto"
                >
                    + Yeni Kayıt Ekle
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white border text-sm font-medium border-slate-200 shadow-sm rounded-3xl overflow-hidden overflow-x-auto relative">
                <table className="w-full text-center">
                    <thead className="bg-[#f8fafcc0] border-b border-slate-200">
                        <tr>
                            <th className="py-5 px-6 font-black text-slate-500 text-[10px] uppercase tracking-widest text-left whitespace-nowrap sticky left-0 bg-[#f8fafcc0] backdrop-blur-md z-10 w-32 border-r border-slate-100/50">Tarih</th>

                            {konumsList.map(k => (
                                <th key={k} className="py-4 px-6 border-x border-slate-100/50 min-w-[200px]">
                                    <span className="block font-black text-slate-800 text-[11px] uppercase tracking-widest mb-1">{k.toUpperCase()} (İÇ & DIŞ)</span>
                                    <span className="block text-slate-400 text-[9px] font-bold tracking-widest uppercase">SABAH / ÖĞLE / AKŞAM</span>
                                </th>
                            ))}

                            <th className="py-5 px-6 font-black text-slate-500 text-[10px] uppercase tracking-widest whitespace-nowrap min-w-[120px] border-l border-slate-100/50">Mazot (Lt)</th>
                            <th className="py-5 px-6 font-black text-slate-500 text-[10px] uppercase tracking-widest text-left min-w-[200px] border-l border-slate-100/50">Not</th>
                            <th className="py-5 px-6 font-black text-slate-500 text-[10px] uppercase tracking-widest text-right whitespace-nowrap border-l border-slate-100/50">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedDates.map((row: any) => (
                            <tr key={row.dateStr} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="py-5 px-6 text-left font-black text-slate-700 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-100/50">
                                    {row.dateStr}
                                </td>

                                {konumsList.map(k => {
                                    const data = row.konums[k];
                                    if (!data) return <td key={k} className="py-5 px-6 text-slate-300 border-x border-slate-100/50">- / - / -</td>;

                                    <td key={k} className="py-5 px-6 border-x border-slate-100/50 whitespace-nowrap text-center">
                                        <div className="font-bold text-[13px] tracking-wide text-slate-400 mb-2.5">
                                            <span className="text-[9px] uppercase font-black mr-3 text-slate-300 tracking-widest">İÇ</span>
                                            <span className={data.ic.SABAH !== '-' ? 'text-slate-600' : ''}>{data.ic.SABAH}</span>
                                            <span className="mx-2 text-slate-200 font-light">/</span>
                                            <span className={data.ic.OGLE !== '-' ? 'text-orange-500' : ''}>{data.ic.OGLE}</span>
                                            <span className="mx-2 text-slate-200 font-light">/</span>
                                            <span className={data.ic.AKSAM !== '-' ? 'text-slate-600' : ''}>{data.ic.AKSAM}</span>
                                        </div>
                                        <div className="font-bold text-[13px] tracking-wide text-slate-400">
                                            <span className="text-[9px] uppercase font-black mr-3 text-slate-300 tracking-widest">DIŞ</span>
                                            <span className={data.dis.SABAH !== '-' ? 'text-slate-600' : ''}>{data.dis.SABAH}</span>
                                            <span className="mx-2 text-slate-200 font-light">/</span>
                                            <span className={data.dis.OGLE !== '-' ? 'text-blue-500' : ''}>{data.dis.OGLE}</span>
                                            <span className="mx-2 text-slate-200 font-light">/</span>
                                            <span className={data.dis.AKSAM !== '-' ? 'text-slate-600' : ''}>{data.dis.AKSAM}</span>
                                        </div>
                                    </td>
                                })}

                                <td className="py-5 px-6 font-bold text-slate-700 whitespace-nowrap border-l border-slate-100/50">
                                    {row.mazots.length > 0 ? row.mazots.join(', ') : '-'}
                                </td>
                                <td className="py-5 px-6 text-left text-xs text-slate-500 max-w-xs truncate border-l border-slate-100/50">
                                    {row.notes.length > 0 ? row.notes.join(' | ') : '-'}
                                </td>
                                <td className="py-5 px-6 text-right whitespace-nowrap border-l border-slate-100/50">
                                    <div className="flex justify-end gap-3 text-xs font-black uppercase tracking-wider">
                                        <button className="text-emerald-500 hover:text-emerald-700 transition-colors">Düzenle</button>
                                        <button onClick={() => handleDeleteMultiple(row.rawIds)} className="text-red-500 hover:text-red-700 transition-colors">SİL</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedDates.length === 0 && (
                            <tr>
                                <td colSpan={konumsList.length + 4} className="py-16 text-center text-slate-400 font-medium h-64">
                                    <span className="text-4xl mb-3 block opacity-50">🌡️</span>
                                    Görüntülenecek kayıt bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Yeni Ekle Modalı */}
            <ModalWrapper isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Ölçüm / Sarfiyat Ekle" icon="🌡️">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarih</label>
                            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Konum</label>
                            <Select value={form.konum} onChange={e => setForm({ ...form, konum: e.target.value })} required>
                                <option value="">Sera / Bölüm Seçiniz...</option>
                                {locations.map((l: any) => <option key={l} value={l}>{l}</option>)}
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* İç Sıcaklık Card */}
                        <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
                            <h4 className="text-orange-800 font-bold text-sm mb-4 flex items-center gap-2">
                                🌡️ İç Sıcaklık (°C)
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Sabah</label>
                                    <input type="number" step="0.1" value={form.icSabah} onChange={e => setForm({ ...form, icSabah: e.target.value })} className="w-full text-center py-2 rounded-xl border border-orange-200 text-slate-700 outline-none focus:border-orange-400" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Öğle</label>
                                    <input type="number" step="0.1" value={form.icOgle} onChange={e => setForm({ ...form, icOgle: e.target.value })} className="w-full text-center py-2 rounded-xl border border-orange-200 text-slate-700 outline-none focus:border-orange-400" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Akşam</label>
                                    <input type="number" step="0.1" value={form.icAksam} onChange={e => setForm({ ...form, icAksam: e.target.value })} className="w-full text-center py-2 rounded-xl border border-orange-200 text-slate-700 outline-none focus:border-orange-400" placeholder="-" />
                                </div>
                            </div>
                        </div>

                        {/* Dış Sıcaklık Card */}
                        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                            <h4 className="text-blue-800 font-bold text-sm mb-4 flex items-center gap-2">
                                ☁ Dış Sıcaklık (°C)
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Sabah</label>
                                    <input type="number" step="0.1" value={form.disSabah} onChange={e => setForm({ ...form, disSabah: e.target.value })} className="w-full text-center py-2 rounded-xl border border-blue-200 text-slate-700 outline-none focus:border-blue-400" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Öğle</label>
                                    <input type="number" step="0.1" value={form.disOgle} onChange={e => setForm({ ...form, disOgle: e.target.value })} className="w-full text-center py-2 rounded-xl border border-blue-200 text-slate-700 outline-none focus:border-blue-400" placeholder="-" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Akşam</label>
                                    <input type="number" step="0.1" value={form.disAksam} onChange={e => setForm({ ...form, disAksam: e.target.value })} className="w-full text-center py-2 rounded-xl border border-blue-200 text-slate-700 outline-none focus:border-blue-400" placeholder="-" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MAZOT TÜKETİMİ (LİTRE)</label>
                        <Input type="number" step="0.1" value={form.mazot} onChange={e => setForm({ ...form, mazot: e.target.value })} placeholder="0.0" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NOT / AÇIKLAMA</label>
                        <textarea
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                            placeholder="Varsa notlarınız..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black transition-colors hover:bg-slate-200">
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !form.konum}
                            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </ModalWrapper>

        </div>
    )
}
