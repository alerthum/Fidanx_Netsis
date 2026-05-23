"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function MobilTaramaPage() {
    const router = useRouter();
    const [scanState, setScanState] = useState<'IDLE' | 'SCAN_LOCATION' | 'LOCATION_FOUND' | 'SCAN_BATCH' | 'BATCH_SCANNED'>('IDLE');
    const [scannedLocation, setScannedLocation] = useState<any>(null);
    const [scannedBatch, setScannedBatch] = useState<any>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Config
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const tenantId = 'demo-tenant';

    useEffect(() => {
        if (scanState === 'SCAN_LOCATION' || scanState === 'SCAN_BATCH') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scanner.render(
                (decodedText) => {
                    scanner.clear();
                    handleScan(decodedText);
                },
                (error) => {
                    // Ignore continuous errors
                }
            );

            return () => {
                scanner.clear().catch(e => console.error("Scanner clear error", e));
            };
        }
    }, [scanState]);

    const handleScan = async (text: string) => {
        if (scanState === 'SCAN_LOCATION') {
            setIsProcessing(true);
            try {
                // Lokasyon QR kodları UUID veya metin şeklindedir
                const res = await fetch(`/api/production/locations/qr/${encodeURIComponent(text)}?tenantId=${tenantId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.Id) {
                        setScannedLocation(data);
                        setScanState('LOCATION_FOUND');
                    } else {
                        alert('Geçersiz Lokasyon QR Kodu!');
                        setScanState('IDLE');
                    }
                } else {
                    alert('Lokasyon bulunamadı!');
                    setScanState('IDLE');
                }
            } catch (err) {
                alert('Bağlantı hatası');
                setScanState('IDLE');
            } finally {
                setIsProcessing(false);
            }
        } else if (scanState === 'SCAN_BATCH') {
            try {
                // Etiketten gelen JSON { p: "LOT-001", s: "150...", b: "Bitki", f: "Safha" }
                // Fakat biz backend'den doğrudan parti numarasından ID'yi bulmalıyız.
                // Eğer direkt JSON ise parse edelim, değilse salt PartiNo kabul edelim
                let partiNo = text;
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.p) partiNo = parsed.p;
                } catch { } // JSON değilse kendisi parti no'dur

                // Partiyi backend'den ID ile doğrula veya detayını getir
                const res = await fetch(`/api/production/batches/${encodeURIComponent(partiNo)}?tenantId=${tenantId}`);
                if (res.ok) {
                    const batch = await res.json();
                    if (batch && batch.id) {
                        setScannedBatch(batch);
                        setQuantity(batch.mevcutMiktar); // Default olarak tüm miktarı seç
                        setScanState('BATCH_SCANNED');
                    } else {
                        alert('Parti sistemde bulunamadı!');
                        setScanState('LOCATION_FOUND'); // Geri dön
                    }
                } else {
                    alert('Parti sorgulanamadı!');
                    setScanState('LOCATION_FOUND');
                }
            } catch (err) {
                alert('Geçersiz Barkod!');
                setScanState('LOCATION_FOUND');
            }
        }
    };

    const confirmAssignment = async () => {
        if (!scannedLocation || !scannedBatch || quantity <= 0) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/production/locations/assign?tenantId=${tenantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lokasyonId: scannedLocation.Id,
                    partiId: scannedBatch.Id,
                    miktar: quantity
                })
            });
            if (res.ok) {
                alert('Başarıyla yerleştirildi!');
                setScanState('LOCATION_FOUND'); // Aynı lokasyona taramaya devam edebilir
                setScannedBatch(null);
            } else {
                alert('Yerleştirme başarısız!');
            }
        } catch {
            alert('Sunucu hatası');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetScanner = () => {
        setScanState('IDLE');
        setScannedLocation(null);
        setScannedBatch(null);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col relative pb-safe">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-50 flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    ←
                </button>
                <div>
                    <h1 className="font-black text-lg tracking-wide text-white">Saha Terminali</h1>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">QR Kod Tarayıcı</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
                
                {scanState === 'IDLE' && (
                    <div className="text-center space-y-6 w-full">
                        <div className="w-24 h-24 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner border border-slate-700">
                            📷
                        </div>
                        <h2 className="text-2xl font-black text-white">Tarayıcıyı Başlat</h2>
                        <p className="text-slate-400 text-sm">Lokasyon ve ürün eşleştirmesi yapmak için önce bir saha (Sera vb.) QR kodunu okutun.</p>
                        
                        <button 
                            onClick={() => setScanState('SCAN_LOCATION')}
                            className="w-full py-4 bg-emerald-600 rounded-2xl font-black text-lg shadow-lg shadow-emerald-900 hover:bg-emerald-500 transition-all active:scale-95"
                        >
                            Lokasyon Okut
                        </button>
                    </div>
                )}

                {(scanState === 'SCAN_LOCATION' || scanState === 'SCAN_BATCH') && (
                    <div className="w-full space-y-4">
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                            <h3 className="font-bold text-slate-200">
                                {scanState === 'SCAN_LOCATION' ? '📍 Lokasyon QR Kodunu Okutun' : '🌿 Bitki / Parti QR Kodunu Okutun'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {scanState === 'SCAN_LOCATION' ? 'Sera, Açık alan tabelalarındaki barkod' : 'Saksı üzerindeki ürün etiketi'}
                            </p>
                        </div>
                        <div id="reader" className="w-full bg-black rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]"></div>
                        <button 
                            onClick={() => scanState === 'SCAN_BATCH' ? setScanState('LOCATION_FOUND') : resetScanner()}
                            className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl mt-4"
                        >
                            İptal
                        </button>
                    </div>
                )}

                {scanState === 'LOCATION_FOUND' && (
                    <div className="w-full space-y-6 text-center animate-fade-in">
                        <div className="bg-emerald-900/40 border border-emerald-700/50 p-6 rounded-3xl">
                            <div className="text-4xl mb-3">✅</div>
                            <h2 className="text-xl font-black text-emerald-400 mb-1">{scannedLocation?.LokasyonAdi}</h2>
                            <p className="text-xs text-emerald-200/70 font-mono">{scannedLocation?.LokasyonKodu} - {scannedLocation?.LokasyonTipi}</p>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={() => setScanState('SCAN_BATCH')}
                                className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-lg shadow-lg shadow-indigo-900 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">🌱</span> Bitki / Parti Okut
                            </button>
                            <button 
                                onClick={resetScanner}
                                className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                            >
                                Lokasyonu Değiştir
                            </button>
                        </div>
                    </div>
                )}

                {scanState === 'BATCH_SCANNED' && (
                    <div className="w-full bg-slate-800 border border-slate-700 p-6 rounded-3xl animate-fade-in space-y-6">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Hedef Lokasyon</h3>
                            <p className="text-emerald-400 font-black text-lg">{scannedLocation?.LokasyonAdi}</p>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Okutulan Bitki</h3>
                            <p className="font-bold text-white text-lg">{scannedBatch?.bitkiAdi}</p>
                            <p className="text-indigo-400 font-mono text-sm mt-1">{scannedBatch?.partiNo}</p>
                            <p className="text-slate-400 text-xs mt-1">{scannedBatch?.safha}</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Yerleştirilecek Miktar</label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 10))} className="w-12 h-12 rounded-xl bg-slate-700 text-white font-bold text-xl hover:bg-slate-600">-</button>
                                <input 
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(Number(e.target.value))}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl h-12 text-center text-xl font-black text-white focus:border-indigo-500 outline-none"
                                />
                                <button onClick={() => setQuantity(Math.min(scannedBatch?.mevcutMiktar, quantity + 10))} className="w-12 h-12 rounded-xl bg-slate-700 text-white font-bold text-xl hover:bg-slate-600">+</button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center">Partideki Toplam: <b>{scannedBatch?.mevcutMiktar}</b> adet</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setScanState('LOCATION_FOUND')}
                                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-bold"
                                disabled={isProcessing}
                            >
                                İptal
                            </button>
                            <button 
                                onClick={confirmAssignment}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-900/50"
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'İşleniyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
