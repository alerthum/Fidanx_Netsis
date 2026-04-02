"use client";
import React from 'react';

export default function TabNavigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
    const tabs = [
        { id: 'partiler', icon: '📝', label: 'Partiler & Şaşırtma', desc: 'Ana üretim takip ekranı' },
        { id: 'toplu', icon: '💧', label: 'Toplu İşlemler', desc: 'Sulama, İlaçlama vb.' },
        { id: 'sera', icon: '🌡️', label: 'Sera & Sıcaklık', desc: 'Konum bazlı iklim takibi' },
        { id: 'maliyet', icon: '📊', label: 'Maliyet & Analiz', desc: 'Kârlılık ve maliyet dağılımı' }
    ];

    return (
        <div className="flex overflow-x-auto hide-scrollbar gap-2 lg:gap-4 p-4 lg:px-8 border-b border-slate-200 bg-white sticky top-[73px] lg:top-[85px] z-20">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 p-3 lg:px-5 lg:py-3.5 rounded-2xl min-w-max transition-all duration-300 border-2 whitespace-nowrap ${isActive
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-100'
                            : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-600'
                            }`}
                    >
                        <div className={`flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl text-lg lg:text-xl transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-md shadow-emerald-300' : 'bg-white text-slate-500 shadow-sm'
                            }`}>
                            {tab.icon}
                        </div>
                        <div className="text-left pr-2 lg:pr-4">
                            <p className={`font-bold text-sm lg:text-base ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>
                                {tab.label}
                            </p>
                            <p className={`text-[10px] lg:text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {tab.desc}
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    );
}
