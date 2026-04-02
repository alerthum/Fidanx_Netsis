"use client";
import React, { useState, useEffect } from 'react';
import { ModalWrapper } from '@/components/uretim/Modals';
import Sidebar from '@/components/Sidebar';

interface RecipeItem {
    materialCode: string;
    materialName: string;
    amount: number;
    unit: string;
    unitPrice: number;
}

interface Recipe {
    id: string;
    name: string;
    description: string;
    items: RecipeItem[];
    totalCost: number;
    createdAt?: string;
}

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
        name: '', description: '', items: []
    });

    const [currentItem, setCurrentItem] = useState<RecipeItem>({
        materialCode: '', materialName: '', amount: 0, unit: 'kg', unitPrice: 0
    });

    const API_URL = '/api';

    useEffect(() => {
        fetchRecipes();
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const res = await fetch(`${API_URL}/netsis/stocks/list`);
            if (!res.ok) return;
            const data = await res.json().catch(() => []);
            setMaterials(Array.isArray(data) ? data.map((s: any) => ({
                code: s.StokKodu,
                name: s.StokAdi,
                currentStock: s.Bakiye,
                unit: s.OlcuBirimi1 || 'Adet',
                price: s.SonBirimFiyat || 0
            })) : []);
        } catch { }
    };

    const fetchRecipes = async () => {
        try {
            const res = await fetch(`${API_URL}/recipes?tenantId=demo-tenant`);
            if (res.ok) {
                const data = await res.json().catch(() => []);
                setRecipes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddItem = () => {
        if (!currentItem.materialCode || currentItem.amount <= 0) return;
        const mat = materials.find(m => m.code === currentItem.materialCode);
        const item: RecipeItem = {
            materialCode: currentItem.materialCode,
            materialName: mat?.name || currentItem.materialName || 'Bilinmeyen',
            amount: currentItem.amount,
            unit: currentItem.unit,
            unitPrice: currentItem.unitPrice || mat?.price || 0
        };

        setNewRecipe(prev => ({
            ...prev,
            items: [...(prev.items || []), item]
        }));
        setCurrentItem({ materialCode: '', materialName: '', amount: 0, unit: 'kg', unitPrice: 0 });
    };

    const handleRemoveItem = (index: number) => {
        setNewRecipe(prev => ({
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index)
        }));
    };

    const openNewModal = () => {
        setEditingId(null);
        setNewRecipe({ name: '', description: '', items: [] });
        setIsModalOpen(true);
    };

    const openEditModal = (recipe: Recipe) => {
        setEditingId(recipe.id);
        setNewRecipe({
            name: recipe.name,
            description: recipe.description,
            items: recipe.items.map(i => ({
                materialCode: i.materialCode,
                materialName: i.materialName,
                amount: i.amount,
                unit: i.unit,
                unitPrice: i.unitPrice || 0
            }))
        });
        setIsModalOpen(true);
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const method = editingId ? 'PATCH' : 'POST';
            const url = editingId
                ? `${API_URL}/recipes/${editingId}?tenantId=demo-tenant`
                : `${API_URL}/recipes?tenantId=demo-tenant`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecipe),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setNewRecipe({ name: '', description: '', items: [] });
                setEditingId(null);
                fetchRecipes();
            } else {
                alert('Kaydetme başarısız.');
            }
        } catch {
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
        } catch {
            alert('Silinemedi.');
        }
    };

    const calcTotal = (items: RecipeItem[]) => items.reduce((s, i) => s + i.amount * (i.unitPrice || 0), 0);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen fx-bg">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white dark:bg-slate-900 border-b fx-border px-4 lg:px-8 py-4 lg:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h1 className="text-xl lg:text-3xl font-black fx-text tracking-tighter uppercase">Reçete & Karışım Merkezi</h1>
                        <p className="text-[10px] lg:text-xs fx-text-secondary font-bold uppercase tracking-widest mt-1">Standart üretim süreçleri için formülasyon yönetimi</p>
                    </div>
                    <button
                        onClick={openNewModal}
                        className="bg-[var(--fx-accent)] text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-90 shadow-xl transition-all active:scale-95 w-full sm:w-auto"
                    >
                        + Yeni Reçete Tanımla
                    </button>
                </header>

                <div className="p-4 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {recipes.map((recipe) => (
                        <div key={recipe.id} className="fx-card !p-8 group hover:border-[var(--fx-accent)] transition-all flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(recipe)}
                                    className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all text-sm"
                                    title="Düzenle"
                                >✏️</button>
                                <button
                                    onClick={() => handleDeleteRecipe(recipe.id)}
                                    className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-sm"
                                    title="Sil"
                                >🗑️</button>
                            </div>
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">🧪</div>
                                <h3 className="font-black text-xl fx-text tracking-tight uppercase">{recipe.name}</h3>
                                {recipe.description && (
                                    <p className="text-xs fx-text-secondary font-medium mt-2 leading-relaxed italic">"{recipe.description}"</p>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 flex-1 border fx-border">
                                <h4 className="text-[10px] uppercase font-black fx-text-secondary tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                                    Karışım Formülü ({recipe.items.length} kalem)
                                </h4>
                                <ul className="space-y-3">
                                    {recipe.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-xs border-b border-slate-200/50 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
                                            <span className="font-bold fx-text uppercase tracking-tight text-[11px]">{item.materialName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-indigo-600 bg-white dark:bg-slate-700 px-3 py-1 rounded-lg border fx-border text-xs">
                                                    {item.amount} <span className="text-[8px] opacity-60 uppercase">{item.unit}</span>
                                                </span>
                                                {item.unitPrice > 0 && (
                                                    <span className="text-[9px] fx-text-secondary font-mono">₺{(item.amount * item.unitPrice).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-6 pt-4 border-t fx-border flex justify-between items-center">
                                <span className="text-[9px] font-black fx-text-secondary uppercase tracking-widest">
                                    {recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString('tr-TR') : ''}
                                </span>
                                {recipe.totalCost > 0 && (
                                    <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl">
                                        ₺{recipe.totalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {recipes.length === 0 && (
                        <div className="col-span-full py-32 text-center fx-card !bg-transparent border-dashed border-2">
                            <div className="text-6xl mb-6 opacity-20">🧪</div>
                            <h3 className="fx-text-secondary font-black uppercase tracking-widest text-lg">Henüz reçete tanımlanmamış</h3>
                            <p className="text-xs fx-text-secondary mt-3 uppercase font-bold tracking-widest opacity-60">Günlük operasyonlarda kullanmak için standart karışımlar ekleyin</p>
                        </div>
                    )}
                </div>

                {/* Reçete Oluştur / Düzenle Modal */}
                <ModalWrapper
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingId(null); }}
                    title={editingId ? "Reçeteyi Düzenle" : "Yeni Reçete Tanımla"}
                    subtitle="Standart karışım oranlarını belirleyerek hata payını azaltın"
                    icon="🧪"
                    large
                >
                    <form onSubmit={handleSaveRecipe} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black fx-text-secondary uppercase tracking-[0.25em] mb-2">REÇETE ADI</label>
                                <input
                                    required
                                    type="text"
                                    value={newRecipe.name}
                                    onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--fx-accent)] outline-none transition-all text-sm font-bold"
                                    placeholder="Örn: 14cm Saksılama Reçetesi"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black fx-text-secondary uppercase tracking-[0.25em] mb-2">AÇIKLAMA</label>
                                <textarea
                                    value={newRecipe.description}
                                    onChange={e => setNewRecipe({ ...newRecipe, description: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[var(--fx-accent)] outline-none transition-all text-sm font-medium"
                                    placeholder="Bu reçete hangi süreçte kullanılacak?"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl border-2 border-dashed fx-border bg-slate-50/30 dark:bg-slate-800/30">
                            <h4 className="text-[10px] uppercase font-black fx-text-secondary tracking-[0.3em] mb-6 text-center">Malzeme Ekle</h4>

                            <div className="grid grid-cols-12 gap-3 mb-6">
                                <div className="col-span-12 lg:col-span-4">
                                    <select
                                        value={currentItem.materialCode}
                                        onChange={e => {
                                            const mat = materials.find(m => m.code === e.target.value);
                                            setCurrentItem({
                                                ...currentItem,
                                                materialCode: e.target.value,
                                                materialName: mat?.name || '',
                                                unitPrice: mat?.price || 0,
                                                unit: mat?.unit?.toLowerCase() || 'kg'
                                            });
                                        }}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-700 border fx-border text-xs font-bold outline-none"
                                    >
                                        <option value="">Malzeme seçin...</option>
                                        {materials.map(m => (
                                            <option key={m.code} value={m.code}>
                                                {m.name} ({m.currentStock || 0} {m.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-4 lg:col-span-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={currentItem.amount || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-700 border fx-border text-sm font-bold text-center outline-none"
                                        placeholder="Miktar"
                                    />
                                </div>
                                <div className="col-span-3 lg:col-span-2">
                                    <select
                                        value={currentItem.unit}
                                        onChange={e => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-700 border fx-border text-xs font-bold outline-none"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="lt">lt</option>
                                        <option value="adet">adet</option>
                                        <option value="m3">m³</option>
                                    </select>
                                </div>
                                <div className="col-span-3 lg:col-span-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={currentItem.unitPrice || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-700 border fx-border text-sm font-bold text-center outline-none"
                                        placeholder="₺ Fiyat"
                                    />
                                </div>
                                <div className="col-span-2 lg:col-span-2">
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="w-full bg-slate-900 dark:bg-indigo-600 text-white px-4 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                                    >
                                        + Ekle
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                                {newRecipe.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-700 p-4 rounded-xl border fx-border">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">📦</span>
                                            <div>
                                                <span className="font-bold fx-text text-sm">{item.materialName}</span>
                                                <span className="text-[9px] fx-text-secondary ml-2">({item.materialCode})</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono font-bold text-indigo-600 text-sm">{item.amount} {item.unit}</span>
                                            {item.unitPrice > 0 && (
                                                <span className="text-xs fx-text-secondary">₺{(item.amount * item.unitPrice).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                                            )}
                                            <button type="button" onClick={() => handleRemoveItem(idx)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all text-sm">✕</button>
                                        </div>
                                    </div>
                                ))}
                                {(!newRecipe.items || newRecipe.items.length === 0) && (
                                    <div className="py-10 text-center">
                                        <p className="text-[10px] font-black fx-text-secondary uppercase tracking-[0.3em]">Kalem listesi boş</p>
                                    </div>
                                )}
                            </div>

                            {(newRecipe.items?.length || 0) > 0 && (
                                <div className="mt-4 pt-4 border-t fx-border flex justify-end">
                                    <span className="text-sm font-black text-emerald-600">
                                        Toplam Maliyet: ₺{calcTotal(newRecipe.items || []).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                                className="flex-1 py-4 fx-text-secondary font-black uppercase tracking-widest text-xs hover:text-rose-500 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !newRecipe.name || !newRecipe.items?.length}
                                className="flex-[2] bg-[var(--fx-accent)] text-white py-4 rounded-2xl font-black shadow-xl hover:opacity-90 transition-all active:scale-95 text-sm uppercase tracking-[0.15em] disabled:opacity-50"
                            >
                                {isLoading ? 'İŞLENİYOR...' : (editingId ? 'GÜNCELLE' : 'KAYDET')}
                            </button>
                        </div>
                    </form>
                </ModalWrapper>
            </main>
        </div>
    );
}
