# FidanX v2 — Tam Kurulum ve Dağıtım Rehberi

---

## BÖLÜM A: GIT & GITHUB KURULUMU

### Adım 1: GitHub'da Repo Oluşturun
1. GitHub'da `alerthum/Fidanx_Netsis` adıyla yeni repo oluşturun
2. **README, .gitignore, License eklemeyin** (biz zaten oluşturduk)
3. **"Create repository"** butonuna basın

### Adım 2: Projeyi Git'e Bağlayın (Powershell'de çalıştırın)
```powershell
cd C:\Users\ibrahimyokus\Desktop\convert\Fidanx_Netsis

git init
git add .
git commit -m "FidanX v2 - Netsis ERP Entegrasyonu"
git branch -M main
git remote add origin https://github.com/alerthum/Fidanx_Netsis.git
git push -u origin main
```

### Adım 3: v2-netsis Branch Oluşturun
```powershell
git checkout -b v2-netsis
git push -u origin v2-netsis
```

> **Sonuç:** GitHub'da 2 branch olacak:
> - `main` → Firebase eski demo (ileride saklanacak)
> - `v2-netsis` → Netsis canlı sistem (aktif geliştirme)

---

## BÖLÜM B: MÜŞTERİ SUNUCUSUNA API KURULUMU (IIS + PM2)

### Mimari
```
[Vercel Frontend] ──HTTP──> http://78.186.172.108:3201/api ──> [NestJS API] ──> [MSSQL 192.168.1.100]
                                      │
                          (Port Forwarding: 3201)
                                      │
                            [Müşteri Windows Server]
                            [PM2 ile NestJS çalışıyor]
```

### Adım 1: Müşteri Sunucusuna Dosyaları Kopyalayın

**Yöntem A — Git ile (Önerilen):**
Müşteri sunucusunda Powershell açın:
```powershell
cd C:\inetpub
git clone https://github.com/alerthum/Fidanx_Netsis.git fidanx
cd fidanx
git checkout v2-netsis
```

**Yöntem B — Manuel (RDP ile):**
- Kendi bilgisayarınızdan `C:\Users\ibrahimyokus\Desktop\convert\Fidanx_Netsis\server` klasörünü
- Müşteri sunucusuna `C:\inetpub\fidanx\server` olarak kopyalayın

### Adım 2: Node.js Kurulumu (Müşteri sunucusunda)
Eğer Node.js kurulu değilse:
1. https://nodejs.org adresinden **v18 LTS veya üzeri** indirin
2. Müşteri sunucusuna kurun
3. Doğrulama: `node -v` → v18+ çıkmalı

### Adım 3: Bağımlılıkları Yükleyin
```powershell
cd C:\inetpub\fidanx\server
npm install
```

### Adım 4: .env Dosyasını Oluşturun
`C:\inetpub\fidanx\server\.env` dosyasını oluşturun (Notepad ile):
```env
DB_HOST=192.168.1.100
DB_USER=sa
DB_PASS=omega
DB_NAME=SASERA2025
DB_PORT=1433
PORT=3201
JWT_SECRET=fidanx-netsis-production-key-2026
NETSIS_SIRKET=SASERA2025
NETSIS_SUBE=0
```

### Adım 5: Projeyi Build Edin
```powershell
cd C:\inetpub\fidanx\server
npm run build
```
> Bu komut `dist/` klasörü oluşturur. API buradan çalışacak.

### Adım 6: PM2 ile Servis Olarak Başlatın
```powershell
npm install -g pm2

cd C:\inetpub\fidanx\server
pm2 start dist/main.js --name fidanx-api
pm2 save
```

### Adım 7: PM2'yi Windows Servisi Olarak Kaydedin
Bu sayede sunucu yeniden başlasa bile API otomatik açılır:
```powershell
npm install -g pm2-windows-service
pm2-service-install
```
Sorulara varsayılan cevapları verin (Enter basın).

### Adım 8: Test Edin
Müşteri sunucusunda tarayıcı açıp şu adresi yazın:
```
http://localhost:3201/api
```
Swagger belgesi geliyorsa API çalışıyor demektir ✅

Ardından kendi bilgisayarınızdan:
```
http://78.186.172.108:3201/api
```
Bu da çalışıyorsa port forwarding başarılı demektir ✅

---

## BÖLÜM C: VERCEL AYARLARI

### Adım 1: Vercel'de Projeyi Bağlayın
1. https://vercel.com/dashboard → **"New Project"**
2. GitHub'dan `alerthum/Fidanx_Netsis` seçin
3. **Root Directory:** `client` olarak ayarlayın
4. **Branch:** `v2-netsis` seçin

### Adım 2: Environment Variables Ekleyin
Vercel proje ayarlarında → **Settings → Environment Variables:**

| Değişken | Değer |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://78.186.172.108:3201/api` |

### Adım 3: Deploy Edin
Vercel otomatik olarak build edecektir. Sonuç URL:
```
https://fidanx-netsis.vercel.app (veya benzeri)
```

---

## BÖLÜM D: PORT YÖNLENDİRME (Router)

Müşterinin router'ında yapılacak ayar:
| Ayar | Değer |
|---|---|
| **Dış Port** | `3201` |
| **İç IP** | `192.168.1.100` |
| **İç Port** | `3201` |
| **Protokol** | TCP |

---

## BÖLÜM E: PM2 FAYDALI KOMUTLAR

```powershell
pm2 status              # Servislerin durumunu göster
pm2 logs fidanx-api     # API loglarını canlı izle
pm2 restart fidanx-api  # API'yi yeniden başlat
pm2 stop fidanx-api     # API'yi durdur
pm2 delete fidanx-api   # API'yi sil
```

## BÖLÜM F: GÜNCELLEME (İleride)

Kod güncellemesi yaptığınızda müşteri sunucusunda:
```powershell
cd C:\inetpub\fidanx
git pull origin v2-netsis
cd server
npm install
npm run build
pm2 restart fidanx-api
```

---

## BÖLÜM G: FRONTEND'i MÜŞTERİ SUNUCUSUNDA ÇALIŞTIRMA (Lokal Test İçin)

Eğer projeyi (Vercel haricinde) doğrudan müşterinin sunucusunda çalıştırıp lokal ağı üzerinden (örneğin diğer bilgisayarlardan tarayıcıdan test etmek için) açmak isterseniz, Next.js uygulamasını da PM2 ile API'nin yanına kurabilirsiniz.

### Adım 1: Frontend Kurulumu (Müşteri sunucusunda)
```powershell
cd C:\inetpub\fidanx\client
npm install
```

### Adım 2: .env Dosyasını Oluşturun
`C:\inetpub\fidanx\client\.env.production` dosyasını oluşturun veya kopyalayın. İçeriği sadece şu olmalı:
```env
# API sunucusu aynı bilgisayarda olduğu için localhost kullanabilirsiniz (veya 192.168.1.100)
NEXT_PUBLIC_API_URL=http://localhost:3201/api
```

### Adım 3: Frontend Build Alın
```powershell
npm run build
```

### Adım 4: Frontend'i PM2 ile Başlatın
Next.js uygulamasını 3000 portunda başlatmak için:
```powershell
pm2 start npm --name fidanx-client -- run start
pm2 save
```

### Adım 5: Doğrulama
Müşteri bilgisayarında tarayıcıyı açın ve şu adrese gidin:
```
http://localhost:3000
```
Müşteri ağındaki diğer bilgisayarlardan projeye girmek için ise:
```
http://192.168.1.100:3000
```
yazarak lokal olarak test gerçekleştirebilirsiniz. Dışarıya yayın yine Vercel (Adım C) üzerinden yapılmaya devam eder.

