@echo off
color 0A
echo =======================================================
echo FIDANX SISTEM GUNCELLEME ARACI
echo =======================================================
echo Lutfen bekleyin, uzak sunucudan guncellemeler cekiliyor...

cd C:\inetpub\fidanx
echo.
echo [1/5] GITHUB'DAN YENI KODLAR CEKILIYOR...
call git pull

echo.
echo [2/5] API (SERVER) DERLENIYOR...
cd server
call npm install
call npm run build

echo.
echo [3/5] ISTEMCI (CLIENT) DERLENIYOR...
cd ..\client
call npm install
call npm run build

echo.
echo [4/5] PM2 SERVISLERI KONTROL EDILIYOR...
pm2 describe fidanx-api >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo fidanx-api bulunamadi, olusturuluyor...
    cd ..\server
    call pm2 start dist/main.js --name fidanx-api
    cd ..\client
)

pm2 describe fidanx-client >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo fidanx-client bulunamadi, olusturuluyor...
    call pm2 start node_modules\next\dist\bin\next --name fidanx-client -- start -p 3000
)

echo.
echo [5/5] SISTEMLER YENIDEN BASLATILIYOR...
call pm2 restart all
call pm2 save

echo.
echo =======================================================
echo GUNCELLEME BASARILI! UYGULAMA YENI SURUME GECTI.
echo =======================================================
echo.
echo API:    http://localhost:3201/api
echo CLIENT: http://localhost:3000
echo.
pause
