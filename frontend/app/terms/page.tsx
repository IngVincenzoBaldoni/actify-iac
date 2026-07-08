import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termini di Servizio — Actify',
  description: "Termini e condizioni d'uso della piattaforma Actify per la compliance AI Act. Titolare: BD TR S.R.L.",
  alternates: { canonical: '/terms' },
};

const LAST_UPDATE = '8 luglio 2026';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C0F', color: '#e2e8f0', fontFamily: 'inherit' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(8,12,15,.92)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', letterSpacing: '-0.5px' }}>Actify</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Torna alla home</a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#22C55E', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 6, padding: '3px 12px', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20 }}>
            Documento legale
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: '#f1f5f9', margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.15 }}>
            Termini di Servizio
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
            Ultimo aggiornamento: <strong style={{ color: '#94a3b8' }}>{LAST_UPDATE}</strong>
          </p>
        </div>

        <LegalSection title="1. Parti del contratto">
          <p>
            I presenti Termini di Servizio (&quot;Termini&quot;) regolano l&apos;accesso e l&apos;utilizzo della piattaforma <strong>Actify</strong>, accessibile su <strong>official-actify.com</strong>, fornita da:
          </p>
          <InfoBox>
            <strong>BD TR S.R.L.</strong> (&quot;Actify&quot;, &quot;noi&quot;, &quot;fornitore&quot;)<br />
            Via Santa Tecla 4, 20122 Milano (MI), Italia — P.IVA 14777710964
          </InfoBox>
          <p>
            Utilizzando la piattaforma, l&apos;utente (&quot;Cliente&quot;) accetta integralmente i presenti Termini. Se non accetti, non utilizzare il servizio.
          </p>
        </LegalSection>

        <LegalSection title="2. Descrizione del servizio">
          <p>
            Actify è una piattaforma SaaS (Software as a Service) che consente alle organizzazioni di:
          </p>
          <ul>
            <li>Censire e catalogare i propri sistemi di intelligenza artificiale (AI Passports Inventory)</li>
            <li>Analizzare la conformità al Regolamento UE 2024/1689 (EU AI Act) tramite AI-powered gap analysis</li>
            <li>Stimare l&apos;esposizione sanzionatoria ai sensi degli Art. 99-100 AI Act</li>
            <li>Gestire la formazione AI del personale (AI Literacy Tracker — Art. 4)</li>
            <li>Generare documentazione di conformità (Document Vault)</li>
            <li>Mantenere un Audit Trail immutabile delle attività di compliance</li>
          </ul>
          <p>
            Il servizio è fornito &quot;così com&apos;è&quot; e può essere aggiornato, migliorato o modificato nel tempo. Le funzionalità disponibili variano in base al piano di abbonamento sottoscritto.
          </p>
        </LegalSection>

        <LegalSection title="3. Account e registrazione">
          <p>
            Per accedere alla piattaforma è necessario creare un account. L&apos;utente è responsabile di:
          </p>
          <ul>
            <li>Fornire informazioni accurate e aggiornate in fase di registrazione</li>
            <li>Mantenere la riservatezza delle credenziali di accesso</li>
            <li>Tutte le attività eseguite sotto il proprio account</li>
            <li>Notificarci immediatamente in caso di accesso non autorizzato</li>
          </ul>
          <p>
            È consentito un solo account per organizzazione. La condivisione delle credenziali tra organizzazioni diverse è vietata.
          </p>
        </LegalSection>

        <LegalSection title="4. Piani di abbonamento e pagamento">
          <InfoBox>
            <strong>Trial</strong> — €19,90/mese · Fino a 5 sistemi AI · 1 utente<br />
            <strong>Starter</strong> — €59,90/mese · Fino a 10 sistemi AI · 3 utenti<br />
            <strong>Professional</strong> — €99,90/mese · Sistemi illimitati · 10 utenti<br />
            <strong>Enterprise</strong> — Prezzi su richiesta · Funzionalità avanzate
          </InfoBox>
          <ul>
            <li>I prezzi sono espressi in Euro e sono da intendersi IVA esclusa</li>
            <li>L&apos;abbonamento si rinnova automaticamente alla scadenza</li>
            <li>Il recesso deve essere comunicato almeno 5 giorni prima del rinnovo</li>
            <li>Non sono previsti rimborsi per frazioni di periodo già fatturato, salvo diverso accordo</li>
            <li>I prezzi possono essere aggiornati con preavviso di 30 giorni via email</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Utilizzo consentito">
          <p>Il Cliente si impegna a utilizzare la piattaforma esclusivamente per finalità lecite e conformi alla normativa vigente. È espressamente vietato:</p>
          <ul>
            <li>Inserire informazioni false, fuorvianti o fraudolente</li>
            <li>Tentare di accedere a dati di altri clienti</li>
            <li>Eseguire attività di scraping, reverse engineering o decompilazione</li>
            <li>Utilizzare la piattaforma per attività illegali o in violazione di diritti di terzi</li>
            <li>Condividere credenziali con utenti non autorizzati</li>
            <li>Sovraccaricare intenzionalmente l&apos;infrastruttura (DoS/DDoS)</li>
          </ul>
          <p>
            La violazione di queste norme può comportare la sospensione immediata dell&apos;account.
          </p>
        </LegalSection>

        <LegalSection title="6. Proprietà intellettuale">
          <p>
            Tutti i diritti di proprietà intellettuale relativi alla piattaforma Actify — inclusi software, algoritmi, interfaccia utente, design, marchi e documentazione — sono di esclusiva proprietà di BD TR S.R.L.
          </p>
          <p>
            I dati inseriti dal Cliente nella piattaforma (sistemi AI censiti, documenti generati) rimangono di proprietà del Cliente. Actify non rivendica alcun diritto sui contenuti del Cliente.
          </p>
          <p>
            Il Cliente concede ad Actify una licenza limitata, non esclusiva, per elaborare i dati inseriti al solo fine di fornire il servizio contrattualizzato.
          </p>
        </LegalSection>

        <LegalSection title="7. Disponibilità del servizio e SLA">
          <p>
            Actify si impegna a garantire una disponibilità del servizio pari ad almeno il <strong>99,0% mensile</strong> (escluse le finestre di manutenzione programmate, comunicate con almeno 48 ore di anticipo).
          </p>
          <p>
            Ci riserviamo il diritto di eseguire operazioni di manutenzione che possano temporaneamente ridurre la disponibilità. In tali casi, ci impegniamo a minimizzare i disservizi e a comunicarli tempestivamente.
          </p>
        </LegalSection>

        <LegalSection title="8. Limitazione di responsabilità">
          <p>
            Actify fornisce analisi di conformità <strong>a scopo informativo e di supporto decisionale</strong>. Le analisi generate dalla piattaforma — incluse le gap analysis AI Act e le stime sanzionatorie — non costituiscono parere legale e non sostituiscono la consulenza di professionisti abilitati.
          </p>
          <p>
            Nella misura massima consentita dalla legge applicabile, BD TR S.R.L. non sarà responsabile per:
          </p>
          <ul>
            <li>Danni indiretti, consequenziali o perdita di profitto</li>
            <li>Decisioni aziendali adottate sulla base delle analisi della piattaforma</li>
            <li>Indisponibilità del servizio causata da eventi fuori dal nostro controllo (forza maggiore)</li>
            <li>Accessi non autorizzati derivanti da negligenza nella custodia delle credenziali del Cliente</li>
          </ul>
          <p>
            La responsabilità complessiva di Actify nei confronti del Cliente non potrà in ogni caso superare i corrispettivi pagati negli ultimi 12 mesi.
          </p>
        </LegalSection>

        <LegalSection title="9. Trattamento dei dati personali">
          <p>
            Per le modalità di trattamento dei dati personali, si rimanda alla <a href="/privacy" style={{ color: '#22C55E' }}>Privacy Policy</a> di Actify, che costituisce parte integrante dei presenti Termini.
          </p>
          <p>
            Nella misura in cui Actify tratta dati personali per conto del Cliente, le parti stipulano un accordo di trattamento dei dati (DPA) conforme all&apos;Art. 28 GDPR. Il DPA è disponibile su richiesta scrivendo a <a href="mailto:officialactify@gmail.com" style={{ color: '#22C55E' }}>officialactify@gmail.com</a>.
          </p>
        </LegalSection>

        <LegalSection title="10. Risoluzione del contratto">
          <p>
            Il Cliente può recedere dal servizio in qualsiasi momento dal pannello delle impostazioni dell&apos;account o via email. La risoluzione ha effetto alla fine del periodo di fatturazione corrente.
          </p>
          <p>
            Actify può sospendere o terminare l&apos;accesso in caso di:
          </p>
          <ul>
            <li>Mancato pagamento oltre 15 giorni dalla scadenza</li>
            <li>Violazione dei presenti Termini</li>
            <li>Uso fraudolento o abusivo della piattaforma</li>
          </ul>
          <p>
            Alla cessazione del servizio, il Cliente ha 30 giorni per esportare i propri dati. Successivamente, i dati saranno cancellati in conformità alla Privacy Policy.
          </p>
        </LegalSection>

        <LegalSection title="11. Legge applicabile e foro competente">
          <p>
            I presenti Termini sono regolati dalla <strong>legge italiana</strong>. Per qualsiasi controversia derivante dall&apos;interpretazione o dall&apos;esecuzione dei presenti Termini, le parti riconoscono la competenza esclusiva del <strong>Tribunale di Milano</strong>.
          </p>
        </LegalSection>

        <LegalSection title="12. Modifiche ai Termini">
          <p>
            Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno comunicate via email agli utenti registrati con almeno <strong>30 giorni di preavviso</strong>. L&apos;uso continuato della piattaforma dopo tale data costituisce accettazione delle modifiche.
          </p>
        </LegalSection>

        <LegalSection title="13. Contatti">
          <InfoBox>
            Per domande sui presenti Termini:<br /><br />
            <a href="mailto:officialactify@gmail.com" style={{ color: '#22C55E' }}>officialactify@gmail.com</a><br />
            BD TR S.R.L. — Via Santa Tecla 4, 20122 Milano (MI) — P.IVA 14777710964
          </InfoBox>
        </LegalSection>

      </div>

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
