"use client";
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const themes = [
    { id: 'light', name: 'Minimalist', color: '#10b981', icon: '⚪' },
    { id: 'midnight', name: 'Midnight', color: '#38bdf8', icon: '🌑' },
    { id: 'nature', name: 'Nature', color: '#059669', icon: '🌿' },
    { id: 'royal', name: 'Royal', color: '#d97706', icon: '👑' },
    { id: 'steel', name: 'Steel', color: '#475569', icon: '⚙️' },
];

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <div className="flex flex-col gap-2 p-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-1">Görünüm Teması</p>
            <div className="grid grid-cols-5 gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`h-8 flex items-center justify-center rounded-lg transition-all ${theme === t.id
                                ? 'bg-white shadow-lg scale-110 z-10'
                                : 'hover:bg-slate-700 opacity-60 hover:opacity-100'
                            }`}
                        title={t.name}
                    >
                        <span className="text-sm">{t.icon}</span>
                    </button>
                ))}
            </div>
            {/* Visual breakdown for selected theme */}
            {theme && theme !== 'system' && (
                <div className="px-2 mt-1">
                    <p className="text-[9px] font-medium text-emerald-400/80 italic">
                        Aktif: {themes.find(x => x.id === theme)?.name}
                    </p>
                </div>
            )}
        </div>
    );
}
