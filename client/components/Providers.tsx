"use client";
import React from 'react';
import { ThemeProvider } from 'next-themes';
import GlobalModal from './GlobalModal';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            {children}
            <GlobalModal />
        </ThemeProvider>
    );
}
