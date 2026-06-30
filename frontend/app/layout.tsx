import type { Metadata, Viewport } from 'next';
import './globals.css';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://official-actify.com/#organization',
  name: 'Actify',
  url: 'https://official-actify.com',
  description: "Piattaforma SaaS italiana per la conformità al Regolamento UE sull'Intelligenza Artificiale (AI Act, Reg. UE 2024/1689).",
  foundingDate: '2024',
  areaServed: { '@type': 'Place', name: 'Unione Europea' },
  knowsAbout: ['AI Act UE', 'Regolamento EU 2024/1689', 'AI governance', 'AI literacy', 'Compliance AI'],
  inLanguage: 'it',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://official-actify.com/#website',
  url: 'https://official-actify.com',
  name: 'Actify',
  description: 'Software per la compliance AI Act per PMI ed Enterprise italiane',
  publisher: { '@id': 'https://official-actify.com/#organization' },
  inLanguage: 'it',
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Actify',
  description: "Software SaaS italiano per la compliance all'AI Act europeo (Reg. UE 2024/1689). Inventario sistemi AI, gap analysis automatizzata, AI Literacy Tracker Art. 4, Document Vault e audit trail immutabile.",
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://official-actify.com',
  inLanguage: 'it',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Piano gratuito disponibile — censimento primo sistema AI senza carta di credito',
  },
  provider: { '@id': 'https://official-actify.com/#organization' },
};

export const metadata: Metadata = {
  metadataBase: new URL('https://official-actify.com'),
  title: 'Actify — Software Compliance AI Act per PMI | Italia',
  description: "Actify è la piattaforma italiana per la compliance all'AI Act europeo. Censisci i sistemi AI, analizza i rischi con l'AI e genera la documentazione obbligatoria. Prova gratis, nessuna carta richiesta.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Actify — Software Compliance AI Act per PMI',
    description: "La piattaforma SaaS italiana per la conformità al Reg. UE 2024/1689. Inventario sistemi AI, gap analysis, documentazione obbligatoria e audit trail in un'unica soluzione.",
    url: 'https://official-actify.com',
    siteName: 'Actify',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Actify — AI Act Compliance Platform per PMI italiane',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Actify — Software Compliance AI Act per PMI',
    description: "Censisci i tuoi sistemi AI, calcola l'esposizione sanzionatoria e genera la documentazione richiesta dall'AI Act. Gratis.",
    images: ['/images/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
