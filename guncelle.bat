@echo off
color 0A

set FIDANX_ROOT=C:\inetpub\fidanx

echo =========================================================
echo   FIDANX - SISTEM GUNCELLEME
echo =========================================================
echo.

:: Her zaman dogru klasorden baslat
cd /d %FIDANX_ROOT%
if not exist "server" (
    color 0C
    echo [HATA] %FIDANX_ROOT% klasorunde proje bulunamadi!
    echo        Oncelikle ilk_kurulum.bat dosyasini calistirin.
    pause
    exit /b 1
)

:: 1. GitHub'dan cek
echo [1/5] GITHUB'DAN KODLAR CEKILIYOR...
call git pull
if %ERRORLEVEL% NEQ 0 (
    echo [UYARI] Git pull basarisiz. Devam ediliyor...
)

:: 2. API build
echo.
echo [2/5] API (SERVER) GUNCELLENIYOR...
cd /d %FIDANX_ROOT%\server
call npm install
call npm run build

:: 3. Client build
echo.
echo [3/5] ISTEMCI (CLIENT) GUNCELLENIYOR...
cd /d %FIDANX_ROOT%\client
call npm install
call npm run build

:: 4. PM2 servisleri kontrol et ve yeniden baslat
echo.
echo [4/5] SERVISLER YENIDEN BASLATILIYOR...

pm2 describe fidanx-api >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   fidanx-api bulunamadi, olusturuluyor...
    cd /d %FIDANX_ROOT%\server
    call pm2 start dist\main.js --name fidanx-api
) else (
    call pm2 restart fidanx-api
)

pm2 describe fidanx-client >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   fidanx-client bulunamadi, olusturuluyor...
    cd /d %FIDANX_ROOT%\client
    call pm2 start node_modules\next\dist\bin\next --name fidanx-client -- start
) else (
    call pm2 restart fidanx-client
)

call pm2 save

:: 5. Durum goster
echo.
echo [5/5] DURUM KONTROLU...
timeout /t 3 /nobreak >nul
pm2 status

echo.
echo =========================================================
echo   GUNCELLEME TAMAMLANDI!
echo =========================================================
echo.
echo   API:    http://localhost:3201/api
echo   CLIENT: http://localhost:3000
echo =========================================================
pause
