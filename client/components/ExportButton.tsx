"use client";
import React from 'react';

interface ExportButtonProps {
    title: string;
    tableId: string;
    iconOnly?: boolean;
}

export default function ExportButton({ title, tableId, iconOnly }: ExportButtonProps) {
    const handleExport = () => {
        // ... (Export logic same as existing)
        const printContents = document.getElementById(tableId)?.innerHTML;
        if (!printContents) return;

        const originalTitle = document.title;
        document.title = `${title} Raporu - FidanX ERP`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${title} Raporu</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #334155; }
                        h1 { color: #059669; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #f8fafc; text-align: left; padding: 12px; border: 1px solid #e2e8f0; font-size: 10px; text-transform: uppercase; }
                        td { padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; }
                        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${title} Raporu</h1>
                    <p style="font-size: 10px; color: #64748b;">Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
                    <table>${printContents}</table>
                    <div class="footer">FidanX ERP - Akıllı Fidanlık Yönetim Sistemi</div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();

        document.title = originalTitle;
    };

    return (
        <button
            onClick={handleExport}
            className={`${iconOnly ? 'w-10 h-10 p-0 rounded-full flex items-center justify-center' : 'px-4 py-2 rounded-xl flex items-center gap-2'} bg-white border border-slate-200 text-slate-600 text-xs font-black shadow-sm hover:bg-slate-50 transition active:scale-95 uppercase tracking-widest group`}
            title="PDF Olarak Kaydet / Yazdır"
        >
            <span className={`${iconOnly ? 'text-lg transform group-hover:scale-110 transition' : ''}`}>📄</span>
            {!iconOnly && "PDF / YAZDIR"}
        </button>
    );
}
