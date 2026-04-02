@echo off
chcp 65001 >nul 2>&1
color 0A
title FidanX Ilk Kurulum

set FIDANX_ROOT=C:\inetpub\fidanx
set LOGFILE=%FIDANX_ROOT%\kurulum_log.txt

echo =========================================================
echo   FIDANX - ILK KURULUM
echo =========================================================
echo.
echo Log dosyasi: %LOGFILE%
echo.

:: Log dosyasini baslat
echo ===== KURULUM BASLADI: %date% %time% ===== > "%LOGFILE%"

:: Node kontrol
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Node.js bulunamadi!
    echo [HATA] Node.js bulunamadi >> "%LOGFILE%"
    goto :BITTI
)
for /f "tokens=*" %%i in ('node -v') do set NODEVER=%%i
echo [OK] Node.js: %NODEVER%
echo [OK] Node.js: %NODEVER% >> "%LOGFILE%"

:: PM2 kontrol / kur
echo.
echo [1/7] PM2 KONTROL EDILIYOR...
echo [1/7] PM2 kontrol >> "%LOGFILE%"
where pm2 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   PM2 bulunamadi, kuruluyor...
    call npm install -g pm2 >> "%LOGFILE%" 2>&1
)
echo [OK] PM2 hazir.

:: Onceki PM2 proseslerini temizle (kill kullanma, sadece delete)
echo.
echo [2/7] ONCEKI PM2 PROSESLERI TEMIZLENIYOR...
echo [2/7] PM2 temizlik >> "%LOGFILE%"
pm2 delete fidanx-api >nul 2>&1
pm2 delete fidanx-client >nul 2>&1
echo [OK] Eski prosesler temizlendi.

:: API build
echo.
echo [3/7] API (SERVER) KURULUYOR...
echo [3/7] API kurulum >> "%LOGFILE%"
cd /d "%FIDANX_ROOT%\server"
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] %FIDANX_ROOT%\server klasoru bulunamadi!
    echo [HATA] server klasoru yok >> "%LOGFILE%"
    goto :BITTI
)
echo   npm install yapiliyor...
call npm install >> "%LOGFILE%" 2>&1
echo   npm run build yapiliyor...
call npm run build >> "%LOGFILE%" 2>&1
if not exist "dist\main.js" (
    echo [HATA] API build basarisiz! Detay icin %LOGFILE% dosyasina bakin.
    echo [HATA] dist\main.js bulunamadi >> "%LOGFILE%"
    goto :BITTI
)
echo [OK] API build tamam.

:: .env kontrol
if not exist ".env" (
    echo.
    echo [UYARI] server\.env dosyasi bulunamadi! Olusturuluyor...
    (
        echo DB_HOST=192.168.1.100
        echo DB_USER=sa
        echo DB_PASS=omega
        echo DB_NAME=SASERA2025
        echo DB_PORT=1433
        echo PORT=3201
        echo JWT_SECRET=fidanx-netsis-production-key-2026
        echo NETSIS_SIRKET=SASERA2025
        echo NETSIS_SUBE=0
    ) > .env
    echo [OK] .env olusturuldu.
)

:: Client build
echo.
echo [4/7] ISTEMCI (CLIENT) KURULUYOR...
echo [4/7] Client kurulum >> "%LOGFILE%"
cd /d "%FIDANX_ROOT%\client"
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] %FIDANX_ROOT%\client klasoru bulunamadi!
    goto :BITTI
)

:: .env.production varsa sil (rewrite kullanilacak)
if exist ".env.production" del /f ".env.production"

echo   Eski node_modules temizleniyor...
if exist "node_modules" rmdir /s /q node_modules
if exist ".next" rmdir /s /q .next
echo   npm install yapiliyor (bu 2-3 dakika surebilir)...
call npm install >> "%LOGFILE%" 2>&1
echo   npm run build yapiliyor (bu 1-2 dakika surebilir)...
call npm run build >> "%LOGFILE%" 2>&1
if not exist ".next" (
    echo [HATA] Client build basarisiz! Detay icin %LOGFILE% dosyasina bakin.
    echo [HATA] .next klasoru bulunamadi >> "%LOGFILE%"
    goto :BITTI
)
echo [OK] Client build tamam.

:: PM2 servisleri baslat
echo.
echo [5/7] PM2 SERVISLERI BASLATILIYOR...
echo [5/7] PM2 servis baslat >> "%LOGFILE%"
cd /d "%FIDANX_ROOT%\server"
call pm2 start dist\main.js --name fidanx-api >> "%LOGFILE%" 2>&1
cd /d "%FIDANX_ROOT%\client"
call pm2 start node_modules\next\dist\bin\next --name fidanx-client -- start >> "%LOGFILE%" 2>&1
call pm2 save >> "%LOGFILE%" 2>&1
echo [OK] PM2 servisleri baslatildi.

:: Windows otomatik baslatma
echo.
echo [6/7] WINDOWS OTOMATIK BASLATMA...
echo [6/7] Scheduled Task >> "%LOGFILE%"
schtasks /delete /tn "FidanxAutoStart" /f >nul 2>&1
schtasks /create /tn "FidanxAutoStart" /tr "cmd /c pm2 resurrect" /sc ONSTART /ru SYSTEM /rl HIGHEST /f >> "%LOGFILE%" 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Sunucu acildiginda otomatik baslatilacak.
) else (
    echo [UYARI] Otomatik baslatma ayarlanamadi. Yonetici olarak tekrar deneyin.
    echo [UYARI] schtasks basarisiz >> "%LOGFILE%"
)

:: Durum kontrolu
echo.
echo [7/7] DURUM KONTROLU...
echo [7/7] Durum kontrolu >> "%LOGFILE%"
timeout /t 5 /nobreak >nul
pm2 status
pm2 status >> "%LOGFILE%" 2>&1

echo.
echo =========================================================
echo   KURULUM TAMAMLANDI!
echo =========================================================
echo.
echo   API:    http://localhost:3201/api
echo   CLIENT: http://localhost:3000
echo   AGDAN:  http://192.168.1.100:3000
echo.
echo   Log: %LOGFILE%
echo =========================================================
echo ===== KURULUM BITTI: %date% %time% ===== >> "%LOGFILE%"
goto :BITTI

:BITTI
echo.
echo Kapatmak icin bir tusa basin...
pause >nul
