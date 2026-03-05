"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Maliyet Analizi artık Raporlar sayfasında bir tab. Eski URL yönlendirmesi. */
export default function MaliyetAnalizRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/raporlar?tab=cost');
    }, [router]);
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 text-sm font-medium">Yönlendiriliyor...</p>
            </div>
        </div>
    );
}
