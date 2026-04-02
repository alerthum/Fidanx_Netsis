"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import * as XLSX from 'xlsx';

export default function VeriYuklePage() {
    const [importType, setImportType] = useState<'customers' | 'stocks'>('stocks');
    const [logs, setLogs] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const API_URL = '/api';

    // Şablon Oluşturma ve İndirme
    const handleDownloadTemplate = () => {
        let data = [];
        let fileName = "";

        if (importType === 'stocks') {
            fileName = "Stok_Import_Sablonu.xlsx";
            data = [{
                name: "Örn: Ayvalık Zeytin",
                category: "Meyve",
                type: "CUTTING",
                sku: "STK-001",
                currentStock: 100,
                wholesalePrice: 150.50,
                retailPrice: 200.00,
                kod1: "GRUP1",
                kod2: "",
                criticalStock: 10
            }];
        } else {
            fileName = "Musteri_Import_Sablonu.xlsx";
            data = [{
                name: "Örn: Ahmet Yılmaz Tarım",
                email: "ahmet@mail.com",
                phone: "5551234567",
                type: "Bayi",
                taxId: "1234567890",
                taxOffice: "Merkez",
                address: "Organize Sanayi Bölgesi",
                contactPerson: "Mehmet Bey"
            }];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Sablon");
        XLSX.writeFile(wb, fileName);
    };

    // Dosya Yükleme ve Okuma
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (confirm(`${data.length} adet kayıt bulundu. Sisteme aktarmak istiyor musunuz?`)) {
                await processImport(data);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Veriyi Sunucuya İşleme (Upsert Mantığı)
    const processImport = async (data: any[]) => {
        setIsUploading(true);
        setLogs([]);
        let successCount = 0;
        let errorCount = 0;

        for (const [index, row] of data.entries()) {
            try {
                // Determine endpoint and payload based on type
                let endpoint = "";
                let payload = {};

                if (importType === 'stocks') {
                    endpoint = `${API_URL}/plants?tenantId=demo-tenant`; // Backend should extract ID usually or we use POST for create
                    // Note: Real ERP imports usually check SKU match to update using PUT/PATCH.
                    // For simplified demo, we are POSTing. In real scenario, backend handles upsert by SKU.
                    payload = {
                        ...row,
                        // Ensure critical fields match backend DTO
                        criticalStock: row.criticalStock || 10,
                        currentStock: row.currentStock || 0
                    };
                } else {
                    endpoint = `${API_URL}/sales/customers?tenantId=demo-tenant`;
                    payload = {
                        ...row,
                        customerCode: row.taxId || `CUST-${index}` // Fallback ID
                    };
                }

                // Simple POST for now. Ideally backend checks for existing SKU/TaxID.
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    successCount++;
                    setLogs(prev => [`[OK] Satır ${index + 1}: Başarıyla aktarıldı.`, ...prev]);
                } else {
                    errorCount++;
                    setLogs(prev => [`[HATA] Satır ${index + 1}: Sunucu kabul etmedi.`, ...prev]);
                }

            } catch (err) {
                errorCount++;
                setLogs(prev => [`[KRİTİK] Satır ${index + 1}: İşlem hatası.`, ...prev]);
            }
        }

        setIsUploading(false);
        alert(`İşlem Tamamlandı.\nBaşarılı: ${successCount}\nHatalı: ${errorCount}`);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc]">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Excel / Veri Aktarımı</h1>
                    <p className="text-sm text-slate-500">Müşteri ve Stok kartlarını toplu olarak içeri aktarın veya güncelleyin.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Yükleme Alanı */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setImportType('stocks')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${importType === 'stocks' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                🧱 Stok Kartları
                            </button>
                            <button
                                onClick={() => setImportType('customers')}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${importType === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                👥 Müşteriler
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <h3 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2">
                                    <span>1. Adım:</span> Şablonu İndirin
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">Verilerinizi hazırlamak için boş Excel şablonunu indirin.</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
                                >
                                    📥 Boş Şablon İndir (.xlsx)
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                                <h3 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2">
                                    <span>2. Adım:</span> Dosyayı Yükle
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">Hazırladığınız Excel dosyasını seçin. "SKU" veya "Vergi No" eşleşirse güncelleme yapılır.</p>

                                {isUploading ? (
                                    <div className="text-center py-4">
                                        <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-xs text-emerald-600 font-bold mt-2">Aktarılıyor...</p>
                                    </div>
                                ) : (
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileUpload}
                                        className="block w-full text-xs text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-xs file:font-semibold
                                        file:bg-emerald-50 file:text-emerald-700
                                        hover:file:bg-emerald-100
                                        cursor-pointer"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Log Alanı */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-slate-200 font-mono text-xs overflow-hidden flex flex-col h-[500px]">
                        <h3 className="font-bold text-white mb-4 border-b border-slate-700 pb-2">İşlem Logları</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {logs.length === 0 && <p className="text-slate-600 italic">Henüz bir işlem yapılmadı...</p>}
                            {logs.map((log, i) => (
                                <div key={i} className={`p-2 rounded border-l-2 ${log.includes('[HATA]') ? 'border-rose-500 bg-rose-500/10 text-rose-300' : 'border-emerald-500 bg-emerald-500/10 text-emerald-300'}`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
