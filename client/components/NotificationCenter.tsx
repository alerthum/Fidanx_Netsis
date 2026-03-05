"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NotificationCenter() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        checkAlerts();
        // Check every 5 minutes
        const interval = setInterval(checkAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [pathname]); // Re-check on navigation

    const checkAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/plants?tenantId=demo-tenant`);
            if (res.ok) {
                const plants = await res.json();
                const stockAlerts = plants
                    .filter((p: any) => (p.currentStock || 0) <= (p.criticalStock || 10))
                    .map((p: any) => ({
                        id: `stock-${p.id}`,
                        type: 'CRITICAL',
                        title: 'Kritik Stok Seviyesi',
                        message: `${p.name} stoğu azaldı (${p.currentStock} adet).`,
                        link: '/stoklar',
                        date: new Date()
                    }));

                // We can add other alerts here (e.g. overdue tasks)
                setAlerts([...stockAlerts]);
            }
        } catch (err) {
            console.error('Bildirim kontrolü yapılamadı', err);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative bg-rose-600 text-white w-14 h-14 rounded-full shadow-2xl hover:bg-rose-700 transition active:scale-95 flex items-center justify-center group"
            >
                <span className="text-2xl animate-pulse">🔔</span>
                <span className="absolute -top-1 -right-1 bg-white text-rose-600 border-2 border-rose-100 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                    {alerts.length}
                </span>
            </button>

            {/* Popup */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-rose-50 border-b border-rose-100 p-4 flex justify-between items-center">
                        <h3 className="font-bold text-rose-800 text-sm">⚠️ Kritik Bildirimler</h3>
                        <button onClick={() => setIsOpen(false)} className="text-rose-400 hover:text-rose-600">✕</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                        {alerts.map((alert) => (
                            <Link
                                key={alert.id}
                                href={alert.link}
                                onClick={() => setIsOpen(false)}
                                className="block p-4 hover:bg-slate-50 transition"
                            >
                                <p className="text-xs font-bold text-slate-700 mb-1">{alert.title}</p>
                                <p className="text-[11px] text-slate-500 leading-snug">{alert.message}</p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase mt-2 text-right">Şimdi</p>
                            </Link>
                        ))}
                    </div>
                    <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                        <button onClick={() => setIsOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Tümünü Kapat</button>
                    </div>
                </div>
            )}
        </div>
    );
}
