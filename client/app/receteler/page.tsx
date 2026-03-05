"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface RecipeItem {
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Reçete & Karışım Yönetimi</h1>
                        <p className="text-xs lg:text-sm text-slate-500 font-medium">Büyük ölçekli uygulamalar için standart reçeteler tanımlayın.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition active:scale-95 w-full sm:w-auto"
                    >
                        + Yeni Reçete Oluştur
                    </button>
                </header>

                <div className="p-4 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {recipes.map((recipe) => (
                        <div key={recipe.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 group hover:border-emerald-200 transition-all flex flex-col relative">
                            <button
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition"
                            >
                                🗑️
                            </button>
                            <div className="mb-4">
                                <h3 className="font-bold text-lg text-slate-800">{recipe.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{recipe.description}</p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 flex-1">
                                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">İçerik Listesi</h4>
                                <ul className="space-y-2">
                                    {recipe.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                            <span className="font-medium text-slate-700">{item.name}</span>
                                            <span className="font-bold text-emerald-600">{item.amount} <span className="text-[10px] text-emerald-400">{item.unit}</span></span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}

                    {recipes.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="text-6xl mb-4 grayscale opacity-20">🧪</div>
                            <h3 className="text-slate-500 font-medium">Henüz reçete tanımlanmamış.</h3>
                            <p className="text-sm text-slate-400 mt-2">Günlük operasyonlarda kullanmak için standart karışımlar ekleyin.</p>
                        </div>
                    )}
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-5xl p-6 sm:p-8 border border-slate-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Yeni Karışım / Reçete Tanımla</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                            </div>

                            <form onSubmit={handleSaveRecipe} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reçete Adı</label>
                                        <input
                                            required
                                            type="text"
                                            value={newRecipe.name}
                                            onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-sm font-bold"
                                            placeholder="Örn: Standart Sulama + Gübre"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Açıklama</label>
                                        <textarea
                                            value={newRecipe.description}
                                            onChange={e => setNewRecipe({ ...newRecipe, description: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-sm"
                                            placeholder="Bu reçetenin kullanım amacı ve detayları..."
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reçete İçeriği Ekle</label>
                                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                                        <select
                                            value={currentItem.materialId}
                                            onChange={e => setCurrentItem({ ...currentItem, materialId: e.target.value })}
                                            className="flex-[2] px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 bg-white"
                                        >
                                            <option value="">Malzeme / Stok Seçin</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} (Stok: {m.currentStock || 0})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={currentItem.amount || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, amount: parseFloat(e.target.value) })}
                                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
                                            placeholder="Miktar"
                                        />
                                        <select
                                            value={currentItem.unit}
                                            onChange={e => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 bg-white"
                                        >
                                            <option value="kg">kg</option>
                                            <option value="gr">gram</option>
                                            <option value="lt">litre</option>
                                            <option value="adet">adet</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition"
                                        >
                                            + Ekle
                                        </button>
                                    </div>

                                    {/* Added Items List in Modal */}
                                    <div className="space-y-2">
                                        {newRecipe.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <span className="font-medium text-slate-700">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-600">{item.amount} {item.unit}</span>
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!newRecipe.items || newRecipe.items.length === 0) && (
                                            <p className="text-center text-slate-400 text-xs italic py-2">Henüz malzeme eklenmedi.</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition active:scale-95 text-lg"
                                >
                                    {isLoading ? 'Kaydediliyor...' : 'Reçeteyi Kaydet'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
