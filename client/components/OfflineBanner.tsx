"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { getPendingCount, syncOfflineQueue } from '@/lib/offlineStore';

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        setPending(getPendingCount());

        const onOnline = () => {
            setIsOnline(true);
            handleSync();
        };
        const onOffline = () => setIsOnline(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        const interval = setInterval(() => setPending(getPendingCount()), 5000);

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            clearInterval(interval);
        };
    }, []);

    const handleSync = useCallback(async () => {
        if (syncing || !navigator.onLine) return;
        const count = getPendingCount();
        if (count === 0) return;

        setSyncing(true);
        const result = await syncOfflineQueue();
        setPending(getPendingCount());
        setSyncing(false);

        if (result.synced > 0) {
            setLastSync(`${result.synced} işlem senkronize edildi`);
            setTimeout(() => setLastSync(null), 5000);
        }
    }, [syncing]);

    if (isOnline && pending === 0 && !lastSync) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
            {!isOnline && (
                <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-black uppercase tracking-widest pointer-events-auto">
                    Çevrimdışı Mod - İşlemler kaydedilip bağlantı gelince gönderilecek
                </div>
            )}

            {isOnline && pending > 0 && (
                <div className="bg-blue-500 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-3 pointer-events-auto">
                    <span>{pending} bekleyen işlem var</span>
                    <button onClick={handleSync} disabled={syncing}
                        className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase hover:bg-white/30 transition disabled:opacity-50">
                        {syncing ? 'Gönderiliyor...' : 'Şimdi Gönder'}
                    </button>
                </div>
            )}

            {lastSync && (
                <div className="bg-emerald-500 text-white text-center py-2 px-4 text-xs font-bold animate-fade-in pointer-events-auto">
                    {lastSync}
                </div>
            )}
        </div>
    );
}
