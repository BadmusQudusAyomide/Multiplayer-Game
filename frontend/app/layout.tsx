import './globals.css';
import type { Metadata } from 'next';
import NavBar from './components/NavBar';


export const metadata: Metadata = {
  title: 'Multiplayer Games',
  description: 'Play TTT and RPS vs players or AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gray-50 text-gray-900">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
