'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import SideBar from '@/components/Side-Bar';
import { BatchStoreProvider } from '@/store/batch';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <BatchStoreProvider>
      <div className="flex h-dvh bg-[#121212] text-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-[#1c1c1c] border-b border-[#2a2a2a]">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-700 rounded flex items-center justify-center mr-2">
                      <img src="/hypermode-white-logomark.svg" alt="Hypermode Logo" className="h-5 w-5" />
                    </div>
                    <h1 className="text-lg font-medium">CSV to Knowledge Graph</h1>
                  </div>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-[#121212]">
            <div className="p-6">{children}</div>
          </main>
        </div>
        <SideBar />
      </div>
    </BatchStoreProvider>
  );
}
