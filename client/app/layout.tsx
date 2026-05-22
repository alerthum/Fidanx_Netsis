import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import BottomNavigation from "@/components/BottomNavigation";
import AiAssistant from "@/components/AiAssistant";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import "./globals.css";
import "./themes.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FidanX | Yönetim Paneli",
  description: "Fidan Üretim ve Satış Yönetim Sistemi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FidanX",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full pb-20 lg:pb-0 transition-colors duration-300 fx-page`}
      >
        <Providers>
          {children}
          <BottomNavigation />
          <AiAssistant />
          <PwaInstallPrompt />
          <OfflineBanner />
        </Providers>
        {process.env.NODE_ENV === "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
            }}
          />
        ) : null}
      </body>
    </html>
  );
}
