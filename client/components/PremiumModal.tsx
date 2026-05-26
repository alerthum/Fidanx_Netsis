import React from 'react';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    maxWidthClass?: string;
}

export default function PremiumModal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidthClass = 'max-w-6xl'
}: PremiumModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-[60]">
            <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full h-full max-w-none max-h-none overflow-hidden flex flex-col border border-slate-200`}>
                <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors font-black text-xl"
                    >
                        ×
                    </button>
                </div>
                <div className="overflow-y-auto p-6 lg:p-8 bg-white custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
