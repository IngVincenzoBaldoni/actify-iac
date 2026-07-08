import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Actify',
  description: 'Informativa sul trattamento dei dati personali di Actify, piattaforma SaaS per la compliance AI Act (Reg. UE 2024/1689). Titolare del trattamento: BD TR S.R.L.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATE = '8 luglio 2026';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C0F', color: '#e2e8f0', fontFamily: 'inherit' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(8,12,15,.92)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', letterSpacing: '-0.5px' }}>Actify</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Torna alla home
        </a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#22C55E', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 6, padding: '3px 12px', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20 }}>
            Documento legale
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: '#f1f5f9', margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.15 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
            Ultimo aggiornamento: <strong style={{ color: '#94a3b8' }}>{LAST_UPDATE}</strong>
          </p>
        </div>

        <LegalSection title="1. Titolare del trattamento">
          <p>
            Il Titolare del trattamento dei dati personali raccolti tramite la piattaforma Actify (accessibile su <strong>official-actify.com</strong>) è:
          </p>
          <InfoBox>
            <strong>BD TR S.R.L.</strong><br />
            Via Santa Tecla 4, 20122 Milano (MI), Italia<br />
            P.IVA: 14777710964<br />
            Email: <a href="mailto:officialactify@gmail.com" style={{ color: '#22C55E' }}>officialactify@gmail.com</a>
          </InfoBox>
        </LegalSection>

        <LegalSection title="2. Dati raccolti e finalità del trattamento">
          <p>Actify raccoglie e tratta i dati personali esclusivamente per le seguenti finalità:</p>
          <SubSection title="2.1 Dati di registrazione e account">
            <ul>
              <li>Nome, cognome, indirizzo email, nome dell&apos;azienda</li>
              <li>Password (conservata in forma cifrata tramite Amazon Cognito)</li>
              <li>Ruolo all&apos;interno dell&apos;organizzazione (admin / membro)</li>
            </ul>
            <p><strong>Base giuridica:</strong> esecuzione del contratto (Art. 6 §1 lett. b GDPR).</p>
          </SubSection>
          <SubSection title="2.2 Dati relativi ai sistemi AI censiti">
            <p>Le informazioni che l&apos;utente inserisce sui propri sistemi AI (nome, fornitore, categoria, scopo, tipologia di dati trattati, ecc.) sono dati aziendali, non dati personali di terzi. Ove contengano informazioni riferibili a persone fisiche, il cliente agisce in qualità di titolare autonomo per quei dati.</p>
            <p><strong>Base giuridica:</strong> esecuzione del contratto; legittimo interesse alla conformità normativa (AI Act Reg. UE 2024/1689).</p>
          </SubSection>
          <SubSection title="2.3 Dati di utilizzo e log tecnici">
            <ul>
              <li>Indirizzi IP, browser e sistema operativo (nei log di accesso AWS CloudFront)</li>
              <li>Data e ora degli accessi, azioni eseguite sulla piattaforma (Audit Trail)</li>
              <li>Metriche di performance (AWS CloudWatch)</li>
            </ul>
            <p><strong>Base giuridica:</strong> legittimo interesse alla sicurezza e alla corretta operatività del servizio (Art. 6 §1 lett. f GDPR).</p>
          </SubSection>
          <SubSection title="2.4 Comunicazioni email">
            <p>Email transazionali legate all&apos;uso del servizio (conferma registrazione, notifiche di sistema, report). Non inviamo email di marketing senza consenso esplicito.</p>
          </SubSection>
        </LegalSection>

        <LegalSection title="3. Dove vengono conservati i dati">
          <p>
            Tutti i dati sono archiviati e processati su infrastruttura <strong>Amazon Web Services (AWS)</strong>, nella regione <strong>eu-central-1 (Francoforte, Germania)</strong> — all&apos;interno del territorio dell&apos;Unione Europea.
          </p>
          <p>I principali servizi AWS utilizzati includono:</p>
          <ul>
            <li><strong>Amazon DynamoDB</strong> — database principale (crittografia at-rest abilitata, PITR abilitato)</li>
            <li><strong>Amazon S3</strong> — archiviazione documenti e report PDF (crittografia SSE-S3)</li>
            <li><strong>Amazon Cognito</strong> — gestione identità e autenticazione</li>
            <li><strong>AWS Lambda</strong> — elaborazione serverless dei dati</li>
            <li><strong>Amazon Bedrock</strong> — modelli AI per l&apos;analisi di conformità (solo in-region EU)</li>
          </ul>
          <p>
            Non sono effettuati trasferimenti di dati al di fuori dello Spazio Economico Europeo.
          </p>
        </LegalSection>

        <LegalSection title="4. Tempi di conservazione">
          <ul>
            <li><strong>Dati di account:</strong> per tutta la durata del contratto + 12 mesi dalla cancellazione dell&apos;account</li>
            <li><strong>Dati sui sistemi AI e documenti:</strong> per tutta la durata dell&apos;abbonamento attivo</li>
            <li><strong>Audit Trail:</strong> 5 anni dall&apos;evento (obbligo di documentazione normativa)</li>
            <li><strong>Log tecnici:</strong> 90 giorni</li>
            <li><strong>Fatturazione:</strong> 10 anni (obbligo fiscale)</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Condivisione con terze parti">
          <p>Actify non vende, non affitta e non cede dati personali a terzi per finalità commerciali. I dati possono essere condivisi esclusivamente con:</p>
          <ul>
            <li><strong>Amazon Web Services Inc.</strong> — infrastruttura cloud (DPA in vigore, region EU)</li>
            <li><strong>Resend Inc.</strong> — servizio di invio email transazionali</li>
            <li><strong>Autorità competenti</strong> — in caso di obbligo di legge o ordine dell&apos;autorità giudiziaria</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Cookie e tracciamento">
          <p>
            Actify utilizza esclusivamente cookie tecnici necessari al funzionamento del servizio (sessione di autenticazione, preferenze UI). Non vengono utilizzati cookie di profilazione o di tracciamento pubblicitario di terze parti.
          </p>
          <p>
            Il sito pubblico utilizza script minimali per il corretto funzionamento del wizard di assessment. Non integriamo Google Analytics, Facebook Pixel o strumenti di remarketing.
          </p>
        </LegalSection>

        <LegalSection title="7. Diritti degli interessati (GDPR Art. 15–22)">
          <p>In qualità di interessato, hai il diritto di:</p>
          <ul>
            <li><strong>Accesso (Art. 15):</strong> ottenere conferma del trattamento e copia dei tuoi dati</li>
            <li><strong>Rettifica (Art. 16):</strong> correggere dati inesatti o incompleti</li>
            <li><strong>Cancellazione (Art. 17):</strong> richiedere la cancellazione dei tuoi dati (&quot;diritto all&apos;oblio&quot;), salvo obblighi di conservazione</li>
            <li><strong>Limitazione (Art. 18):</strong> richiedere la sospensione temporanea del trattamento</li>
            <li><strong>Portabilità (Art. 20):</strong> ricevere i tuoi dati in formato strutturato e leggibile da macchina</li>
            <li><strong>Opposizione (Art. 21):</strong> opporsi al trattamento basato su legittimo interesse</li>
          </ul>
          <p>
            Per esercitare questi diritti, scrivi a <a href="mailto:officialactify@gmail.com" style={{ color: '#22C55E' }}>officialactify@gmail.com</a>. Risponderemo entro 30 giorni.
          </p>
          <p>
            Hai inoltre il diritto di proporre reclamo al <strong>Garante per la protezione dei dati personali</strong> (<a href="https://www.garanteprivacy.it" style={{ color: '#22C55E' }} target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).
          </p>
        </LegalSection>

        <LegalSection title="8. Sicurezza dei dati">
          <p>
            Actify adotta misure tecniche e organizzative appropriate per proteggere i dati personali da accesso non autorizzato, perdita, distruzione o divulgazione. Per i dettagli completi consulta la nostra <a href="/security" style={{ color: '#22C55E' }}>pagina Sicurezza & Trust</a>.
          </p>
        </LegalSection>

        <LegalSection title="9. Modifiche alla presente informativa">
          <p>
            Questa informativa può essere aggiornata periodicamente. In caso di modifiche sostanziali, gli utenti registrati riceveranno comunicazione via email. La versione più aggiornata è sempre disponibile su questa pagina.
          </p>
        </LegalSection>

        <LegalSection title="10. Contatti">
          <InfoBox>
            Per qualsiasi domanda relativa al trattamento dei tuoi dati personali:<br /><br />
            <a href="mailto:officialactify@gmail.com" style={{ color: '#22C55E' }}>officialactify@gmail.com</a><br />
            BD TR S.R.L. — Via Santa Tecla 4, 20122 Milano (MI)
          </InfoBox>
        </LegalSection>

      </div>

      {/* Footer */}
      <LegalFooter />
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────────────── */

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.07)', letterSpacing: '-.01em' }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.85 }}>
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', margin: '0 0 10px' }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '20px 24px', fontSize: 13, color: '#94a3b8', lineHeight: 1.85, margin: '16px 0' }}>
      {children}
    </div>
  );
}

function LegalFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { href: '/privacy', label: 'Privacy Policy' },
          { href: '/terms', label: 'Termini di Servizio' },
          { href: '/security', label: 'Sicurezza & Trust' },
        ].map(l => (
          <a key={l.href} href={l.href} style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>{l.label}</a>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
        © {new Date().getFullYear()} BD TR S.R.L. — P.IVA 14777710964 — Via Santa Tecla 4, 20122 Milano
      </p>
    </footer>
  );
}
