"use client";
import React, { useState, useEffect } from 'react';
import { ModalWrapper } from '@/components/uretim/Modals';
import Sidebar from '@/components/Sidebar';

interface RecipeItem {
    // ... existing interface ...
    materialId?: string;
    name: string;
    amount: number;
    unit: string;
}

interface Recipe {
    id: string;
    name: string;
    description: string;
    items: RecipeItem[];
}

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
        name: '',
        description: '',
        items: []
    });

    // Item Input State
    const [currentItem, setCurrentItem] = useState<RecipeItem>({ materialId: '', name: '', amount: 0, unit: 'kg' });

    const API_URL = '/api';

    useEffect(() => {
        fetchRecipes();
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/stocks/list`);
            const data = await res.json();
            setMaterials(Array.isArray(data) ? data.map((s: any) => ({
                id: s.StokKodu,
                name: s.StokAdi,
                currentStock: s.Bakiye
            })) : []);
        } catch (err) { }
    };

    const fetchRecipes = async () => {
        try {
            const res = await fetch(`${API_URL}/recipes?tenantId=demo-tenant`);
            const data = await res.json();
            setRecipes(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddItem = () => {
        if (currentItem.materialId && currentItem.amount > 0) {
            const selectedMaterial = materials.find(m => m.id === currentItem.materialId);
            const itemToAdd = {
                ...currentItem,
                name: selectedMaterial ? selectedMaterial.name : currentItem.name
            };

            setNewRecipe({
                ...newRecipe,
                items: [...(newRecipe.items || []), itemToAdd]
            });
            setCurrentItem({ materialId: '', name: '', amount: 0, unit: 'kg' });
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...(newRecipe.items || [])];
        newItems.splice(index, 1);
        setNewRecipe({ ...newRecipe, items: newItems });
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/recipes?tenantId=demo-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecipe),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setNewRecipe({ name: '', description: '', items: [] });
                fetchRecipes();
            } else {
                alert('Kaydetme başarısız.');
            }
        } catch (err) {
            alert('Hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRecipe = async (id: string) => {
        if (!confirm('Bu reçeteyi silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/recipes/${id}?tenantId=demo-tenant`, { method: 'DELETE' });
            fetchRecipes();
        } catch (err) {
            alert('Silinemedi.');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen fx-bg">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b fx-border px-4 lg:px-8 py-4 lg:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tighter uppercase">Reçete & Karışım Merkezi</h1>
                        <p className="text-[10px] lg:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Standart üretim süreçleri için formülasyon yönetimi</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 w-full sm:w-auto"
                    >
                        + Yeni Reçete Tanımla
                    </button>
                </header>

                <div className="p-4 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {recipes.map((recipe) => (
                        <div key={recipe.id} className="fx-card !p-8 group hover:border-indigo-400 transition-all flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDeleteRecipe(recipe.id)}
                                    className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                    title="Reçeteyi Sil"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">🧪</div>
                                <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">{recipe.name}</h3>
                                <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed italic">"{recipe.description}"</p>
                            </div>

                            <div className="bg-slate-50 rounded-[2rem] p-6 flex-1 border fx-border">
                                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                                    Karışım Formülü
                                </h4>
                                <ul className="space-y-3">
                                    {recipe.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                                            <span className="font-black text-slate-700 uppercase tracking-tight">{item.name}</span>
                                            <span className="font-mono font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border fx-border shadow-xs">
                                                {item.amount} <span className="text-[8px] opacity-60 uppercase">{item.unit}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-8 pt-6 border-t fx-border flex justify-between items-center group-hover:translate-x-1 transition-transform">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ID: {recipe.id.slice(0, 8)}...</span>
                                <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Detayları Gör →</button>
                            </div>
                        </div>
                    ))}

                    {recipes.length === 0 && (
                        <div className="col-span-full py-32 text-center fx-card !bg-transparent border-dashed border-2">
                            <div className="text-8xl mb-8 grayscale opacity-10 animate-bounce group-hover:animate-none">🧪</div>
                            <h3 className="text-slate-400 font-black uppercase tracking-widest text-lg">Henüz reçete tanımlanmamış</h3>
                            <p className="text-xs text-slate-300 mt-4 uppercase font-bold tracking-widest">Günlük operasyonlarda kullanmak için standart karışımlar ekleyin</p>
                        </div>
                    )}
                </div>

                <ModalWrapper
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Yeni Reçete Tanımla"
                    subtitle="Standart karışım oranlarını belirleyerek hata payını azaltın"
                    icon="🧪"
                    large
                >
                    <form onSubmit={handleSaveRecipe} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3">REÇETE ADI / TANIMLAYICI</label>
                                <input
                                    required
                                    type="text"
                                    value={newRecipe.name}
                                    onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-black tracking-tight"
                                    placeholder="Örn: İlkbahar Gübreleme Karışımı"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3">DETAYLI AÇIKLAMA</label>
                                <textarea
                                    value={newRecipe.description}
                                    onChange={e => setNewRecipe({ ...newRecipe, description: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                    placeholder="Bu karışım hangi tür fidanlar için ve hangi dönemde kullanılmalı?"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="p-10 rounded-[3rem] border-2 border-dashed border-slate-100 bg-slate-50/30">
                            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] mb-8 text-center italic">Karışım Kalemlerini Belirleyin</h4>

                            <div className="flex flex-col lg:flex-row gap-4 mb-10">
                                <div className="flex-[3]">
                                    <select
                                        value={currentItem.materialId}
                                        onChange={e => setCurrentItem({ ...currentItem, materialId: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                    >
                                        <option value="">MALZEME SEÇİN...</option>
                                        {materials.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} (BAKİYE: {m.currentStock || 0})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={currentItem.amount || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, amount: parseFloat(e.target.value) })}
                                        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 text-sm font-black text-center outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                        placeholder="MİKTAR"
                                    />
                                </div>
                                <div className="flex-1">
                                    <select
                                        value={currentItem.unit}
                                        onChange={e => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="lt">lt</option>
                                        <option value="adet">adet</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                                >
                                    + EKLE
                                </button>
                            </div>

                            {/* Added Items List in Modal */}
                            <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {newRecipe.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">📦</div>
                                            <span className="font-black text-slate-800 text-sm tracking-tight uppercase">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-black text-indigo-600 font-mono bg-indigo-50 px-4 py-2 rounded-xl text-base">
                                                {item.amount} <span className="text-[10px] opacity-60">{item.unit}</span>
                                            </span>
                                            <button type="button" onClick={() => handleRemoveItem(idx)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">✕</button>
                                        </div>
                                    </div>
                                ))}
                                {(!newRecipe.items || newRecipe.items.length === 0) && (
                                    <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] font-sans italic">Kalem listesi henüz boş</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-rose-500 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !newRecipe.name || !newRecipe.items?.length}
                                className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 text-lg uppercase tracking-[0.2em] disabled:opacity-50"
                            >
                                {isLoading ? 'İŞLENİYOR...' : 'REÇETEYİ SİSTEME KAYDET'}
                            </button>
                        </div>
                    </form>
                </ModalWrapper>
            </main>
        </div>
    );
}
