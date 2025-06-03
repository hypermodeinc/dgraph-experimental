import type { Metadata } from 'next';
import './globals.css';
import { ApolloWrapper } from './apollo-wrapper';
import { CSVStoreProvider } from '@/store/csv';
import { ConnectionStoreProvider } from '@/store/connection';
import { MainLayout } from './MainLayout';

export const metadata: Metadata = {
  title: 'CSV to Knowledge Graph',
  description: 'Create Dgraph backed knowledge graphs from CSV',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ApolloWrapper>
          <ConnectionStoreProvider>
            <CSVStoreProvider>
              <MainLayout>{children}</MainLayout>
            </CSVStoreProvider>
          </ConnectionStoreProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
