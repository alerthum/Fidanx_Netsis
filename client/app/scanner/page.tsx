"use client";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from '@/components/Sidebar';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [manualInput, setManualInput] = useState('');
    const [mode, setMode] = useState<'INFO' | 'SATIS' | 'SASIRTMA'>('INFO');

    // Satis özel state'ler
    const [satisForm, setSatisForm] = useState({
        cariKod: '',
        tarih: new Date().toISOString().split('T')[0],
        belgeNo: 'FT-' + Math.floor(100000 + Math.random() * 900000)
    });
    const [kalemler, setKalemler] = useState<{ id: string, barkod: string, miktar: number, fiyat: number }[]>([]);

    // Auto-focus input reference for continuous scanning
    const inputRef = useRef<HTMLInputElement>(null);

    const playSound = () => {
        try {
            const audio = new Audio('/success.mp3');
            audio.play().catch(() => { });
        } catch (e) { }
    };

    const handleScan = (data: string | null) => {
        if (!data) return;

        playSound();

        if (mode === 'SATIS') {
            // Check if already exists in kalemler, if so increase miktar
            const existing = kalemler.find(k => k.barkod === data);
            if (existing) {
                setKalemler(kalemler.map(k => k.barkod === data ? { ...k, miktar: k.miktar + 1 } : k));
            } else {
                setKalemler([{ id: Date.now().toString(), barkod: data, miktar: 1, fiyat: 0 }, ...kalemler]);
            }
            setManualInput('');
            // Keep focus for continuous scanning
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setScanResult(data);
            setStatus('success');
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleScan(manualInput);
    };

    const resetScan = () => {
        setScanResult(null);
        setManualInput('');
        setStatus('idle');
    };

    const handleDeleteKalem = (id: string) => {
        setKalemler(kalemler.filter(k => k.id !== id));
    };

    const handleUpdateKalem = (id: string, field: 'miktar' | 'fiyat', val: string) => {
        const num = parseFloat(val) || 0;
        setKalemler(kalemler.map(k => k.id === id ? { ...k, [field]: num } : k));
    };

    const modeConfig = {
        INFO: { color: 'emerald', icon: 'ℹ️', title: 'Bilgi Sorgulama', btn: 'Detay Gör', link: (id: string) => `/uretim?search=${id}` },
        SATIS: { color: 'blue', icon: '🏷️', title: 'Perakende Satış (Fatura)', btn: 'Satış İşle', link: (id: string) => `/satislar?barcode=${id}` },
        SASIRTMA: { color: 'amber', icon: '🔄', title: 'Şaşırtma', btn: 'Şaşırtma Başlat', link: (id: string) => `/uretim?action=sasirtma&barcode=${id}` }
    };

    const curMode = modeConfig[mode];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-900 font-sans selection:bg-white/20">
            <Sidebar />
            <main className="flex-1 flex flex-col items-center justify-start p-4 lg:p-12 relative overflow-y-auto overflow-x-hidden min-h-screen lg:min-h-0 custom-scrollbar">

                {/* Background Animation */}
                <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                    <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-${curMode.color}-900 to-slate-900 animate-pulse transition-colors duration-1000`}></div>
                </div>

                <div className={`z-10 w-full ${mode === 'SATIS' ? 'max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8' : 'max-w-lg'} transition-all duration-500`}>

                    {/* Mode Selector (Top Floating) */}
                    <div className="lg:col-span-full mb-8 flex text-[10px] font-black uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <button onClick={() => { setMode('INFO'); resetScan(); }} className={`flex-1 py-4 transition-colors relative ${mode === 'INFO' ? 'text-emerald-400 bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                            <span className="relative z-10">Sorgula</span>
                            {mode === 'INFO' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 animate-fade-in shadow-[0_0_15px_#10b981]"></div>}
                        </button>
                        <button onClick={() => { setMode('SATIS'); resetScan(); }} className={`flex-1 py-4 transition-colors relative ${mode === 'SATIS' ? 'text-blue-400 bg-blue-500/10' : 'hover:bg-white/5'}`}>
                            <span className="relative z-10">Satış Faturası</span>
                            {mode === 'SATIS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 animate-fade-in shadow-[0_0_15px_#3b82f6]"></div>}
                        </button>
                        <button onClick={() => { setMode('SASIRTMA'); resetScan(); }} className={`flex-1 py-4 transition-colors relative ${mode === 'SASIRTMA' ? 'text-amber-400 bg-amber-500/10' : 'hover:bg-white/5'}`}>
                            <span className="relative z-10">Şaşırtma</span>
                            {mode === 'SASIRTMA' && <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 animate-fade-in shadow-[0_0_15px_#f59e0b]"></div>}
                        </button>
                    </div>

                    {/* Scanner Panel */}
                    <div className={`bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 lg:p-8 shadow-2xl flex flex-col items-center relative h-fit ${mode === 'SATIS' ? '' : 'w-full'}`}>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-3">
                                {curMode.icon} {curMode.title}
                            </h1>
                            <p className="text-slate-400 text-xs font-medium">
                                {mode === 'SATIS' ? 'Satışa eklenecek partilerin barkodlarını sırayla okutun.' : 'Parti LOT barkodunu veya Karekodu kameraya okutun.'}
                            </p>
                        </div>

                        {/* Scanner Viewport */}
                        <div className={`relative w-full aspect-square bg-black/50 rounded-3xl overflow-hidden mb-8 border border-white/10 shadow-inner group ${scanResult && mode !== 'SATIS' ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-6xl mb-4 transition-transform duration-700 ${mode === 'SATIS' ? 'group-hover:scale-110' : ''}`}>📷</span>
                                <p className={`text-${curMode.color}-400 text-[10px] font-mono font-bold animate-pulse tracking-widest uppercase bg-black/50 px-3 py-1.5 rounded-xl`}>CANLI YAYIN BEKLENİYOR</p>
                            </div>

                            {/* Scanning Line Animation */}
                            <div className={`absolute top-0 left-0 w-full h-0.5 shadow-[0_0_20px_currentColor] animate-[scan_2.5s_ease-in-out_infinite] ${mode === 'INFO' ? 'bg-emerald-400 text-emerald-400' : mode === 'SATIS' ? 'bg-blue-400 text-blue-400' : 'bg-amber-400 text-amber-400'}`}></div>

                            {/* Scanning Target Box */}
                            <div className="absolute inset-8 border border-white/20 rounded-2xl">
                                <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl ${mode === 'INFO' ? 'border-emerald-500' : mode === 'SATIS' ? 'border-blue-500' : 'border-amber-500'}`}></div>
                                <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl ${mode === 'INFO' ? 'border-emerald-500' : mode === 'SATIS' ? 'border-blue-500' : 'border-amber-500'}`}></div>
                                <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl ${mode === 'INFO' ? 'border-emerald-500' : mode === 'SATIS' ? 'border-blue-500' : 'border-amber-500'}`}></div>
                                <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 rounded-br-xl ${mode === 'INFO' ? 'border-emerald-500' : mode === 'SATIS' ? 'border-blue-500' : 'border-amber-500'}`}></div>
                            </div>
                        </div>

                        {/* Manual Input (Bluetooth Barkod Okuyucu Desteği İçin) */}
                        <form onSubmit={handleManualSubmit} className="w-full relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={manualInput}
                                onChange={e => setManualInput(e.target.value)}
                                placeholder="Barkod Okutun veya Yazın"
                                className={`w-full bg-black/40 border border-white/10 text-white px-5 py-4 rounded-2xl outline-none transition placeholder:text-slate-600 font-mono text-center tracking-widest text-sm uppercase shadow-inner ${mode === 'INFO' ? 'focus:border-emerald-500/50' : mode === 'SATIS' ? 'focus:border-blue-500/50' : 'focus:border-amber-500/50'}`}
                            />
                            <button type="submit" className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${mode === 'INFO' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : mode === 'SATIS' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white'}`}>
                                ➜
                            </button>
                        </form>

                        {/* Single Scan Result Panel (INFO / SASIRTMA) */}
                        {scanResult && mode !== 'SATIS' && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 lg:p-10 animate-fade-in rounded-[2rem]">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6 shadow-2xl ${mode === 'INFO' ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' : 'bg-amber-500/20 text-amber-400 shadow-amber-500/20'}`}>✓</div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${mode === 'INFO' ? 'text-emerald-400' : 'text-amber-400'}`}>Parti Tespit Edildi</p>
                                <p className="text-white font-mono text-2xl lg:text-3xl font-black tracking-widest break-all text-center mb-8">{scanResult}</p>

                                <div className="w-full flex flex-col gap-3">
                                    <a href={curMode.link(scanResult)} className={`w-full py-4 text-center rounded-2xl text-sm font-black transition text-white shadow-xl ${mode === 'INFO' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50'}`}>{curMode.btn}</a>
                                    <button onClick={resetScan} className="w-full py-4 bg-white/5 text-slate-300 border border-white/10 rounded-2xl hover:bg-white/10 font-bold transition-all">Yeni Barkod Okut</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SATIS Faturası Sağ Panel */}
                    {mode === 'SATIS' && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 lg:p-8 shadow-2xl flex flex-col h-[800px] overflow-hidden">
                            <div className="pb-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Satış Faturası</h2>
                                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Çıkış İşlemi</p>
                                </div>
                                <span className="text-4xl">🧾</span>
                            </div>

                            <form className="py-6 space-y-5 border-b border-slate-100 shrink-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tarih</label>
                                        <input type="date" value={satisForm.tarih} onChange={e => setSatisForm({ ...satisForm, tarih: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 ring-blue-500/10 transition-all cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Belge / Fatura No</label>
                                        <input type="text" value={satisForm.belgeNo} readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-500 outline-none opacity-80" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cari Hesap (Müşteri)</label>
                                    <select value={satisForm.cariKod} onChange={e => setSatisForm({ ...satisForm, cariKod: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 ring-blue-500/10 transition-all appearance-none cursor-pointer">
                                        <option value="">Cari Seçmek İçin Tıklayın...</option>
                                        <option value="120-01">120-01 Müşteri A.Ş.</option>
                                        <option value="120-02">120-02 Perakende Müşteri</option>
                                    </select>
                                </div>
                            </form>

                            {/* Kalemler Listesi */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar py-6 space-y-3">
                                {kalemler.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <span className="text-5xl mb-4 opacity-50">📱</span>
                                        <p className="font-bold text-slate-400 text-center max-w-[200px]">Ürünleri eklemek için barkodları okutun.</p>
                                    </div>
                                ) : (
                                    kalemler.map((k, index) => (
                                        <div key={k.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center animate-fade-in group hover:border-blue-300 transition-colors">
                                            <div className="flex-1 w-full shrink-0 min-w-0">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{index + 1}. KALEM</span>
                                                <p className="font-mono text-sm font-black text-slate-800 tracking-wider truncate mt-0.5" title={k.barkod}>{k.barkod}</p>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 sm:flex-none">
                                                    <span className="px-3 text-xs font-black text-slate-400 border-r border-slate-100 bg-slate-50">ADET</span>
                                                    <input type="number" value={k.miktar || ''} onChange={e => handleUpdateKalem(k.id, 'miktar', e.target.value)} className="w-16 py-2 text-center text-sm font-bold text-slate-800 outline-none appearance-none m-0" />
                                                </div>
                                                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 sm:flex-none">
                                                    <span className="px-3 text-xs font-black text-slate-400 border-r border-slate-100 bg-slate-50">₺</span>
                                                    <input type="number" step="0.01" value={k.fiyat || ''} onChange={e => handleUpdateKalem(k.id, 'fiyat', e.target.value)} placeholder="0.00" className="w-20 py-2 px-2 text-right text-sm font-bold text-slate-800 outline-none appearance-none m-0" />
                                                </div>
                                                <button onClick={() => handleDeleteKalem(k.id)} className="w-10 h-10 shrink-0 bg-red-50 text-red-500 border border-red-100 rounded-xl flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer / Toplam / Kaydet */}
                            <div className="pt-6 border-t border-slate-100 shrink-0 mt-auto">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Genel Toplam</span>
                                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                                        ₺ {kalemler.reduce((acc, k) => acc + (k.miktar * k.fiyat), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <button disabled={kalemler.length === 0 || !satisForm.cariKod} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                                    <span className="text-lg">✓</span> Faturayı Kaydet ve Kapat
                                </button>
                                {(!satisForm.cariKod && kalemler.length > 0) && <p className="text-[10px] text-red-500 font-bold text-center mt-3 uppercase tracking-wider">Cari Seçimi Zorunludur!</p>}
                            </div>
                        </div>
                    )}

                </div>

                <style jsx>{`
                    @keyframes scan {
                        0% { top: 0%; opacity: 0; box-shadow: 0 0 0 transparent; }
                        10% { opacity: 1; box-shadow: 0 0 20px currentColor; }
                        90% { opacity: 1; box-shadow: 0 0 20px currentColor; }
                        100% { top: 100%; opacity: 0; box-shadow: 0 0 0 transparent; }
                    }
                `}</style>
            </main>
        </div>
    );
}
