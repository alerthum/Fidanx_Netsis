@echo off
color 0A
echo =========================================================
echo   FIDANX - ILK KURULUM (BU DOSYA SADECE 1 KERE CALISIR)
echo =========================================================
echo.

set FIDANX_ROOT=C:\inetpub\fidanx

:: 1. Node.js kontrol
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [HATA] Node.js bulunamadi! Oncelikle https://nodejs.org adresinden v18+ kurun.
    pause
    exit /b 1
)
echo [OK] Node.js: 
node -v

:: 2. PM2 global kur
echo.
echo [1/7] PM2 GLOBAL KURULUYOR...
call npm install -g pm2
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [HATA] PM2 kurulamadi. PowerShell'i YONETICI olarak calistirdiginizdan emin olun.
    pause
    exit /b 1
)

:: 3. Onceki PM2 proseslerini temizle
echo.
echo [2/7] ONCEKI PM2 PROSESLERI TEMIZLENIYOR...
pm2 delete all >nul 2>&1
pm2 kill >nul 2>&1

:: 4. API bagimlilik + build
echo.
echo [3/7] API (SERVER) KURULUYOR...
cd /d %FIDANX_ROOT%\server
call npm install
call npm run build
if not exist "dist\main.js" (
    color 0C
    echo [HATA] API build basarisiz! dist\main.js bulunamadi.
    pause
    exit /b 1
)

:: 5. Client bagimlilik + build
echo.
echo [4/7] ISTEMCI (CLIENT) KURULUYOR...
cd /d %FIDANX_ROOT%\client
if exist "node_modules" rmdir /s /q node_modules
call npm install
call npm run build
if not exist ".next" (
    color 0C
    echo [HATA] Client build basarisiz! .next klasoru bulunamadi.
    pause
    exit /b 1
)

:: 6. PM2 ile servisleri baslat
echo.
echo [5/7] PM2 SERVISLERI BASLATILIYOR...
cd /d %FIDANX_ROOT%\server
call pm2 start dist\main.js --name fidanx-api
cd /d %FIDANX_ROOT%\client
call pm2 start node_modules\next\dist\bin\next --name fidanx-client -- start
call pm2 save

:: 7. Windows gorev zamanlayicisina otomatik baslatma ekle
echo.
echo [6/7] WINDOWS OTOMATIK BASLATMA AYARLANIYOR...
schtasks /delete /tn "FidanxAutoStart" /f >nul 2>&1
schtasks /create /tn "FidanxAutoStart" /tr "cmd /c pm2 resurrect" /sc ONSTART /ru SYSTEM /rl HIGHEST /f
if %ERRORLEVEL% EQU 0 (
    echo [OK] Windows kapanip acildiginda PM2 otomatik baslatilacak.
) else (
    echo [UYARI] Zamanlanmis gorev olusturulamadi. PowerShell'i YONETICI olarak calistiriniz.
    echo         Manuel alternatif: Baslat ^> Calistir ^> shell:startup ^> guncelle.bat kisayolunu koyun.
)

:: 8. Kontrol
echo.
echo [7/7] KONTROL EDILIYOR...
timeout /t 3 /nobreak >nul
pm2 status

echo.
echo =========================================================
echo   KURULUM TAMAMLANDI!
echo =========================================================
echo.
echo   API:    http://localhost:3201/api
echo   CLIENT: http://localhost:3000
echo   AGDAN:  http://192.168.1.100:3000
echo.
echo   Bundan sonra guncellemeler icin sadece
echo   guncelle.bat dosyasini cift tiklayin.
echo.
echo   Sunucu kapanip acilsa bile PM2 servisleri
echo   otomatik olarak baslatilacaktir.
echo =========================================================
pause
