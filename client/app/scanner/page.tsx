"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from '@/components/Sidebar';
import { addToOfflineQueue } from '@/lib/offlineStore';

const API_URL = '/api';

interface BatchInfo {
    id: number;
    partiNo: string;
    bitkiAdi: string;
    safha: string;
    konum: string;
    mevcutMiktar: number;
    birimMaliyet: number;
    toplamMaliyet: number;
    netsisStokKodu: string;
    durum: string;
}

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'loading'>('idle');
    const [manualInput, setManualInput] = useState('');
    const [mode, setMode] = useState<'INFO' | 'SATIS' | 'SASIRTMA'>('INFO');
    const [cameraActive, setCameraActive] = useState(false);
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [selectedCamera, setSelectedCamera] = useState('');

    const [satisForm, setSatisForm] = useState({
        cariKod: '',
        tarih: new Date().toISOString().split('T')[0],
        belgeNo: 'FT-' + Math.floor(100000 + Math.random() * 900000)
    });
    const [customers, setCustomers] = useState<any[]>([]);
    const [kalemler, setKalemler] = useState<{ id: string, barkod: string, bitkiAdi: string, miktar: number, fiyat: number }[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLDivElement>(null);
    const scannerRef = useRef<any>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/customers?type=120`);
            if (res.ok) {
                const data = await res.json().catch(() => []);
                setCustomers(Array.isArray(data) ? data : []);
            }
        } catch { }
    };

    const lookupBatch = useCallback(async (code: string) => {
        setStatus('loading');
        try {
            const res = await fetch(`${API_URL}/production/batches?tenantId=demo-tenant`);
            if (res.ok) {
                const batches = await res.json().catch(() => []);
                let parsed: any = null;
                try { parsed = JSON.parse(code); } catch { }

                const partiNo = parsed?.p || code;
                const found = (Array.isArray(batches) ? batches : []).find(
                    (b: any) => b.partiNo === partiNo || b.partiNo === code
                );

                if (found) {
                    setBatchInfo(found);
                    setStatus('success');
                    return found;
                }
            }
        } catch { }
        setBatchInfo(null);
        setStatus('error');
        return null;
    }, []);

    const handleScan = useCallback(async (data: string | null) => {
        if (!data) return;

        try {
            const audio = new Audio('/success.mp3');
            audio.play().catch(() => { });
        } catch { }

        if (mode === 'SATIS') {
            const existing = kalemler.find(k => k.barkod === data);
            if (existing) {
                setKalemler(prev => prev.map(k => k.barkod === data ? { ...k, miktar: k.miktar + 1 } : k));
            } else {
                const batch = await lookupBatch(data);
                let parsed: any = null;
                try { parsed = JSON.parse(data); } catch { }
                const bitkiAdi = batch?.bitkiAdi || parsed?.b || data;
                setKalemler(prev => [{ id: Date.now().toString(), barkod: data, bitkiAdi, miktar: 1, fiyat: batch?.birimMaliyet || 0 }, ...prev]);
            }
            setManualInput('');
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setScanResult(data);
            await lookupBatch(data);
        }
    }, [mode, kalemler, lookupBatch]);

    const startCamera = useCallback(async () => {
        if (!videoRef.current) return;
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const devices = await Html5Qrcode.getCameras();
            setCameras(devices.map(d => ({ id: d.id, label: d.label || `Kamera ${d.id.slice(0, 6)}` })));

            const camId = selectedCamera || (devices.length > 0 ? devices[devices.length - 1].id : '');
            if (!camId) { setStatus('error'); return; }

            const scanner = new Html5Qrcode('scanner-viewport');
            scannerRef.current = scanner;

            await scanner.start(
                camId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    handleScan(decodedText);
                    if (mode !== 'SATIS') {
                        scanner.stop().catch(() => { });
                        setCameraActive(false);
                    }
                },
                () => { }
            );
            setCameraActive(true);
            setStatus('scanning');
        } catch (err) {
            console.error('Kamera başlatılamadı:', err);
            setStatus('error');
        }
    }, [selectedCamera, handleScan, mode]);

    const stopCamera = useCallback(async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch { }
            scannerRef.current = null;
        }
        setCameraActive(false);
        setStatus('idle');
    }, []);

    useEffect(() => {
        return () => { stopCamera(); };
    }, [stopCamera]);

    const resetScan = () => {
        setScanResult(null);
        setBatchInfo(null);
        setManualInput('');
        setStatus('idle');
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) handleScan(manualInput.trim());
    };

    const handleDeleteKalem = (id: string) => setKalemler(prev => prev.filter(k => k.id !== id));
    const handleUpdateKalem = (id: string, field: 'miktar' | 'fiyat', val: string) => {
        setKalemler(prev => prev.map(k => k.id === id ? { ...k, [field]: parseFloat(val) || 0 } : k));
    };

    const handleSatisFatura = async () => {
        if (!satisForm.cariKod || kalemler.length === 0) return;
        const payload = {
            faturaTuru: '1' as const,
            cariKodu: satisForm.cariKod,
            tarih: satisForm.tarih,
            aciklama: `FidanX Barkodlu Satış: ${satisForm.belgeNo}`,
            items: kalemler.map(k => ({
                stokKodu: k.barkod,
                miktar: k.miktar,
                birimFiyat: k.fiyat,
                kdvOrani: 20
            }))
        };
        try {
            const res = await fetch(`${API_URL}/netsis/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const result = await res.json().catch(() => ({}));
                alert(`Fatura Netsis'e yazıldı! No: ${result.faturaNo || '-'}`);
                setKalemler([]);
                setSatisForm(prev => ({ ...prev, belgeNo: 'FT-' + Math.floor(100000 + Math.random() * 900000) }));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Hata: ${err.message || 'Bilinmeyen hata'}`);
            }
        } catch {
            addToOfflineQueue({
                type: 'invoice',
                endpoint: `${API_URL}/netsis/invoices`,
                method: 'POST',
                payload
            });
            alert('Çevrimdışı modda kaydedildi. Bağlantı gelince otomatik gönderilecek.');
            setKalemler([]);
            setSatisForm(prev => ({ ...prev, belgeNo: 'FT-' + Math.floor(100000 + Math.random() * 900000) }));
        }
    };

    const modeConfig = {
        INFO: { color: 'emerald', icon: 'ℹ️', title: 'Bilgi Sorgulama' },
        SATIS: { color: 'blue', icon: '🏷️', title: 'Perakende Satış' },
        SASIRTMA: { color: 'amber', icon: '🔄', title: 'Şaşırtma' }
    };
    const curMode = modeConfig[mode];

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-900 font-sans selection:bg-white/20">
            <Sidebar />
            <main className="flex-1 flex flex-col items-center justify-start p-4 lg:p-12 relative overflow-y-auto min-h-screen custom-scrollbar">

                <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                    <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-${curMode.color}-900 to-slate-900 animate-pulse transition-colors duration-1000`}></div>
                </div>

                <div className={`z-10 w-full ${mode === 'SATIS' ? 'max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8' : 'max-w-lg'} transition-all duration-500`}>

                    {/* Mod Seçici */}
                    <div className="lg:col-span-full mb-8 flex text-[10px] font-black uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        {(['INFO', 'SATIS', 'SASIRTMA'] as const).map(m => (
                            <button key={m} onClick={() => { setMode(m); resetScan(); stopCamera(); }}
                                className={`flex-1 py-4 transition-colors relative ${mode === m ? `text-${modeConfig[m].color}-400 bg-${modeConfig[m].color}-500/10` : 'hover:bg-white/5'}`}>
                                <span className="relative z-10">{m === 'INFO' ? 'Sorgula' : m === 'SATIS' ? 'Satış Faturası' : 'Şaşırtma'}</span>
                                {mode === m && <div className={`absolute bottom-0 left-0 w-full h-1 bg-${modeConfig[m].color}-500 shadow-[0_0_15px_currentColor]`}></div>}
                            </button>
                        ))}
                    </div>

                    {/* Tarayıcı Paneli */}
                    <div className={`bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 lg:p-8 shadow-2xl flex flex-col items-center relative h-fit ${mode === 'SATIS' ? '' : 'w-full'}`}>
                        <div className="text-center mb-6">
                            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-3">
                                {curMode.icon} {curMode.title}
                            </h1>
                            <p className="text-slate-400 text-xs font-medium">
                                {mode === 'SATIS' ? 'Barkodları sırayla okutarak kalem ekleyin.' : 'Parti QR kodunu okutun veya yazın.'}
                            </p>
                        </div>

                        {/* Kamera Viewport */}
                        <div className="relative w-full aspect-square bg-black/50 rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-inner">
                            <div id="scanner-viewport" ref={videoRef} className="w-full h-full" />
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl mb-4">📷</span>
                                    <button onClick={startCamera} className={`px-6 py-3 rounded-2xl text-sm font-black text-white transition shadow-lg bg-${curMode.color}-600 hover:bg-${curMode.color}-500`}>
                                        Kamerayı Başlat
                                    </button>
                                    {cameras.length > 1 && (
                                        <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}
                                            className="mt-3 bg-white/10 border border-white/20 text-white text-xs rounded-xl px-3 py-2 outline-none">
                                            {cameras.map(c => <option key={c.id} value={c.id} className="text-black">{c.label}</option>)}
                                        </select>
                                    )}
                                </div>
                            )}
                            {cameraActive && (
                                <button onClick={stopCamera} className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition z-10">
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Manuel Giriş */}
                        <form onSubmit={handleManualSubmit} className="w-full relative mb-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={manualInput}
                                onChange={e => setManualInput(e.target.value)}
                                placeholder="Barkod Okutun veya Yazın..."
                                className={`w-full bg-black/40 border border-white/10 text-white px-5 py-4 rounded-2xl outline-none transition placeholder:text-slate-600 font-mono text-center tracking-widest text-sm uppercase shadow-inner focus:border-${curMode.color}-500/50`}
                            />
                            <button type="submit" className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition bg-${curMode.color}-500/20 text-${curMode.color}-400 hover:bg-${curMode.color}-500 hover:text-white`}>
                                ➜
                            </button>
                        </form>

                        {/* Sonuç Paneli (INFO / SASIRTMA) */}
                        {scanResult && mode !== 'SATIS' && (
                            <div className="w-full bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 animate-fade-in space-y-4">
                                {status === 'loading' && <p className="text-white/50 text-center font-bold animate-pulse">Aranıyor...</p>}
                                {status === 'success' && batchInfo && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl">✓</div>
                                            <div>
                                                <p className="text-white font-black text-lg">{batchInfo.partiNo}</p>
                                                <p className="text-slate-400 text-xs font-bold">{batchInfo.bitkiAdi}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Safha</p>
                                                <p className="text-white font-bold text-sm">{batchInfo.safha}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Konum</p>
                                                <p className="text-white font-bold text-sm">{batchInfo.konum}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Adet</p>
                                                <p className="text-white font-bold text-sm">{batchInfo.mevcutMiktar?.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Birim Maliyet</p>
                                                <p className="text-emerald-400 font-bold text-sm">₺{(batchInfo.birimMaliyet || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <a href={`/uretim/${batchInfo.id}`} className="flex-1 py-3 text-center rounded-xl text-sm font-black bg-emerald-600 text-white hover:bg-emerald-500 transition">
                                                Detay Sayfası
                                            </a>
                                            {mode === 'SASIRTMA' && (
                                                <a href={`/uretim?action=sasirtma&id=${batchInfo.id}`} className="flex-1 py-3 text-center rounded-xl text-sm font-black bg-amber-600 text-white hover:bg-amber-500 transition">
                                                    Şaşırtma Başlat
                                                </a>
                                            )}
                                        </div>
                                    </>
                                )}
                                {status === 'error' && (
                                    <div className="text-center py-4">
                                        <p className="text-red-400 font-bold">Parti bulunamadı</p>
                                        <p className="text-slate-500 text-xs mt-1">Barkod: {scanResult}</p>
                                    </div>
                                )}
                                <button onClick={resetScan} className="w-full py-3 bg-white/5 text-slate-300 border border-white/10 rounded-xl hover:bg-white/10 font-bold transition text-sm">
                                    Yeni Barkod Okut
                                </button>
                            </div>
                        )}
                    </div>

                    {/* SATIŞ Fatura Paneli */}
                    {mode === 'SATIS' && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 lg:p-8 shadow-2xl flex flex-col h-[800px] overflow-hidden">
                            <div className="pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Satış Faturası</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Netsis Entegre</p>
                                </div>
                                <span className="text-3xl">🧾</span>
                            </div>

                            <div className="py-4 space-y-3 border-b border-slate-100 shrink-0">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tarih</label>
                                        <input type="date" value={satisForm.tarih} onChange={e => setSatisForm({ ...satisForm, tarih: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Belge No</label>
                                        <input type="text" value={satisForm.belgeNo} readOnly className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cari Hesap</label>
                                    <select value={satisForm.cariKod} onChange={e => setSatisForm({ ...satisForm, cariKod: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                                        <option value="">Cari Seçiniz...</option>
                                        {customers.map((c: any) => (
                                            <option key={c.CariKodu || c.cariKodu} value={c.CariKodu || c.cariKodu}>
                                                {c.CariKodu || c.cariKodu} - {c.CariAdi || c.cariAdi}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Kalemler */}
                            <div className="flex-1 overflow-y-auto py-4 space-y-2">
                                {kalemler.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <span className="text-4xl mb-3 opacity-50">📱</span>
                                        <p className="font-bold text-slate-400 text-center text-sm">Barkod okutarak kalem ekleyin</p>
                                    </div>
                                ) : kalemler.map((k, idx) => (
                                    <div key={k.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3 group hover:border-blue-300 transition">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[9px] font-black text-blue-500 uppercase">{idx + 1}.</span>
                                            <p className="text-xs font-bold text-slate-800 truncate">{k.bitkiAdi}</p>
                                            <p className="text-[10px] font-mono text-slate-400 truncate">{k.barkod}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={k.miktar || ''} onChange={e => handleUpdateKalem(k.id, 'miktar', e.target.value)}
                                                className="w-14 py-1.5 text-center text-sm font-bold text-slate-800 border border-slate-200 rounded-lg outline-none" />
                                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                                <span className="px-1.5 text-[10px] font-bold text-slate-400 bg-slate-50">₺</span>
                                                <input type="number" step="0.01" value={k.fiyat || ''} onChange={e => handleUpdateKalem(k.id, 'fiyat', e.target.value)}
                                                    className="w-16 py-1.5 px-1.5 text-right text-sm font-bold text-slate-800 outline-none" />
                                            </div>
                                            <button onClick={() => handleDeleteKalem(k.id)} className="w-8 h-8 bg-red-50 text-red-500 border border-red-100 rounded-lg flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition text-xs">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Toplam & Kaydet */}
                            <div className="pt-4 border-t border-slate-100 shrink-0 space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam</span>
                                    <span className="text-2xl font-black text-slate-800">
                                        ₺{kalemler.reduce((a, k) => a + (k.miktar * k.fiyat), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <button onClick={handleSatisFatura} disabled={kalemler.length === 0 || !satisForm.cariKod}
                                    className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                                    Netsis'e Faturayı Kaydet
                                </button>
                                {!satisForm.cariKod && kalemler.length > 0 && (
                                    <p className="text-[10px] text-red-500 font-bold text-center uppercase tracking-wider">Cari seçimi zorunludur</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <style jsx>{`
                    @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                `}</style>
            </main>
        </div>
    );
}
