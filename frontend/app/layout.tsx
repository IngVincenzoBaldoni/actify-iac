import type { Metadata, Viewport } from 'next';
import './globals.css';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://official-actify.com/#organization',
  name: 'Actify',
  legalName: 'BD TR S.R.L.',
  vatID: 'IT14777710964',
  url: 'https://official-actify.com',
  description: "Piattaforma SaaS italiana per la conformità al Regolamento UE sull'Intelligenza Artificiale (AI Act, Reg. UE 2024/1689). Inventario sistemi AI, gap analysis automatizzata, AI Literacy Art. 4, Document Vault e audit trail immutabile.",
  foundingDate: '2024',
  foundingLocation: {
    '@type': 'Place',
    addressLocality: 'Milano',
    addressRegion: 'MI',
    addressCountry: 'IT',
    postalCode: '20122',
    streetAddress: 'Via Santa Tecla 4',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Santa Tecla 4',
    addressLocality: 'Milano',
    postalCode: '20122',
    addressCountry: 'IT',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@official-actify.com',
    contactType: 'customer support',
    availableLanguage: [{ '@type': 'Language', name: 'Italian' }],
  },
  logo: {
    '@type': 'ImageObject',
    url: 'https://official-actify.com/images/og-image.png',
    width: 1200,
    height: 630,
  },
  areaServed: [
    { '@type': 'Country', name: 'Italy' },
    { '@type': 'Place', name: 'Unione Europea' },
  ],
  knowsAbout: [
    'AI Act UE', 'Regolamento EU 2024/1689', 'AI governance', 'AI literacy',
    'Compliance AI', 'sistemi ad alto rischio AI', 'FRIA valutazione impatto AI',
    'AI Passport Inventory', 'Fine Estimation Board AI Act', 'Art. 4 AI literacy',
    'Art. 50 trasparenza AI', 'ACN Agenzia Cybersicurezza Nazionale', 'EU AI Office',
  ],
  sameAs: [
    'https://www.linkedin.com/company/actify-ai',
  ],
  inLanguage: 'it',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://official-actify.com/#website',
  url: 'https://official-actify.com',
  name: 'Actify',
  description: 'Software per la compliance AI Act per PMI ed Enterprise italiane — Reg. UE 2024/1689',
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
  featureList: [
    'AI Passport Inventory — censimento sistemi AI per livello di rischio',
    'Compliance check automatizzato con gap analysis (RAG su Amazon Bedrock)',
    'Fine Estimation Board — esposizione sanzionatoria Art. 99-101',
    'AI Literacy Tracker — formazione Art. 4 con evidenze e report',
    'Document Vault — generazione automatica FRIA, Risk Assessment, Dichiarazione Trasparenza',
    'Audit Trail immutabile — log certificato di tutte le operazioni compliance',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Piano gratuito — censimento primo sistema AI senza carta di credito',
  },
  provider: { '@id': 'https://official-actify.com/#organization' },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: "Come ottenere la compliance all'AI Act in 3 passi",
  description: "Guida operativa per mettere in regola la tua azienda con il Regolamento UE 2024/1689 (AI Act) usando Actify. Dal censimento dei sistemi AI alla documentazione obbligatoria in meno di un'ora.",
  totalTime: 'PT1H',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'EUR', value: '0' },
  tool: [{ '@type': 'HowToTool', name: 'Actify — AI Act Compliance Platform', url: 'https://official-actify.com' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Censisci i tuoi sistemi AI',
      text: "Registra ogni sistema AI in uso nell'organizzazione nell'AI Passport Inventory — come Provider o Deployer — tramite un form guidato. 5 minuti per sistema, mappa completa dell'intera infrastruttura AI. Il sistema classifica automaticamente ogni tool per categoria di rischio secondo l'Art. 6 e l'Allegato III del Reg. UE 2024/1689.",
      url: 'https://official-actify.com/#come-funziona',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Actify analizza e classifica automaticamente',
      text: "Per ogni sistema censito, Actify mappa l'uso reale contro tutti gli articoli dell'AI Act rilevanti tramite gap analysis automatizzata basata su RAG (Amazon Bedrock + S3 Vectors). Identifica i gap aperti articolo per articolo e calcola l'esposizione sanzionatoria in euro per ogni violazione, visibile nella Fine Estimation Board.",
      url: 'https://official-actify.com/#come-funziona',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Chiudi ogni gap e documenta la compliance',
      text: "Actify guida la risoluzione di ogni gap tramite AI Literacy Tracker (Art. 4), Audit Trail immutabile e Document Vault. Genera automaticamente i documenti obbligatori richiesti dall'AI Act: Registro Sistemi AI, FRIA (Valutazione d'Impatto), Risk Assessment, Piano di Conformità, Report Art. 4 e Dichiarazione di Trasparenza (Art. 50).",
      url: 'https://official-actify.com/#come-funziona',
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
