@echo off
color 0A
echo =======================================================
echo FIDANX SISTEM GUNCELLEME ARACI
echo =======================================================
echo Lutfen bekleyin, uzak sunucudan guncellemeler cekiliyor...

cd C:\inetpub\fidanx
echo.
echo [1/4] GITHUB'DAN YENI KODLAR CEKILIYOR...
call git pull

echo.
echo [2/4] API (SERVER) DERLENIYOR...
cd server
call npm run build

echo.
echo [3/4] ISTEMCI (CLIENT) DERLENIYOR...
cd ../client
call npm run build

echo.
echo [4/4] SISTEMLER YENIDEN BASLATILIYOR...
call pm2 restart all

echo.
echo =======================================================
echo GUNCELLEME BASARILI! UYGULAMA YENI SURUME GECTI.
echo =======================================================
pause
