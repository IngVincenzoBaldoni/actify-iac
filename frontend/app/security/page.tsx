import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sicurezza & Trust — Actify',
  description: 'Come Actify protegge i tuoi dati. Infrastruttura AWS in EU, crittografia end-to-end, isolamento per cliente, GDPR compliance e audit trail immutabile.',
  alternates: { canonical: '/security' },
};

const pillars = [
  {
    icon: '🔐',
    title: 'Crittografia end-to-end',
    body: 'Tutti i dati sono cifrati in transito (TLS 1.2+) e a riposo (AES-256 tramite AWS SSE). Nessun dato viaggia in chiaro.',
  },
  {
    icon: '🇪🇺',
    title: 'Dati solo in Europa',
    body: 'Tutta l\'infrastruttura risiede nella regione AWS eu-central-1 (Francoforte). Nessun trasferimento di dati al di fuori dello SEE.',
  },
  {
    icon: '🏢',
    title: 'Isolamento per cliente',
    body: 'Ogni organizzazione ha dati completamente isolati dagli altri. L\'identificatore univoco è un UUID v4 — non esistono percorsi di accesso cross-account.',
  },
  {
    icon: '🔑',
    title: 'Autenticazione sicura',
    body: 'Gestione identità tramite Amazon Cognito con JWT firmati RS256. Supporto MFA disponibile. Password mai memorizzate in chiaro.',
  },
  {
    icon: '📋',
    title: 'Audit Trail immutabile',
    body: 'Ogni operazione significativa viene registrata in un log append-only con timestamp ISO, utente responsabile e dettagli dell\'azione. Conservato 5 anni.',
  },
  {
    icon: '🛡️',
    title: 'GDPR compliant',
    body: 'Piena conformità al Regolamento UE 2016/679. DPA (Data Processing Agreement) disponibile su richiesta ai sensi dell\'Art. 28 GDPR.',
  },
];

const infra = [
  { label: 'Provider cloud', value: 'Amazon Web Services (AWS)' },
  { label: 'Regione', value: 'eu-central-1 — Francoforte, Germania' },
  { label: 'Database', value: 'Amazon DynamoDB (crittografia at-rest, PITR 35gg)' },
  { label: 'Storage documenti', value: 'Amazon S3 (SSE-S3, bucket policy restrittive)' },
  { label: 'Autenticazione', value: 'Amazon Cognito User Pool (JWT RS256)' },
  { label: 'API Gateway', value: 'AWS API Gateway HTTP v2 + JWT Authorizer' },
  { label: 'Compute', value: 'AWS Lambda (serverless, no server persistente esposto)' },
  { label: 'AI/ML', value: 'Amazon Bedrock eu-central-1 (inference in-region EU)' },
  { label: 'CDN', value: 'Amazon CloudFront (HTTPS forzato, HSTS)' },
  { label: 'Crittografia in transito', value: 'TLS 1.2 minimo, TLS 1.3 preferito' },
  { label: 'Crittografia at-rest', value: 'AES-256 (AWS Managed Keys)' },
  { label: 'Backup', value: 'DynamoDB PITR continuo · S3 versioning abilitato' },
];

export default function SecurityPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C0F', color: '#e2e8f0', fontFamily: 'inherit' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(8,12,15,.92)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', letterSpacing: '-0.5px' }}>Actify</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Torna alla home</a>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 64px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(34,197,94,.06) 0%, transparent 70%)' }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#22C55E', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 6, padding: '3px 12px', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 24 }}>
          Sicurezza & Trust
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 900, color: '#f1f5f9', margin: '0 0 20px', letterSpacing: '-1.5px', lineHeight: 1.1, maxWidth: 660, marginInline: 'auto' }}>
          I tuoi dati di compliance meritano la massima protezione
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
          Actify è costruita su infrastruttura enterprise-grade. Ogni scelta architetturale è pensata per garantire sicurezza, privacy e disponibilità dei tuoi dati.
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '72px 24px 96px' }}>

        {/* Pillars grid */}
        <div style={{ marginBottom: 80 }}>
          <SectionLabel>Principi di sicurezza</SectionLabel>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 40px', letterSpacing: '-.03em' }}>
            Sei livelli di protezione
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {pillars.map(p => (
              <div key={p.title} style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 100%)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 18,
                padding: '28px 28px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)' }} />
                <div style={{ fontSize: 32, marginBottom: 16 }}>{p.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-.01em' }}>{p.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure table */}
        <div style={{ marginBottom: 80 }}>
          <SectionLabel>Stack tecnologico</SectionLabel>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 32px', letterSpacing: '-.03em' }}>
            Infrastruttura certificata AWS
          </h2>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden' }}>
            {infra.map((row, i) => (
              <div key={row.label} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: i < infra.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                gap: 24,
                flexWrap: 'wrap',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: .8, minWidth: 180, flexShrink: 0 }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>
                  {row.value}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,.6)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Access control */}
        <div style={{ marginBottom: 80 }}>
          <SectionLabel>Controllo accessi</SectionLabel>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 24px', letterSpacing: '-.03em' }}>
            Chi può vedere i tuoi dati
          </h2>
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.85 }}>
            <p>
              L&apos;accesso ai dati di ogni organizzazione è regolato da policy IAM (Identity and Access Management) di AWS che impongono l&apos;isolamento completo tra i tenant. I nostri sistemi non prevedono accesso trasversale ai dati dei clienti.
            </p>
            <p>
              <strong style={{ color: '#cbd5e1' }}>Dipendenti Actify:</strong> l&apos;accesso ai dati di produzione è limitato a un numero minimo di persone, richiede autenticazione MFA e viene registrato in log di audit. Non accediamo mai ai dati di un cliente senza esplicita richiesta di supporto.
            </p>
            <p>
              <strong style={{ color: '#cbd5e1' }}>API Gateway:</strong> tutti gli endpoint sono protetti da JWT Authorizer (Amazon Cognito). Ogni token è firmato RS256, ha scadenza breve e contiene l&apos;identificativo univoco dell&apos;organizzazione. Non è possibile accedere a dati di altre organizzazioni anche presentando un token valido.
            </p>
          </div>
        </div>

        {/* Incident response */}
        <div style={{ marginBottom: 80 }}>
          <SectionLabel>Risposta agli incidenti</SectionLabel>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 24px', letterSpacing: '-.03em' }}>
            Cosa facciamo in caso di breach
          </h2>
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.85 }}>
            <p>
              In caso di violazione della sicurezza che possa avere conseguenze sui dati personali, ci impegniamo a:
            </p>
            <ol>
              <li style={{ marginBottom: 10 }}><strong style={{ color: '#cbd5e1' }}>Contenimento (entro 1 ora):</strong> isolamento immediato dei sistemi compromessi</li>
              <li style={{ marginBottom: 10 }}><strong style={{ color: '#cbd5e1' }}>Notifica iniziale (entro 24 ore):</strong> comunicazione ai clienti interessati con informazioni disponibili</li>
              <li style={{ marginBottom: 10 }}><strong style={{ color: '#cbd5e1' }}>Notifica al Garante (entro 72 ore):</strong> in conformità all&apos;Art. 33 GDPR, qualora il breach comporti rischi per i diritti degli interessati</li>
              <li style={{ marginBottom: 10 }}><strong style={{ color: '#cbd5e1' }}>Post-mortem (entro 7 giorni):</strong> analisi della causa radice e misure correttive</li>
            </ol>
          </div>
        </div>

        {/* GDPR & compliance */}
        <div style={{ marginBottom: 80 }}>
          <SectionLabel>Conformità normativa</SectionLabel>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 24px', letterSpacing: '-.03em' }}>
            GDPR e framework di riferimento
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { title: 'GDPR (Reg. UE 2016/679)', desc: 'Piena conformità. DPA Art. 28 disponibile su richiesta. Dati solo in EU.' },
              { title: 'AI Act (Reg. UE 2024/1689)', desc: 'Actify stessa è conforme all\'AI Act come provider di tool AI per PMI.' },
              { title: 'Privacy by Design', desc: 'La protezione dei dati è integrata nell\'architettura, non aggiunta a posteriori.' },
              { title: 'Principio di minimizzazione', desc: 'Raccogliamo solo i dati strettamente necessari all\'erogazione del servizio.' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.15)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>✓ {item.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: 'linear-gradient(145deg, rgba(34,197,94,.07) 0%, rgba(255,255,255,.03) 100%)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 20, padding: '40px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px' }}>Hai trovato una vulnerabilità?</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 24px' }}>
            Prendiamo la sicurezza molto sul serio. Se hai trovato una potenziale vulnerabilità, ti chiediamo di segnalarcela in modo responsabile prima di divulgarla pubblicamente.
          </p>
          <a href="mailto:officialactify@gmail.com?subject=Security%20Disclosure" style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#22C55E',
            color: '#000',
            fontWeight: 800,
            fontSize: 14,
            borderRadius: 10,
            textDecoration: 'none',
          }}>
            Segnala un problema di sicurezza
          </a>
          <p style={{ fontSize: 12, color: '#334155', margin: '16px 0 0' }}>
            officialactify@gmail.com — risposta garantita entro 48 ore
          </p>
        </div>

      </div>

      <LegalFooter />
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: '#22C55E', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
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
