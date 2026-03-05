import React from 'react';

export default function LoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans z-50 fixed inset-0">
            <div className="flex flex-col items-center animate-pulse">
                <div className="flex items-center mb-6">
                    <span className="text-emerald-500 font-black text-5xl leading-none">f</span>
                    <span className="text-slate-800 font-bold text-4xl tracking-tighter">idan</span>
                    <span className="text-emerald-400 font-black text-5xl leading-none">X</span>
                </div>
                <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-700 font-bold text-lg tracking-widest uppercase">Veriler Yükleniyor...</p>
            </div>
        </div>
    );
}
