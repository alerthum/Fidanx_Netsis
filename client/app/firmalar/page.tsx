"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ExportButton from '@/components/ExportButton';

export default function FirmalarPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [newCompany, setNewCompany] = useState({
        name: '',
        taxNumber: '',
        type: '320',
        address: '',
        city: 'Yalova',
        country: 'Türkiye',
        contactPerson: '',
        email: '',
        phone: ''
    });

    const [filterType, setFilterType] = useState<'ALL' | '120' | '320'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [onlyWithBalance, setOnlyWithBalance] = useState(false);

    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [selectedCariKod, setSelectedCariKod] = useState('');
    const [selectedCariName, setSelectedCariName] = useState('');
    const [invoiceDetails, setInvoiceDetails] = useState<any[] | null>(null);
    const [invoiceDetailBelgeNo, setInvoiceDetailBelgeNo] = useState('');

    const API_URL = '/api';

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/netsis/customers`);
            if (!res.ok) throw new Error('Cari verileri alınamadı');
            const data = await res.json();

            const mappedData = Array.isArray(data) ? data.map((c: any) => ({
                id: c.CariKodu,
                name: c.CariAdi,
                taxNumber: c.CariKodu,
                address: c.CariAdres,
                city: c.CariIl,
                country: c.Ulke,
                email: c.Email,
                phone: c.Telefon,
                balance: c.BakiyeTl
            })) : [];

            setCompanies(mappedData);
        } catch (err) {
            console.error('Firmalar yüklenemedi:', err);
            setCompanies([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMovements = async (cariKod: string, name: string) => {
        setIsLoading(true);
        setSelectedCariKod(cariKod);
        setSelectedCariName(name);
        setInvoiceDetails(null);
        try {
            const res = await fetch(`${API_URL}/netsis/customers/transactions?cariKod=${encodeURIComponent(cariKod)}`);
            const data = await res.json();
            setMovements(Array.isArray(data) ? data : []);
            setIsMovementsModalOpen(true);
        } catch (err) {
            alert('Hareketler yüklenemedi.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInvoiceDetails = async (belgeNo: string) => {
        if (!selectedCariKod || !belgeNo) return;
        setInvoiceDetailBelgeNo(belgeNo);
        try {
            const res = await fetch(`${API_URL}/netsis/invoices/${encodeURIComponent(belgeNo)}/details?cariKodu=${encodeURIComponent(selectedCariKod)}`);
            const data = await res.ok ? await res.json() : [];
            setInvoiceDetails(Array.isArray(data) ? data : []);
        } catch (err) {
            setInvoiceDetails([]);
        }
    };

    const generateNextCode = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/customers/next-code?prefix=${newCompany.type}`);
            const code = await res.text();
            setNewCompany({ ...newCompany, taxNumber: code });
        } catch (err) {
            alert('Kod üretilemedi.');
        }
    };

    const handleAddCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editMode ? `${API_URL}/tenants/${editingId}` : `${API_URL}/tenants`;
            const method = editMode ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCompany),
            });

            if (res.ok) {
                closeModal();
                fetchCompanies();
            }
        } catch (err) {
            alert('Sunucuya bağlanılamadı.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/tenants/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCompanies();
        } catch (err) {
            alert('Silme işlemi başarısız.');
        }
    };

    const openEditModal = (company: any) => {
        setNewCompany({
            name: company.name || '',
            taxNumber: company.taxNumber || '',
            type: company.id?.startsWith('120') ? '120' : '320',
            address: company.address || '',
            city: company.city || 'Yalova',
            country: company.country || 'Türkiye',
            contactPerson: company.contactPerson || '',
            email: company.email || '',
            phone: company.phone || ''
        });
        setEditingId(company.id);
        setEditMode(true);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditMode(false);
        setEditingId(null);
        setNewCompany({
            name: '',
            taxNumber: '',
            type: '320',
            address: '',
            city: 'Yalova',
            country: 'Türkiye',
            contactPerson: '',
            email: '',
            phone: ''
        });
    };

    const filteredCompanies = companies.filter(c => {
        const matchesType = filterType === 'ALL' || (filterType === '120' ? c.id?.startsWith('120') : c.id?.startsWith('320'));
        const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.taxNumber?.includes(searchQuery);
        const matchesBalance = !onlyWithBalance || Math.abs(Number(c.balance)) > 1;
        return matchesType && matchesSearch && matchesBalance;
    });

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-30 gap-4">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">Firma Yönetimi</h1>
                        <p className="text-xs lg:text-sm text-slate-500">Müşteri ve tedarikçi profillerini yönetin.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <ExportButton title="Firmalar" tableId="companies-table" />
                        <button
                            onClick={() => { closeModal(); setIsModalOpen(true); }}
                            className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-md transition active:scale-95"
                        >
                            + Yeni Firma
                        </button>
                    </div>
                </header>

                <div className="px-4 md:px-8 mt-6 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${filterType === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Hepsi
                            </button>
                            <button
                                onClick={() => setFilterType('120')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${filterType === '120' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Müşteriler (120)
                            </button>
                            <button
                                onClick={() => setFilterType('320')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${filterType === '320' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                Tedarikçiler (320)
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 sm:w-64">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Firma adı veya kod ile ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => setOnlyWithBalance(!onlyWithBalance)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition ${onlyWithBalance ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                {onlyWithBalance ? '✓ Bakiyeli Olanlar' : 'Bakiyelileri Filtrele'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 md:p-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
                        <table className="hidden lg:table w-full text-left border-collapse" id="companies-table">
                            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Firma Ünvanı / VKN / E-posta</th>
                                    <th className="px-6 py-4 text-center">Tür</th>
                                    <th className="px-6 py-4">Konum</th>
                                    <th className="px-6 py-4 text-right">Firma Bakiyesi</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredCompanies.map((company: any) => (
                                    <tr key={company.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700">{company.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">VKN: {company.taxNumber || '-'}{company.email ? ` · ${String(company.email).toLowerCase()}` : ''}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${company.id?.startsWith('120') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {company.id?.startsWith('120') ? 'Müşteri' : 'Tedarikçi'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                {company.city || '-'} / {company.country || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold ${Number(company.balance) > 0 ? 'text-rose-600' : Number(company.balance) < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {company.balance != null ? `₺${Number(company.balance).toLocaleString('tr-TR')}` : '-'}
                                                {Number(company.balance) > 0 ? ' (B)' : Number(company.balance) < 0 ? ' (A)' : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => fetchMovements(company.id, company.name)}
                                                    className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                                                >
                                                    HAREKET
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(company)}
                                                    className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                                                >
                                                    DÜZENLE
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">
                                            Kayıtlı firma bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {filteredCompanies.map((company: any) => (
                                <div key={company.id} className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{company.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-mono">VKN: {company.taxNumber || '-'}{company.email ? ` · ${String(company.email).toLowerCase()}` : ''}</p>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${company.id?.startsWith('120') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {company.id?.startsWith('120') ? '120' : '320'}
                                        </span>
                                    </div>

                                    <div className="text-xs text-slate-500 space-y-1 mb-3 flex justify-between items-center">
                                        <p><span className="font-bold uppercase text-[9px] text-slate-400 block mb-0.5">Bakiye</span>
                                            <span className={`font-black ${Number(company.balance) > 0 ? 'text-rose-600' : Number(company.balance) < 0 ? 'text-emerald-600' : ''}`}>
                                                {company.balance != null ? `₺${Number(company.balance).toLocaleString('tr-TR')}` : '-'}
                                                {Number(company.balance) > 0 ? ' (B)' : Number(company.balance) < 0 ? ' (A)' : ''}
                                            </span>
                                        </p>
                                        <div className="flex gap-1">
                                            <button onClick={() => fetchMovements(company.id, company.name)} className="bg-slate-100 text-slate-600 p-2 rounded-lg text-xs font-bold">Ekstre</button>
                                            <button onClick={() => openEditModal(company)} className="bg-blue-50 text-blue-600 p-2 rounded-lg text-xs font-bold">Düzenle</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">
                                {editMode ? 'Firma Bilgilerini Düzenle' : 'Yeni Firma Kaydı'}
                            </h3>
                            <form onSubmit={handleAddCompany} className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Firma Ticari Ünvanı</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCompany.name}
                                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm"
                                        placeholder="Örn: Fidanx Tarım Ltd. Şti."
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1.5">Cari Tipi (ERP)</label>
                                        <select
                                            value={newCompany.type}
                                            onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm bg-white"
                                        >
                                            <option value="120">Müşteri (120)</option>
                                            <option value="320">Tedarikçi (320)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-1.5">ERP Cari Kodu</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCompany.taxNumber}
                                                onChange={(e) => setNewCompany({ ...newCompany, taxNumber: e.target.value })}
                                                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm font-mono"
                                                placeholder="Örn: 320-001"
                                            />
                                            {!editMode && (
                                                <button
                                                    type="button"
                                                    onClick={generateNextCode}
                                                    className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-[10px] font-black hover:bg-emerald-700 transition"
                                                    title="Sıradaki Kodu Üret"
                                                >
                                                    OTO
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">İlgili Kişi</label>
                                    <input
                                        type="text"
                                        value={newCompany.contactPerson}
                                        onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Açık Adres</label>
                                    <textarea
                                        rows={2}
                                        value={newCompany.address}
                                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 col-span-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-Posta</label>
                                        <input
                                            type="email"
                                            value={newCompany.email}
                                            onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Telefon</label>
                                        <input
                                            type="tel"
                                            value={newCompany.phone}
                                            onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 flex gap-4 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-50 transition">İptal</button>
                                    <button type="submit" className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition active:scale-95">
                                        {editMode ? 'Değişiklikleri Kaydet' : 'Firmayı Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Movements Modal */}
                {isMovementsModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-5xl p-0 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 font-sans">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Cari Hareket Dökümü (Ekstre)</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedCariName}</p>
                                </div>
                                <button onClick={() => setIsMovementsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl transition">×</button>
                            </div>

                            <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-slate-200">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Tarih</th>
                                            <th className="px-6 py-4">Vade</th>
                                            <th className="px-6 py-4">Belge No</th>
                                            <th className="px-6 py-4">Açıklama</th>
                                            <th className="px-6 py-4 text-right">Borç</th>
                                            <th className="px-6 py-4 text-right">Alacak</th>
                                            <th className="px-6 py-4 text-right bg-slate-100/50">Bakiye</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {movements.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-3 whitespace-nowrap font-mono text-slate-500">
                                                    {m.Tarih ? new Date(m.Tarih).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap font-mono text-slate-400">
                                                    {m.VadeTarihi ? new Date(m.VadeTarihi).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchInvoiceDetails(m.BelgeNo || '')}
                                                        className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline text-left"
                                                    >
                                                        {m.BelgeNo || m.HareketTuru}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3 text-slate-600 max-w-[200px] truncate" title={m.Aciklama}>{m.Aciklama}</td>
                                                <td className="px-6 py-3 text-right font-bold text-rose-600">
                                                    {m.Borc > 0 ? `₺${m.Borc.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-emerald-600">
                                                    {m.Alacak > 0 ? `₺${m.Alacak.toLocaleString()}` : '-'}
                                                </td>
                                                <td className={`px-6 py-3 text-right font-black bg-slate-50/50 ${m.Bakiye > 0 ? 'text-rose-700' : m.Bakiye < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                    ₺{Math.abs(m.Bakiye).toLocaleString()} {m.Bakiye > 0 ? '(B)' : m.Bakiye < 0 ? '(A)' : ''}
                                                </td>
                                            </tr>
                                        ))}
                                        {movements.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Cari hareket bulunamadı.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {invoiceDetails !== null && (
                                <div className="border-t border-slate-200 bg-white p-4 max-h-64 overflow-auto">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold text-slate-700">Fatura içeriği: {invoiceDetailBelgeNo}</h4>
                                        <button type="button" onClick={() => { setInvoiceDetails(null); setInvoiceDetailBelgeNo(''); }} className="text-slate-400 hover:text-slate-600">×</button>
                                    </div>
                                    {invoiceDetails.length === 0 ? (
                                        <p className="text-slate-400 text-sm italic">Bu belgeye ait fatura kalemi bulunamadı.</p>
                                    ) : (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                                                <tr>
                                                    <th className="px-3 py-2">Stok Adı</th>
                                                    <th className="px-3 py-2 text-right">Miktar</th>
                                                    <th className="px-3 py-2">Birim</th>
                                                    <th className="px-3 py-2 text-right">Birim Fiyat</th>
                                                    <th className="px-3 py-2 text-right">Tutar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {invoiceDetails.map((row: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 text-slate-700">{row.StokAdi ?? row.StokKodu ?? '-'}</td>
                                                        <td className="px-3 py-2 text-right">{row.Miktar?.toLocaleString()}</td>
                                                        <td className="px-3 py-2">{row.Birim || '-'}</td>
                                                        <td className="px-3 py-2 text-right">₺{Number(row.BirimFiyat || 0).toLocaleString('tr-TR')}</td>
                                                        <td className="px-3 py-2 text-right font-bold">₺{Number(row.Tutar || 0).toLocaleString('tr-TR')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-8">
                                <div className="text-xs">
                                    <span className="text-slate-400 font-bold uppercase mr-2">Net Durum:</span>
                                    <span className={`font-black ${movements.length > 0 && movements[movements.length - 1].Bakiye > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {movements.length > 0 ? `₺${Math.abs(movements[movements.length - 1].Bakiye).toLocaleString()} ${movements[movements.length - 1].Bakiye > 0 ? 'BORÇ' : 'ALACAK'}` : '0 TL'}
                                    </span>
                                </div>
                                <button onClick={() => setIsMovementsModalOpen(false)} className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition shadow-lg active:scale-95">Kapat</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
