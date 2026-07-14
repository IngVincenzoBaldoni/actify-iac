import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prezzi Actify — Piano Gratuito e Piani Premium per la Compliance AI Act',
  description: "Actify è gratis per il primo sistema AI. Piani premium per PMI e Enterprise con inventario illimitato, gap analysis automatizzata, Document Vault e AI Literacy Tracker Art. 4. Nessuna carta richiesta.",
  alternates: { canonical: '/plan' },
  openGraph: {
    title: 'Prezzi Actify — Inizia gratis, scala quando sei pronto',
    description: "Piano gratuito per censire il primo sistema AI. Piani a pagamento per compliance completa: inventario illimitato, documenti automatici, audit trail, AI Literacy Art. 4.",
    url: 'https://official-actify.com/plan',
  },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
