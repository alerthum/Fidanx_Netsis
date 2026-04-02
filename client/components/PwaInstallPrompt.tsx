"use client";
import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">
                    🌱
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm">FidanX Uygulamasını Yükle</p>
                    <p className="text-[10px] text-slate-400 font-bold">Ana ekrana ekleyin, uygulama gibi kullanın</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleDismiss} className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition">
                        Sonra
                    </button>
                    <button onClick={handleInstall} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition shadow-sm">
                        Yükle
                    </button>
                </div>
            </div>
        </div>
    );
}
