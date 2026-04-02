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
        <aside className="hidden lg:flex sticky top-0 left-0 h-screen z-40 w-[270px] fx-sidebar shrink-0 flex-col">
            <div className="p-6 border-b border-[var(--fx-sidebar-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center">
                        <span className="font-black text-3xl leading-none text-[var(--fx-accent)]">f</span>
                        <span className="font-bold text-2xl tracking-tighter text-[var(--fx-sidebar-logo-text)]">idan</span>
                        <span className="font-black text-3xl leading-none opacity-80 text-[var(--fx-accent)]">X</span>
                    </div>
                    <span className="text-[9px] text-[#ffffff] dark:text-slate-400 px-2 py-0.5 rounded uppercase font-bold self-end mb-1 bg-[var(--fx-accent)] dark:bg-slate-800 shadow-sm">PRO</span>
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
                                        className="flex items-center justify-between w-full gap-3 px-4 py-3 fx-sidebar-group text-sm font-semibold transition-all text-left group"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">{group.icon}</span>
                                            <span>{group.label}</span>
                                        </span>
                                        <span className="text-[10px] transition-transform opacity-50 font-mono">
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                    </button>
                                    {isExpanded && (
                                        <div className="ml-5 mt-1 pl-4 border-l fx-border space-y-1">
                                            {group.items.map((item) => {
                                                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        href={item.path}
                                                        className={`flex items-center gap-3 px-3 py-2.5 transition-all text-sm font-medium fx-sidebar-link ${isActive ? 'active' : ''}`}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></div>
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
                                    className={`flex items-center gap-3 px-4 py-3 transition-all text-sm font-semibold group fx-sidebar-link ${pathname === group.items[0].path ? 'active' : ''}`}
                                >
                                    <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">{group.icon}</span>
                                    <span>{group.items[0].name}</span>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 fx-sidebar-footer space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--fx-sidebar-border)] bg-[var(--fx-sidebar-hover)] hover:bg-[var(--fx-sidebar-hover)]/80 transition cursor-pointer">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-[var(--fx-accent)] shadow-md">A</div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-extrabold truncate fx-text-primary">Admin</p>
                        <p className="text-[10px] uppercase font-bold text-[var(--fx-text-dim)]">Süper Yetkili</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
