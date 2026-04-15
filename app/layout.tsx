import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'GIGHUB — THE SONIC LEDGER',
  description: 'Your saved gigs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-black text-black dark:text-white min-h-screen overflow-x-hidden font-body">
        <Nav />
        <main className="mt-24 max-w-4xl mx-auto px-6 pb-20 pt-8">{children}</main>
      </body>
    </html>
  );
}
