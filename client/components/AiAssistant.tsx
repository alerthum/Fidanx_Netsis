"use client";
import React, { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3201/api";

type AiMessage = {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

export default function AiAssistant() {
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState<any>(null);
    const [question, setQuestion] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState<AiMessage[]>([]);

    const aiInsights = [
        { title: 'Tedarikçi Analizi', message: 'Uşak Rulman\'dan yapılan son 3 alımda %15 fiyat artışı var. Alternatifleri değerlendirebilirsiniz.', icon: '📉', detail: 'Son 3 ayın fatura dökümleri incelendiğinde, birim fiyatın ₺120\'den ₺138\'e yükseldiği tespit edilmiştir. Aynı bölgedeki diğer tedarikçilerin ortalama fiyatı ₺125 seviyesindedir.' },
        { title: 'Tahsilat Önerisi', message: 'Assa Elektrik\'ten 34 bin TL alacağın vadesi 5 gün geçti. Hatırlatma e-postası taslağı hazır.', icon: '✉️', detail: 'Müşterinin ödeme alışkanlıkları incelendiğinde genellikle 7-10 gün gecikmeli ödeme yaptığı görülmektedir. Ancak 5. gün hatırlatması %20 oranında tahsilatı hızlandırmaktadır.' },
        { title: 'Nakit Akışı', message: 'Gelecek ayki çek ödemeleri kasa mevcudunu aşabilir. Ekstra tahsilatlara yoğunlaşmanız önerilir.', icon: '⚠️', detail: 'Nisan 2026 çek ödeme toplamı: ₺450.000. Beklenen tahsilat: ₺380.000. Eksik kalan ₺70.000 için vadesi gelmemiş 3 adet senet bulunmaktadır.' }
    ];

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const q = question.trim();
        if (!q) return;

        const now = new Date().toISOString();
        setMessages(prev => [...prev, { role: "user", content: q, createdAt: now }]);
        setIsThinking(true);

        try {
            const res = await fetch(`${API_URL}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q }),
            });

            if (res.ok) {
                const data = await res.json();
                const answer: string = data.answer || "Sunucudan anlamlı bir cevap dönmedi.";
                const createdAt: string = data.createdAt || new Date().toISOString();
                setMessages(prev => [...prev, { role: "assistant", content: answer, createdAt }]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        role: "assistant",
                        content: "AI servisine bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                        createdAt: new Date().toISOString(),
                    },
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sunucuya ulaşılamadı. İnternet veya API ayarlarını kontrol edin.",
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsThinking(false);
            setQuestion("");
        }
    };

    return (
        <>
            {/* FidanX AI Assistant UI */}
            <button
                onClick={() => setIsAIOpen(true)}
                className="fixed bottom-24 lg:bottom-12 right-6 lg:right-12 w-16 lg:w-20 h-16 lg:h-20 bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition-all z-[100] border-4 border-white animate-pulse"
                title="FidanX AI"
            >
                🤖
            </button>

            {isAIOpen && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-[110] border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#6366f1] rounded-xl flex items-center justify-center text-xl shadow-inner">🤖</div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest">FidanX AI Agent</h3>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Karar Destek Sistemi</p>
                            </div>
                        </div>
                        <button onClick={() => setIsAIOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
                        <div className="bg-[#4f46e5] text-white p-5 rounded-2xl text-sm font-medium shadow-xl relative">
                            Merhaba! Ben FidanX AI. Senin için verileri taradım ve bazı önemli analizlerim var. Şirketin finansal ve operasyonel sağlığı için şu adımları değerlendirebilirsin:
                            <div className="absolute top-full left-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[#4f46e5]"></div>
                        </div>

                        {isThinking && (
                            <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-indigo-100 animate-pulse">
                                <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-xs">🧪</div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
                            </div>
                        )}

                        <div className="space-y-4 pt-4">
                            {aiInsights.map((insight, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 transition-all group hover:shadow-md">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xl">{insight.icon}</span>
                                        <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">{insight.title}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{insight.message}</p>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => setSelectedInsight(insight)}
                                            className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition"
                                        >
                                            Detay Göster
                                        </button>
                                        <button className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 px-3 py-1 rounded-lg transition">Uygula (Dene)</button>
                                    </div>
                                </div>
                            ))}

                            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/5">
                                <div className="absolute top-0 right-0 p-4 opacity-5 text-7xl -rotate-12">💡</div>
                                <h4 className="font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                                    Yapay Zekaya Danış
                                </h4>
                                <p className="text-[11px] opacity-60 mb-6 leading-relaxed">"Bugün en çok hangi tür fidan sattım?" veya "Netsis'teki 320 carilerin toplam borcu nedir?"</p>

                                <form onSubmit={handleSubmit} className="relative space-y-3">
                                    <textarea
                                        rows={Math.min(5, question.split('\n').length)}
                                        value={question}
                                        onChange={(e) => {
                                            setQuestion(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        placeholder="Sorunu buraya yazabilirsin..."
                                        className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-xs outline-none focus:bg-white/20 placeholder:text-white/30 transition-all resize-none min-h-[100px]"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            disabled={isThinking || !question.trim()}
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-900/50 transition-all flex items-center gap-2"
                                        >
                                            {isThinking ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                                </span>
                                            ) : 'Analiz Et & Gönder'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {messages.length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Son Konuşma</h5>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {messages.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-xs rounded-2xl px-3 py-2 ${
                                                    m.role === "user"
                                                        ? "bg-emerald-50 text-emerald-800 self-end"
                                                        : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                <div className="font-bold mb-0.5">
                                                    {m.role === "user" ? "Sen" : "FidanX AI"}
                                                </div>
                                                <div className="whitespace-pre-line">{m.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100 text-center">
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">fidanx ai engine v1.1.0 • endüstri 5.0 hazir</p>
                    </div>
                </div>
            )}

            {/* Insight Details Modal */}
            {selectedInsight && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[1000]">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-8 pb-0 flex justify-between items-start">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                                {selectedInsight.icon}
                            </div>
                            <button onClick={() => setSelectedInsight(null)} className="text-2xl text-slate-300 hover:text-rose-500">✕</button>
                        </div>
                        <div className="p-8 pt-6">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{selectedInsight.title}</h3>
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6">Detaylı Analiz Raporu</p>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                    "{selectedInsight.detail || selectedInsight.message}"
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedInsight(null)}
                                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-xl"
                            >
                                Anladım, Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
