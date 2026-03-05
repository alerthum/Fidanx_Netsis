"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavigation() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Main navigation items for the bottom bar (Left and Right of the center button)
    const leftItems = [
        { name: 'Ana Sayfa', path: '/', icon: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
        { name: 'Üretim', path: '/uretim', icon: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
    ];

    const rightItems = [
        { name: 'Satış', path: '/satislar', icon: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg> },
        { name: 'Sera', path: '/sera', icon: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg> },
    ];

    // All menu items for the "More" drawer
    const allMenuItems = [
        { name: 'Kontrol Paneli', path: '/', icon: '📊' },
        { name: 'Sera Yönetimi', path: '/sera', icon: '🌡️' },
        { name: 'Üretim Takibi', path: '/uretim', icon: '🚜' },
        { name: 'Stok Yönetimi', path: '/stoklar', icon: '🌱' },
        { name: 'Satış & CRM', path: '/satislar', icon: '💰' },
        { name: 'Satınalma', path: '/satinalma', icon: '🛒' },
        { name: 'Finans', path: '/finans', icon: '💎' },
        { name: 'Hareketler', path: '/hareketler', icon: '🚚' },
        { name: 'Operasyon', path: '/operasyon', icon: '🌻' },
        { name: 'Reçeteler', path: '/receteler', icon: '🧪' },
        { name: 'Maliyetler', path: '/analizler/maliyetler', icon: '📈' },
        { name: 'Raporlar', path: '/raporlar', icon: '📑' },
        { name: 'Mobil Tarayıcı', path: '/scanner', icon: '📱' },
        { name: 'Ayarlar', path: '/ayarlar', icon: '⚙️' },
    ];

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 lg:hidden z-50 flex justify-between items-center safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {leftItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path} className={`flex flex-col items-center gap-1 min-w-[60px] ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.icon(isActive)}
                            <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}

                {/* Center "Menu" Button */}
                <div className="relative -top-6">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-14 h-14 bg-emerald-600 rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-slate-50 ring-2 ring-emerald-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                            <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 tracking-tight">Menü</span>
                </div>

                {rightItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path} className={`flex flex-col items-center gap-1 min-w-[60px] ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.icon(isActive)}
                            <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Expanded Menu Drawer (Bottom Sheet) */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60] lg:hidden animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[2rem] max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-slide-up pb-24 border-t border-slate-200/50">
                        <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setIsMenuOpen(false)}>
                            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                        </div>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Uygulama Menüsü</h3>
                            <button onClick={() => setIsMenuOpen(false)} className="bg-slate-200 text-slate-500 rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-slate-300 transition">✕</button>
                        </div>
                        <div className="p-4 grid grid-cols-4 gap-4">
                            {allMenuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex flex-col items-center gap-2 p-2 rounded-xl active:bg-slate-200 transition group"
                                >
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 group-active:scale-95 transition-transform">
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{item.name}</span>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-4 px-6">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl backdrop-blur-sm">👑</div>
                                    <div>
                                        <p className="font-bold text-sm">FidanX Pro</p>
                                        <p className="text-[10px] text-emerald-100 opacity-90">v2.0.1 • Güncel</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
