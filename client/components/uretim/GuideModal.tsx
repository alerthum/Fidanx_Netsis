"use client";
import React from 'react';

export default function GuideModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-6xl h-[95vh] shadow-2xl flex flex-col relative overflow-hidden border border-white/20">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-sm border border-indigo-100 flex-shrink-0">
                            📖
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">FidanX Üretim Sistemi</h3>
                            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Kullanım Kılavuzu & Akış Şeması</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                    <div className="max-w-5xl mx-auto space-y-16 pb-16">

                        {/* Akış Şeması Görseli */}
                        <section>
                            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg">🗺️</span>
                                Ana Akış Şeması (Uçtan Uca)
                            </h4>
                            <div className="bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 p-32 bg-emerald-500/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                                <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 relative z-10">
                                    {/* Adım 0 & 1 */}
                                    <div className="flex-1 flex flex-col space-y-6">
                                        <div className="bg-slate-800/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">0. İlk Kurulum</h5>
                                            <div className="bg-slate-700/50 p-3 rounded-lg text-xs text-slate-300 font-medium mb-2 border border-slate-600">⚙️ Ayarlar (Konum, Safha)</div>
                                            <div className="bg-slate-700/50 p-3 rounded-lg text-xs text-slate-300 font-medium border border-slate-600">🔗 Netsis Bağlantısı</div>
                                        </div>

                                        <div className="flex justify-center text-slate-600">↓</div>

                                        <div className="bg-emerald-900/40 p-5 rounded-2xl border border-emerald-800/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                            <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">1. Bitki Girişi</h5>
                                            <div className="bg-emerald-800/50 p-3 rounded-lg text-xs text-emerald-100 font-medium border border-emerald-700/50">
                                                📥 <b>+ Yeni Üretime Başla</b><br />
                                                <span className="text-[10px] opacity-70">Netsis stok seç, Miktar ve Maliyet gir. LOT oluşur.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col justify-center items-center text-slate-600">→</div>
                                    <div className="md:hidden flex justify-center text-slate-600">↓</div>

                                    {/* Adım 2 */}
                                    <div className="flex-[1.5] bg-blue-900/30 p-5 w-full rounded-2xl border border-blue-800/50 flex flex-col">
                                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">2. Büyütme Süreci (Günlük İşlemler)</h5>

                                        <div className="space-y-3 flex-1">
                                            <div className="bg-blue-800/40 p-3 rounded-lg border border-blue-700/50 flex gap-3">
                                                <div className="text-xl">💧</div>
                                                <div className="text-xs text-blue-100">
                                                    <b>Toplu Giderler:</b> Sulama, Gübre, İşçilik.<br />
                                                    <span className="text-[10px] text-blue-300">Konumdaki tüm partilere otomatik orantısal dağılır.</span>
                                                </div>
                                            </div>

                                            <div className="bg-blue-800/40 p-3 rounded-lg border border-blue-700/50 flex gap-3">
                                                <div className="text-xl">🌡️</div>
                                                <div className="text-xs text-blue-100">
                                                    <b>Sera & İklim:</b> Isı, Nem, Enerji Tüketimi.<br />
                                                    <span className="text-[10px] text-blue-300">Sabah, öğle, akşam verileri izlenir.</span>
                                                </div>
                                            </div>

                                            <div className="bg-rose-900/40 p-3 rounded-lg border border-rose-800/50 flex gap-3">
                                                <div className="text-xl">💀</div>
                                                <div className="text-xs text-rose-100">
                                                    <b>Fire Kaydı:</b> Kuruyan/Ölen Bitkiler.<br />
                                                    <span className="text-[10px] text-rose-300">Miktar düşer, kalan bitkilerin BİRİM MALİYETİ artar.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col justify-center items-center text-slate-600">→</div>
                                    <div className="md:hidden flex justify-center text-slate-600">↓</div>

                                    {/* Adım 3 & 4 */}
                                    <div className="flex-1 flex flex-col space-y-6">
                                        <div className="bg-amber-900/30 p-5 rounded-2xl border border-amber-800/50">
                                            <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex justify-between">
                                                <span>3. Şaşırtma</span>
                                                <span className="text-amber-500 text-lg leading-none -mt-1">🔄</span>
                                            </h5>
                                            <div className="bg-amber-800/50 p-3 rounded-lg text-xs text-amber-100 font-medium border border-amber-700/50">
                                                Saksı Değişimi veya Safha Geçişi.<br />
                                                <span className="text-[10px] opacity-70">Hedef safha seçilir, ek saksı/toprak maliyeti girilir. <b>Yeni bir LOT oluşur.</b></span>
                                            </div>
                                        </div>

                                        <div className="flex justify-center text-slate-600">↓</div>

                                        <div className="bg-violet-900/40 p-5 rounded-2xl border border-violet-800/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] flex-1 flex flex-col justify-center">
                                            <h5 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-1"><span className="text-sm">🏷️</span> 4. Satış</h5>
                                            <div className="bg-violet-800/50 p-3 rounded-lg text-xs text-violet-100 font-medium border border-violet-700/50">
                                                Her safhada direkt satış yapılabilir. Kâr tahmini anlık hesaplanır ve Netsis faturasına yansır.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Adım Adım Akış Tablosu */}
                        <section>
                            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg">📋</span>
                                Sistem Adımları Detayları
                            </h4>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">#</th>
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Adım</th>
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Menü / Sayfa</th>
                                            <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Açıklama</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">0</td>
                                            <td className="p-4 font-bold text-slate-800">İlk Kurulum</td>
                                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">/ayarlar</span></td>
                                            <td className="p-4 text-slate-600">Sera/konumları tanımlayın, bitki safhalarını belirleyin.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">1</td>
                                            <td className="p-4 font-bold text-slate-800">Parti (Üretim) Girişi</td>
                                            <td className="p-4"><span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-mono border border-emerald-100">/uretim &gt; Partiler</span></td>
                                            <td className="p-4 text-slate-600">Netsis stok kartını (ana tür) seçip miktarı ve alış maliyetini girerek <b>yeni bir LOT (Parti) oluşturun.</b></td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">2a</td>
                                            <td className="p-4 font-bold text-slate-800">Toplu İşlemler / Gider</td>
                                            <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-mono border border-blue-100">/uretim &gt; Toplu İşlemler</span></td>
                                            <td className="p-4 text-slate-600">Seçilen Konumdaki (Sera 1 vb.) <b>tüm fidanlara</b> toplu ilaçlama, sulama veya işçilik maliyeti uygulayın. Sistem maliyeti eşit dağıtır.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">2b</td>
                                            <td className="p-4 font-bold text-slate-800">Sıcaklık ve Sera Takibi</td>
                                            <td className="p-4"><span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-xs font-mono border border-amber-100">/uretim &gt; Sera / Sıcaklık</span></td>
                                            <td className="p-4 text-slate-600">Konum ve Periyot (Sabah/Öğle/Akşam) seçerek sıcaklık, nem ve mazot tüketimi verilerini işleyin.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">2c</td>
                                            <td className="p-4 font-bold text-slate-800 text-red-600 flex items-center gap-1"><span className="text-xl leading-none -mt-1">💀</span> Fire / Ölüm Kaydı</td>
                                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">/uretim &gt; Partiler</span></td>
                                            <td className="p-4 text-slate-600">Kuruyan veya hastalanan bitkileri düşün. Partinin genel maliyeti aynı kalırken, kalan fidanların <b>birim maliyeti yükselir.</b></td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">3</td>
                                            <td className="p-4 font-bold text-slate-800 text-amber-600 flex items-center gap-1"><span className="text-xl leading-none -mt-1">🔄</span> Şaşırtma (Saksı Değişimi)</td>
                                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">/uretim &gt; Partiler</span></td>
                                            <td className="p-4 text-slate-600">Bitki büyüdüğünde safha geçişi yapın (örn: Tepsi -&gt; 3L Saksı). <b>YENİ bir LOT numarasıyla alt parti oluşur.</b> Kullanılan saksı maliyetini ekleyin.</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50">
                                            <td className="p-4 font-black text-slate-300">4</td>
                                            <td className="p-4 font-bold text-slate-800 text-emerald-600 flex items-center gap-1"><span className="text-xl leading-none -mt-1">🏷️</span> Satış (Netsis)</td>
                                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">/uretim &gt; Partiler</span></td>
                                            <td className="p-4 text-slate-600">Satışı gerçekleştirin. Sistem birim satış fiyatınızdan son partinin maliyetini çıkarıp size anlık tahmini KÂR gösterecektir.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Temel Kavramlar */}
                        <section>
                            <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-lg">💡</span>
                                Temel Kavramlar & Püf Noktalar
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h5 className="font-black text-slate-800 mb-2">📦 Parti (LOT) Nedir?</h5>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        FidanX sisteminde ana takip elemanıdır. Aynı anda, aynı işlemden geçen bitkiler grubudur. Şaşırtma yapıldıkça her bitki kendine özel yeni bir LOT numarası <span className="font-mono text-xs bg-slate-200 px-1 rounded">(LOT-2026-15-S)</span> alır.
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h5 className="font-black text-slate-800 mb-2">🔄 Şaşırtma Neden Önemlidir?</h5>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Eski sistemdeki gibi "2 Litre Saksılı Fidan" diye ayrı stok kartları açmak yerine, FidanX ile <b className="text-amber-600">Tek Stok Kartı + Çoklu Aşama</b> yönetimi yaparsınız. Şaşırtma, bu aşamalar arası geçiştir (Alt Parti üretir).
                                    </p>
                                </div>
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <h5 className="font-black text-red-800 mb-2">💀 Fire (Ölüm) Maliyeti Nasıl Etkiler?</h5>
                                    <p className="text-sm text-red-700 leading-relaxed">
                                        1000 adet fidanın olduğu partiye 1000₺ masraf ettiniz. Birim maliyet <b className="font-bold underline">1₺</b>'dir. Eğer 500 adet bitki hastalıktan ölürse, partinin toplam masrafı (1000₺) değişmeyeceği için, kalan 500 fidanın her birinin yeni birim maliyeti <b className="font-bold underline">2₺</b>'ye otomatik fırlar.
                                    </p>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                    <h5 className="font-black text-emerald-800 mb-2">💰 Toplu İşlem & Kümülatif Dağılım</h5>
                                    <p className="text-sm text-emerald-700 leading-relaxed">
                                        "Açık Alan" konumundaki tüm fidanları bugün suladınız. Maliyeti 5.000₺. Toplu işlemler sekmesine girip 5.000₺'yi girdiğinizde, sistem o konumdaki <b>Canlı Fidan Adedi Toplamını</b> hesaplar ve her fidanın partisine hakkaniyetli pay oranında kuruşu kuruşuna maliyeti bindirir.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Simülasyon Senaryosu (Vaka Analizi) */}
                        <section className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>

                            <h4 className="text-[20px] font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">🌱</span>
                                Örnek Üretim Simülasyonu (Vaka Analizi)
                            </h4>
                            <p className="text-indigo-700 text-sm font-medium mb-8 pl-14">Bu bölüm sistemin çalışma mantığını anlamanız için kurgusal bir örnektir. Herhangi bir veri girmemektedir.</p>

                            <div className="space-y-4">
                                {/* Adım 1: Alış */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative group hover:border-indigo-300 transition-colors">
                                    <div className="md:w-32 flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                                        <div className="text-3xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">01</div>
                                        <div className="text-xs font-bold text-slate-400 mt-1">1. GÜN</div>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">🛒 Fidan Satınalma ve Üretime Giriş</h5>
                                        <p className="text-sm text-slate-600 mb-3">
                                            Netsis'ten satınalma faturası ile <span className="font-bold text-slate-800">1.000 adet "Mavi Servi (Viyol)"</span> alındı.<br />
                                            Birim fiyatı: <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">5.00₺</span>. FidanX'te <b>A Serası'na</b> yerleştirildi.
                                        </p>
                                        <div className="bg-slate-50 border border-slate-100 text-xs p-3 rounded-xl flex justify-between font-mono">
                                            <span className="text-slate-500">LOT-001 (Adet: 1000)</span>
                                            <span className="font-bold text-slate-800">Birim Maliyet: 5.00 ₺</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Adım 2: Toplu İşlem */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative group hover:border-indigo-300 transition-colors">
                                    <div className="md:w-32 flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                                        <div className="text-3xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">02</div>
                                        <div className="text-xs font-bold text-slate-400 mt-1">3. GÜN</div>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">💧 Gübreleme ve Enerji Gideri</h5>
                                        <p className="text-sm text-slate-600 mb-3">
                                            A Serası'ndaki bitkiler için <b>1.000₺'lik Gübre</b> ve <b>2.000₺ Enerji bedeli</b> (Toplam 3.000₺ gider) sisteme girildi. O sırada A Serasında sadece bu 1.000 adet fidan var.<br />
                                            Sistem 3.000₺'yi 1.000 fidana böldü (<span className="text-red-500 font-bold bg-red-50 px-1 rounded">+3.00₺/adet</span>).
                                        </p>
                                        <div className="bg-slate-50 border border-slate-100 text-xs p-3 rounded-xl flex justify-between font-mono">
                                            <span className="text-slate-500">LOT-001 (Adet: 1000)</span>
                                            <span className="font-bold text-slate-800">Yeni Maliyet: <span className="line-through text-slate-400 mr-2">5.00₺</span> 8.00 ₺</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Adım 3: Şaşırtma */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative group hover:border-indigo-300 transition-colors">
                                    <div className="md:w-32 flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                                        <div className="text-3xl font-black text-slate-200 group-hover:text-amber-200 transition-colors">03</div>
                                        <div className="text-xs font-bold text-slate-400 mt-1">15. GÜN</div>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2 text-amber-600">🔄 Şaşırtma (Büyük Saksıya Geçiş)</h5>
                                        <p className="text-sm text-slate-600 mb-3">
                                            Bitkiler büyüdü. Sadece <b>200 adeti</b> 2 Litrelik saksılara geçirildi (Şaşırtma işlemi yapıldı).<br />
                                            Ek olarak 200 saksı + torf + işçilik maliyeti olan toplam <b>1.400₺</b> masraf girildi.<br />
                                            Bu masraf sadece yeni ayrılan bu 200 adet için geçerlidir (<span className="text-red-500 font-bold bg-red-50 px-1 rounded">+7.00₺/adet</span>). Ana parti miktarı 800'e düştü.
                                        </p>
                                        <div className="bg-amber-50 border border-amber-100 text-xs p-3 rounded-xl flex flex-col sm:flex-row gap-3 justify-between font-mono">
                                            <div className="flex justify-between flex-1">
                                                <span className="text-slate-500">Kalan LOT-001 (Adet: 800)</span>
                                                <span className="font-bold text-slate-600">Maliyet: 8.00 ₺ (Değişmedi)</span>
                                            </div>
                                            <div className="hidden sm:block border-l border-amber-200 h-4"></div>
                                            <div className="flex justify-between flex-1">
                                                <span className="text-amber-700 font-bold">Yeni LOT-002 (Adet: 200)</span>
                                                <span className="font-bold text-amber-700">Yeni Maliyet: <span className="line-through opacity-50 mr-2">8.00₺</span> 15.00 ₺</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Adım 4: Satış & Kâr Analizi */}
                                <div className="bg-indigo-900 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 relative group">
                                    <div className="md:w-32 flex flex-col items-center justify-center border-r border-indigo-700 pr-6">
                                        <div className="text-3xl font-black text-indigo-700 group-hover:text-indigo-400 transition-colors">04</div>
                                        <div className="text-xs font-bold text-indigo-400 mt-1">20. GÜN</div>
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-base font-black text-white mb-2 flex items-center gap-2">🏷️ Satış ve Kâr Analizi</h5>
                                        <p className="text-sm text-indigo-200 mb-4">
                                            Büyük saksıdaki <b>200 adet fidanın tamamı</b> 30.00₺/adet fiyatla satıldı.<br />
                                            Satış anında sistem LOT-002'nin birim maliyetinin <b>15.00₺</b> olduğunu bilir.
                                        </p>
                                        <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl font-mono text-sm space-y-2">
                                            <div className="flex justify-between text-indigo-100">
                                                <span>Birim Satış Fiyatı:</span>
                                                <span className="font-bold">30.00 ₺</span>
                                            </div>
                                            <div className="flex justify-between text-rose-300">
                                                <span>Birim Toplam Maliyet:</span>
                                                <span className="font-bold">-15.00 ₺</span>
                                            </div>
                                            <div className="border-t border-indigo-500/30 pt-2 flex justify-between text-emerald-400">
                                                <span className="font-black uppercase tracking-widest">Birim Başına Net Kâr:</span>
                                                <span className="font-black">15.00 ₺ (%100)</span>
                                            </div>
                                            <div className="mt-3 bg-emerald-900/40 p-3 rounded-lg flex justify-between text-emerald-300 outline outline-1 outline-emerald-500/20">
                                                <span className="font-black">PARTİ GENEL KÂRI (200 Adet):</span>
                                                <span className="font-black text-emerald-400 text-base">3.000,00 ₺</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );
}
