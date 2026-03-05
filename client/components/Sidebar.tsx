"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Geri almak için: Sidebar.flat.tsx kullanın veya import'u değiştirin */

type MenuItem = { name: string; path: string; icon: string };
type MenuGroup = {
    id: string;
    label: string;
    icon: string;
    items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
    {
        id: 'ana',
        label: 'Ana Menü',
        icon: '📊',
        items: [{ name: 'Kontrol Paneli', path: '/', icon: '📊' }],
    },
    {
        id: 'uretim',
        label: 'Üretim',
        icon: '🚜',
        items: [
            { name: 'Üretim Takibi', path: '/uretim', icon: '🚜' },
            { name: 'Operasyon & Hareket', path: '/hareketler', icon: '🚚' },
            { name: 'Reçete Yönetimi', path: '/receteler', icon: '🧪' },
            { name: 'Mobil Tarayıcı', path: '/scanner', icon: '📱' },
        ],
    },
    {
        id: 'finans',
        label: 'Finans',
        icon: '💰',
        items: [
            { name: 'Satınalma', path: '/satinalma', icon: '🛒' },
            { name: 'Satış & CRM', path: '/satislar', icon: '💰' },
            { name: 'Finans & Giderler', path: '/finans', icon: '💎' },
        ],
    },
    {
        id: 'tanimlamalar',
        label: 'Tanımlamalar',
        icon: '📋',
        items: [
            { name: 'Stok Yönetimi', path: '/stoklar', icon: '🌱' },
            { name: 'Firmalar', path: '/firmalar', icon: '🏢' },
        ],
    },
    {
        id: 'raporlar',
        label: 'Raporlar',
        icon: '📑',
        items: [{ name: 'Gelişmiş Raporlar', path: '/raporlar', icon: '📑' }],
    },
    {
        id: 'ayarlar',
        label: 'Ayarlar',
        icon: '⚙️',
        items: [{ name: 'Ayarlar', path: '/ayarlar', icon: '⚙️' }],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(menuGroups.map((g) => [g.id, true]))
    );

    const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

    return (
        <aside className="hidden lg:flex sticky top-0 left-0 h-screen z-40 w-64 bg-[#1e293b] text-slate-300 flex-col border-r border-slate-700 shrink-0">
            <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <div className="flex items-center">
                        <span className="text-emerald-500 font-black text-3xl leading-none">f</span>
                        <span className="text-white font-bold text-2xl tracking-tighter">idan</span>
                        <span className="text-emerald-400 font-black text-3xl leading-none">X</span>
                    </div>
                    <span className="text-[9px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase font-bold self-end mb-1">PRO</span>
                </div>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                {menuGroups.map((group) => {
                    const isExpanded = expanded[group.id];
                    const hasChildren = group.items.length > 1;

                    return (
                        <div key={group.id} className="mb-2">
                            {hasChildren ? (
                                <>
                                    <button
                                        onClick={() => toggle(group.id)}
                                        className="flex items-center justify-between w-full gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 hover:text-white transition-all text-left"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="text-lg">{group.icon}</span>
                                            <span>{group.label}</span>
                                        </span>
                                        <span className="text-slate-500 text-[10px] transition-transform">
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                    </button>
                                    {isExpanded && (
                                        <div className="ml-2 mt-1 pl-4 border-l border-slate-700/60 space-y-0.5">
                                            {group.items.map((item) => {
                                                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        href={item.path}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium group ${isActive
                                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                            : 'hover:bg-slate-800 hover:text-white'
                                                            }`}
                                                    >
                                                        <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                                                        <span>{item.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={group.items[0].path}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium group ${pathname === group.items[0].path
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                        : 'hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">{group.icon}</span>
                                    <span>{group.items[0].name}</span>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/40 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg shadow-inner">A</div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">Admin Kullanıcı</p>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Süper Yetkili</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
