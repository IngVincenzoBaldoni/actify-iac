import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Actify — AI Act Compliance Assessment',
  description: 'Mappa i tuoi sistemi AI, valuta i rischi e prepara la tua roadmap di compliance AI Act in pochi minuti.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
