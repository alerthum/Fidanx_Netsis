"use client";
import React, { useState } from 'react';

export default function TurkeyMap({ data }: { data?: Record<string, number> }) {
    const defaultRegions = [
        { id: 'marmara', name: 'Marmara', d: "M20,50 Q40,30 80,45 L85,85 Q60,105 20,95 Z" },
        { id: 'karadeniz', name: 'Karadeniz', d: "M85,45 Q150,30 240,45 L245,75 Q180,65 85,85 Z" },
        { id: 'ege', name: 'Ege', d: "M20,100 Q40,110 55,120 L45,170 Q20,175 15,160 Z" },
        { id: 'ic-anadolu', name: 'İç Anadolu', d: "M85,90 Q120,80 165,90 L160,145 Q110,155 75,145 Z" },
        { id: 'akdeniz', name: 'Akdeniz', d: "M55,145 Q120,140 180,150 L175,185 Q110,195 50,180 Z" },
        { id: 'dogu', name: 'Doğu Anadolu', d: "M165,90 Q220,90 250,105 L240,160 Q200,165 170,145 Z" },
        { id: 'guneydogu', name: 'Güneydoğu Anadolu', d: "M175,150 Q220,150 245,160 L240,185 Q210,195 180,185 Z" },
    ];

    const regions = defaultRegions.map(r => ({
        ...r,
        value: data && data[r.id] ? `₺${data[r.id].toLocaleString()}` : '₺0'
    }));
    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <div className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50/30 rounded-2xl overflow-hidden p-6">
            <svg
                viewBox="0 0 260 200"
                className="w-full h-auto max-h-[350px] drop-shadow-2xl transition-all duration-700"
            >
                <g>
                    {regions.map((region) => (
                        <path
                            key={region.id}
                            d={region.d}
                            onMouseEnter={() => setHovered(region.id)}
                            onMouseLeave={() => setHovered(null)}
                            className={`transition-all duration-500 cursor-pointer stroke-white stroke-[0.5] ${hovered === region.id
                                ? 'fill-emerald-400 scale-[1.02] filter drop-shadow-xl'
                                : 'fill-emerald-600'
                                }`}
                            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                        />
                    ))}
                </g>
            </svg>

            {/* Tooltip Overlay - Absolute within the card */}
            <div className={`absolute bottom-4 left-4 right-4 bg-slate-900 border border-slate-700 text-white p-4 rounded-xl shadow-2xl transition-all duration-500 flex items-center gap-4 backdrop-blur-xl ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-xl border border-emerald-500/30">🌿</div>
                <div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                        {hovered ? regions.find(r => r.id === hovered)?.name : ''}
                    </p>
                    <p className="text-sm font-bold tracking-tight">
                        {hovered ? regions.find(r => r.id === hovered)?.value : '₺0'} Verim
                    </p>
                </div>
            </div>

            {/* Background Label */}
            {!hovered && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                    <span className="text-9xl font-black text-slate-900 uppercase -rotate-12">TÜRKİYE</span>
                </div>
            )}
        </div>
    );
}
