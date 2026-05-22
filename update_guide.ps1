$filePath = "c:\Users\ibrahimyokus\Desktop\convert\Fidanx_Netsis\client\components\uretim\GuideModal.tsx"
$lines = [System.IO.File]::ReadAllLines($filePath, [System.Text.Encoding]::UTF8)

# ============== 1. INSERT after line 103 (Bekleyen isler) - before line 104 ==============
$completedBlock = @'
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 mb-4">
                                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">&#x2705; Son Tamamlanan &#x130;&#x15F;ler (22 May&#x131;s 2026)</h5>
                                <ul className="text-xs text-emerald-950 space-y-2 list-disc pl-4">
                                    <li><strong>Sat&#x131;&#x15F; sayfas&#x131;nda zorunlu parti se&#xE7;imi:</strong> Bitki &#xFC;r&#xFC;nleri (150 prefix) i&#xE7;in art&#x131;k parti se&#xE7;meden sat&#x131;&#x15F; yap&#x131;lam&#x131;yor. Miktar kontrol&#xFC; ve ye&#x15F;il rozet ile parti g&#xF6;rselle&#x15F;tirmesi tamamland&#x131;.</li>
                                    <li><strong>&#xC7;ift y&#xF6;nl&#xFC; FidanX - Netsis sat&#x131;&#x15F; senkronizasyonu:</strong> Fatura kesildi&#x11F;inde hem Netsis TBLSERITRA lot takibi, hem FidanX MevcutMiktar d&#xFC;&#x15F;&#xFC;m&#xFC; + SatilanMiktar art&#x131;&#x15F;&#x131; + maliyet g&#xFC;ncellenmesi atomik transaction ile yap&#x131;l&#x131;yor.</li>
                                    <li><strong>Toplu Sarf Fi&#x15F;i Entegrasyonu:</strong> Operasyon sayfas&#x131;na yeni Toplu Sarf sekmesi eklendi. Netsis malzeme arama, sepete ekleme, konumlara g&#xF6;re maliyet da&#x11F;&#x131;t&#x131;m&#x131; ve Netsis sarf fi&#x15F;i (PROJE_KODU ile) kesimi tek ak&#x131;&#x15F;ta yap&#x131;l&#x131;yor.</li>
                                </ul>
                            </div>

'@

$insertIdx1 = 103  # 0-indexed = line 104 in 1-indexed. Insert BEFORE line 104
$newLines = [System.Collections.Generic.List[string]]::new($lines.Length + 100)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq $insertIdx1) {
        # Insert the completed block
        $completedBlock.Split("`n") | ForEach-Object { $newLines.Add($_.TrimEnd("`r")) }
    }
    $newLines.Add($lines[$i])
}

# ============== 2. Find Faz E closing and add Faz F ==============
$fazFContent = @'
                                    {
                                        faz: 'Faz F', title: 'Satis Parti Takibi & Toplu Sarf Entegrasyonu', status: 'completed', color: 'indigo',
                                        items: [
                                            'Satis sayfasinda zorunlu parti secimi (bitki urunleri icin)',
                                            'Miktar kontrolu - stoktan fazla satis engeli',
                                            'Cift yonlu satis senkronizasyonu (Netsis lot + FidanX parti guncelleme)',
                                            'Toplu Sarf Fisi - Operasyon sayfasi Toplu Sarf sekmesi',
                                            'Netsis malzeme arama & sepet sistemi',
                                            'Sarf fisi PROJE_KODU ile konum bazli Netsis kaydi',
                                            'FidanX tarafinda aktif partilere orantisal maliyet dagitimi',
                                            'FDX_Giderler tablosuna genel gider kaydi',
                                        ]
                                    },
'@

# Find the line with "].map((faz)" in newLines
$fazInsertIdx = -1
for ($i = 0; $i -lt $newLines.Count; $i++) {
    if ($newLines[$i] -match '^\s*\]\.map\(\(faz\)') {
        $fazInsertIdx = $i
        break
    }
}

if ($fazInsertIdx -gt 0) {
    $fazLines = $fazFContent.Split("`n")
    for ($j = $fazLines.Length - 1; $j -ge 0; $j--) {
        $newLines.Insert($fazInsertIdx, $fazLines[$j].TrimEnd("`r"))
    }
}

# ============== 3. Find first dev log entry and insert new entries before it ==============
$devLogEntries = @"
                                            { date: '22.05.2026', desc: 'Faz F: Toplu Sarf Fisi Entegrasyonu - Operasyon sayfasina Toplu Sarf sekmesi eklendi', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Faz F: NetsisStocksService.createConsumption - PROJE_KODU (sera/konum) destegi eklendi', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Faz F: ProductionService.createBulkConsumption - Netsis sarf + FidanX maliyet dagitimi orkestrasyonu', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Faz F: POST /api/production/bulk-consumption endpointi eklendi', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Faz F: Satis sayfasi zorunlu parti secimi (150 prefix bitki urunleri) - miktar kontrolu + yesil rozet', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Faz F: NetsisInvoicesService.createInvoice - FidanX parti guncelleme + TBLSERITRA lot takibi senkronizasyonu', type: 'feature' },
                                            { date: '22.05.2026', desc: 'Kilavuz guncellendi: Faz F eklendi, bekleyen isler yenilendi, gelistirme gunlugu guncellendi', type: 'fix' },
"@

$logInsertIdx = -1
for ($i = 0; $i -lt $newLines.Count; $i++) {
    if ($newLines[$i] -match "date: '06\.05\.2026'") {
        $logInsertIdx = $i
        break
    }
}

if ($logInsertIdx -gt 0) {
    $logLines = $devLogEntries.Split("`n")
    for ($j = $logLines.Length - 1; $j -ge 0; $j--) {
        $newLines.Insert($logInsertIdx, $logLines[$j].TrimEnd("`r"))
    }
}

# Write back
[System.IO.File]::WriteAllLines($filePath, $newLines.ToArray(), [System.Text.Encoding]::UTF8)
Write-Host "Done! Total lines: $($newLines.Count)"
