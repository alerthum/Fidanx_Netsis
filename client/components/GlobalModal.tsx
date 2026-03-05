"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function GlobalModal() {
    const [modal, setModal] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Override global alert
        const originalAlert = window.alert;
        window.alert = (message: any) => {
            const msgStr = String(message);
            const lower = msgStr.toLowerCase();
            let type: 'success' | 'error' | 'warning' | 'info' = 'info';

            if (lower.includes('başarı') || lower.includes('mükemmel') || lower.includes('kaydedildi') || lower.includes('eklendi')) {
                type = 'success';
            } else if (lower.includes('hata') || lower.includes('başarısız') || lower.includes('bulunamadı')) {
                type = 'error';
            } else if (lower.includes('silindi') || lower.includes('kaldırıldı') || lower.includes('uyarı')) {
                type = 'warning';
            }

            // For explicitly passing type via custom prefixes
            let finalMsg = msgStr;
            if (msgStr.startsWith('SUCCESS:')) {
                type = 'success';
                finalMsg = msgStr.replace('SUCCESS:', '');
            } else if (msgStr.startsWith('ERROR:')) {
                type = 'error';
                finalMsg = msgStr.replace('ERROR:', '');
            } else if (msgStr.startsWith('WARNING:')) {
                type = 'warning';
                finalMsg = msgStr.replace('WARNING:', '');
            } else if (msgStr.startsWith('INFO:')) {
                type = 'info';
                finalMsg = msgStr.replace('INFO:', '');
            }

            setModal({ message: finalMsg, type });
        };

        return () => {
            window.alert = originalAlert;
        };
    }, []);

    if (!mounted || !modal) return null;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const colors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        error: 'bg-rose-50 border-rose-200 text-rose-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900'
    };

    const borderColors = {
        success: 'border-emerald-300',
        error: 'border-rose-300',
        warning: 'border-amber-300',
        info: 'border-blue-300'
    };

    const btnColors = {
        success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
        error: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
        info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[999999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-4 bg-white ${borderColors[modal.type]}`}>
                <div className={`p-8 text-center border-b ${colors[modal.type].split(' ')[0]}`}>
                    <div className="text-5xl mb-4 transform transition-transform hover:scale-110 duration-300">{icons[modal.type]}</div>
                    <h3 className="text-xl font-black tracking-tight">{
                        modal.type === 'success' ? 'Başarılı İşlem!' :
                            modal.type === 'error' ? 'Hata / Başarısız' :
                                modal.type === 'warning' ? 'Uyarı (İşlem)' : 'Bilgilendirme'
                    }</h3>
                    <p className="text-sm font-medium mt-3 opacity-90 leading-relaxed text-slate-700">{modal.message}</p>
                </div>
                <div className="p-5 bg-slate-50 flex justify-center">
                    <button
                        onClick={() => setModal(null)}
                        className={`px-10 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${btnColors[modal.type]}`}
                    >
                        Tamam, Anladım
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
