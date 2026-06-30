'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ComplianceCheck, ComplianceGap, ComplianceResult, ChecklistEntry, ActifyDocument, DocGeneration } from '@/lib/types';
import { normalizeEntry } from '@/lib/types';
import { SanctionOverview } from '@/components/SanctionOverview';

// ─── Article Sidebar ──────────────────────────────────────────────────────────

function parseArticleNum(article: string): number | null {
  const m = article.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}
function isArt4Gap(article: string) { return /^Art\.?\s*4$/i.test(article); }

function formatArticleText(text: string): React.ReactNode {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} style={{ margin: '0 0 1.1em 0', lineHeight: 1.8, color: 'var(--text2)', fontSize: 13 }}>
      {para.split('\n').map((line, j, arr) => (
        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
      ))}
    </p>
  ));
}

function ArticleSidebar({ articleNum, onClose }: { articleNum: number; onClose: () => void }) {
  const [text, setText]       = useState('');
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // trigger slide-in on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    setLoading(true);
    setText('');
    setTitle('');
    api.articles.get(articleNum)
      .then((d: { text: string; article_title: string }) => { setText(d.text); setTitle(d.article_title); })
      .catch(() => setText(''))
      .finally(() => setLoading(false));
    return () => cancelAnimationFrame(raf);
  }, [articleNum]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.28s ease',
        cursor: 'pointer',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 460,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 401, display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--green)', marginBottom: 6 }}>
                Reg. UE 2024/1689 — Testo ufficiale
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.4, lineHeight: 1.2 }}>
                Art. {articleNum}
                {title && <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: 15 }}> — {title}</span>}
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: '5px 9px', borderRadius: 7, lineHeight: 1, transition: 'all .15s', flexShrink: 0 }}>
              ✕
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <a
              href={`/dashboard/ai-act?article=${articleNum}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--green)', textDecoration: 'none', padding: '5px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7 }}>
              ⚖️ Apri nel Testo AI Act →
            </a>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
              <div className="spin" style={{ width: 32, height: 32, borderWidth: 2, margin: 0 }} />
            </div>
          )}
          {!loading && !text && (
            <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>
              Testo non disponibile per questo articolo.
            </div>
          )}
          {!loading && text && formatArticleText(text)}
        </div>
      </div>
    </>
  );
}

const AUTO_LABELS: Record<string, string> = {
  document_generation:    'Documentazione Tecnica',
  policy_template:        'Policy AI Interna',
  transparency_notice:    'Notice di Trasparenza',
  risk_assessment:        'FRIA — Valutazione Impatto',
  monitoring_plan:        'Piano di Monitoraggio',
  conformity_declaration: 'Dichiarazione di Conformità UE',
};

// ─── Doc Scope Info ───────────────────────────────────────────────────────────

interface DocScopeEntry {
  icon:             string;
  label:            string;
  articles:         string;
  scope:            string;
  howToUse:         string[];
  howToValidate:    string[];
  complianceImpact: string;
  template:         string;
}

const DOC_SCOPE_INFO: Record<string, DocScopeEntry> = {
  monitoring_plan: {
    icon:    '📊',
    label:   'Piano di Monitoraggio',
    articles:'Art. 9 · Art. 14 · Art. 72',
    scope:   'Definisce le metriche, le soglie di allerta e le procedure di supervisione umana del sistema AI. Documenta come l\'organizzazione mantiene il controllo sulle performance nel tempo e gestisce le anomalie.',
    howToUse: [
      'Condividi il documento con il responsabile operativo del sistema AI',
      'Implementa le metriche e i KPI definiti nel documento nel tuo sistema di monitoring',
      'Esegui le review alla frequenza indicata (mensile/trimestrale)',
      'Aggiorna il documento al cambio di versione del sistema',
    ],
    howToValidate: [
      'Verifica che tutte le metriche abbiano soglie quantitative definite',
      'Controlla che le procedure di escalation abbiano responsabili nominati',
      'Assicurati che il registro degli interventi umani sia compilato e aggiornato',
      'Firma del responsabile AI e del supervisore operativo',
    ],
    complianceImpact: 'Chiude i gap Art. 9 (Risk Management), Art. 14 (Supervisione umana) e Art. 72 (Post-market monitoring). Dimostra alle autorità che il sistema è monitorato attivamente e che esiste una catena di responsabilità documentata.',
    template: `PIANO DI MONITORAGGIO AI
Art. 9 / Art. 14 / Art. 72 — Reg. UE 2024/1689
────────────────────────────────────────────────

1. IDENTIFICAZIONE DEL SISTEMA AI
   Denominazione: [Nome sistema]
   Organizzazione: [Provider / Deployer]
   Versione: [x.x] | Data: [GG/MM/AAAA]

2. OBIETTIVI DI MONITORAGGIO
   • Accuratezza previsioni ≥ [XX]%
   • Latenza media < [XXX] ms
   • Tasso di falsi positivi < [X]%
   • [Altra metrica specifica del sistema]

3. METRICHE E KPI
   Metrica           | Soglia | Frequenza   | Responsabile
   ──────────────────|────────|─────────────|─────────────
   [Metrica 1]       | [val]  | Giornaliera | [Ruolo]
   [Metrica 2]       | [val]  | Settimanale | [Ruolo]
   [Metrica 3]       | [val]  | Mensile     | [Ruolo]

4. SOGLIE DI ALLERTA ED ESCALATION
   🟡 Warning:  deviazione > 10% dalla baseline
      → Notifica a [Ruolo] entro 4h
   🔴 Critico:  deviazione > 25%
      → Escalation immediata a [CdA / DPO]
      → Possibile sospensione del sistema

5. SUPERVISIONE UMANA (Art. 14)
   • Revisione settimanale: [Responsabile]
   • Override manuale: procedure definite al §4
   • Registro interventi: [sistema/tool utilizzato]
   • Decisioni non delegabili all'AI: [elenco]

6. FREQUENZA DI REVIEW
   Review operativa:  mensile
   Review strategica: semestrale
   Audit interno:     annuale
   Riesame sistema:   ad ogni aggiornamento major

Firma Responsabile AI: _____________ Data: ______`,
  },

  transparency_notice: {
    icon:    '📢',
    label:   'Notice di Trasparenza',
    articles:'Art. 50 · Art. 13',
    scope:   'Informa gli utenti finali che stanno interagendo con un sistema AI, descrive le sue capacità e limitazioni, e indica come esercitare i propri diritti. È un documento rivolto al pubblico o agli utenti diretti del sistema.',
    howToUse: [
      'Pubblica la notice in un punto visibile prima dell\'interazione con il sistema AI',
      'Assicurati che sia redatta in linguaggio chiaro e comprensibile al pubblico di riferimento',
      'Includi un link alla notice nel contratto o nei termini di servizio',
      'Aggiornala ad ogni modifica sostanziale del sistema AI',
    ],
    howToValidate: [
      'Verifica che menzioni esplicitamente la natura artificiale del sistema',
      'Controlla che le limitazioni siano descritte in modo onesto e completo',
      'Assicurati che i diritti dell\'utente (revisione umana, spiegazione) siano chiari',
      'Fai revisionare da un legale esperto in GDPR e AI Act',
    ],
    complianceImpact: 'Chiude i gap Art. 50 (Trasparenza verso utenti finali) e Art. 13 (Trasparenza verso deployer). Previene contestazioni per inganno o mancata disclosure. In caso di ispezione, dimostra che gli utenti erano informati della natura AI del sistema.',
    template: `INFORMATIVA AI — SISTEMA [Nome]
Art. 50 — Reg. UE 2024/1689
────────────────────────────────────────────────

⚠ NOTIFICA OBBLIGATORIA AI ACT

Stai interagendo con un sistema basato su
intelligenza artificiale.

NATURA DEL SISTEMA
Questo servizio utilizza [tipo di tecnologia AI]
per [descrizione della finalità].
Il sistema non sostituisce in alcun modo
il giudizio professionale umano.

COSA PUÒ FARE QUESTO SISTEMA
  ✓ [Capacità principale 1]
  ✓ [Capacità principale 2]
  ✓ [Capacità principale 3]
  ✗ Non può: [limitazione importante 1]
  ✗ Non può: [limitazione importante 2]

DATI ELABORATI
Il sistema tratta: [categorie di dati]
Base legale (GDPR): Art. [XX] — [descrizione]
Periodo conservazione: [X] mesi

I TUOI DIRITTI
  • Richiedi spiegazione delle decisioni automatizzate
  • Chiedi revisione umana in qualsiasi momento
  • Opponi al trattamento automatizzato (Art. 22 GDPR)
  • Contatta: [email DPO o referente AI]

Provider del sistema AI: [Nome organizzazione]
Ultimo aggiornamento notice: [GG/MM/AAAA]`,
  },

  risk_assessment: {
    icon:    '⚠️',
    label:   'FRIA — Valutazione Impatto Diritti Fondamentali',
    articles:'Art. 27',
    scope:   'La Fundamental Rights Impact Assessment valuta sistematicamente i rischi che il sistema AI pone sui diritti fondamentali delle persone coinvolte — in particolare per i gruppi vulnerabili. È obbligatoria per i deployer di sistemi ad alto rischio nel settore pubblico e privato.',
    howToUse: [
      'Coinvolgi i rappresentanti dei gruppi potenzialmente impattati nella redazione',
      'Consulta il DPO e il responsabile legale per la sezione sui diritti GDPR',
      'Aggiorna la FRIA ad ogni cambiamento sostanziale del contesto di deployment',
      'Conserva tutte le versioni storiche — le autorità potrebbero richiederle',
    ],
    howToValidate: [
      'Ogni diritto fondamentale a rischio deve avere misura di mitigazione corrispondente',
      'I gruppi vulnerabili devono essere identificati esplicitamente',
      'La sezione conclusiva deve essere firmata dal responsabile legale',
      'Verifica la coerenza con la DPIA (Data Protection Impact Assessment) GDPR',
    ],
    complianceImpact: 'Chiude il gap Art. 27 e dimostra la due diligence sui diritti fondamentali. Senza FRIA, le autorità possono imporre la sospensione del sistema. Con FRIA ben redatta, si riduce drasticamente il rischio di sanzioni ex Art. 99.',
    template: `FRIA — VALUTAZIONE IMPATTO DIRITTI FONDAMENTALI
Art. 27 — Reg. UE 2024/1689
────────────────────────────────────────────────

SISTEMA AI VALUTATO
Nome: [Nome sistema] | Categoria: Alto Rischio
Allegato III, §[X] | Versione: [x.x]
Data valutazione: [GG/MM/AAAA]

1. DESCRIZIONE DELL'USO PREVISTO
   Contesto di deployment: [descrizione]
   Utenti finali: [categorie di persone coinvolte]
   Volume stimato: [N] decisioni/[periodo]
   Impatto per persona: [descrizione effetti]

2. DIRITTI FONDAMENTALI A RISCHIO
   Diritto             | Rischio  | Prob.  | Gravità
   ────────────────────|──────────|────────|────────
   Non discriminazione | [Alto]   | [Med]  | [Alta]
   Privacy             | [Medio]  | [Alta] | [Med]
   Ricorso effettivo   | [Basso]  | [Bass] | [Bass]
   [Altro diritto]     | [...]    | [...]  | [...]

3. GRUPPI VULNERABILI IDENTIFICATI
   • Minori (< 18 anni): [impatto atteso e misure]
   • Persone con disabilità: [impatto atteso e misure]
   • [Gruppo specifico]: [impatto atteso e misure]

4. MISURE DI MITIGAZIONE
   ✓ [Misura 1] → riduce rischio [diritto X] del [X]%
   ✓ [Misura 2] → protegge da [scenario specifico]
   ✓ [Misura 3] → garantisce [diritto Y]

5. PIANO DI MONITORAGGIO IMPATTI
   Frequenza revisione FRIA: [annuale / ad evento]
   Responsabile: [Ruolo/Nome]
   KPI impatto: [metrica misurabile]

6. CONCLUSIONE E FIRME
   La FRIA attesta la conformità all'Art. 27.

   Responsabile FRIA: _____________ Data: ______
   Approvazione DPO:  _____________ Data: ______`,
  },

  policy_template: {
    icon:    '📋',
    label:   'Policy AI Interna',
    articles:'Art. 17 · Art. 26',
    scope:   'La Policy AI Interna definisce il framework di governance con cui l\'organizzazione gestisce i sistemi AI: principi, responsabilità, processi di approvazione, obblighi del personale e gestione dei fornitori. È il documento madre della governance AI aziendale.',
    howToUse: [
      'Fai approvare la policy dal CdA o dall\'organo di vertice competente',
      'Distribuisci a tutto il personale che interagisce con sistemi AI',
      'Integra nella procedura di onboarding dei nuovi dipendenti',
      'Usa come riferimento per approvare nuovi sistemi AI e gestire i fornitori',
    ],
    howToValidate: [
      'Ogni principio deve avere una procedura operativa corrispondente',
      'I ruoli e le responsabilità devono essere nominativi, non solo funzionali',
      'Verifica che la policy sia coerente con le politiche HR e GDPR esistenti',
      'Data di approvazione e firma del legale rappresentante obbligatorie',
    ],
    complianceImpact: 'Chiude i gap Art. 17 (Quality Management System per provider) e Art. 26 (Obblighi deployer). Dimostra che l\'organizzazione ha un sistema strutturato di governance AI — uno dei fattori più valutati dalle autorità in sede di ispezione.',
    template: `POLITICA INTERNA AI
Art. 17 / Art. 26 — Reg. UE 2024/1689
────────────────────────────────────────────────
Versione 1.0 | Approvata il: [GG/MM/AAAA]
Prossima revisione: [GG/MM/AAAA]

1. PRINCIPI GUIDA
   • Trasparenza: tutti gli usi AI sono documentati
   • Responsabilità: ogni sistema ha un owner nominato
   • Equità: monitoraggio attivo dei bias
   • Sicurezza: valutazione rischi pre-deploy obbligatoria
   • Proporzionalità: AI usata dove aggiunge valore reale

2. GOVERNANCE AI
   AI Governance Officer: [Nome/Ruolo]
   Comitato di approvazione: [Composizione]
   DPO (riferimento GDPR/AI): [Nome]
   Frequenza review policy: semestrale

3. CICLO DI VITA DEI SISTEMI AI
   Proposta → Valutazione rischio (FRIA) →
   Approvazione Comitato → Pilot →
   Deploy controllato → Monitoraggio →
   Review periodica → Decommissioning

4. OBBLIGHI DEL PERSONALE
   • Completare formazione Art. 4 entro [data]
   • Segnalare anomalie AI entro 24h a [referente]
   • Non utilizzare AI non approvata (shadow AI)
   • Partecipare alle review periodiche del sistema

5. GESTIONE FORNITORI AI
   • Contratti con clausole AI Act obbligatorie
   • Audit fornitori: annuale
   • Registro fornitori AI: aggiornato e condiviso
   • Valutazione compliance supplier: pre-onboarding

6. SANZIONI INTERNE
   Violazione policy: [procedura disciplinare applicabile]
   Escalation: [iter gerarchico]

Firma Legale Rappresentante: __________ Data: ______
Firma AI Governance Officer: __________ Data: ______`,
  },

  document_generation: {
    icon:    '📄',
    label:   'Documentazione Tecnica',
    articles:'Art. 11',
    scope:   'La Documentazione Tecnica è il documento obbligatorio per i provider di sistemi ad alto rischio. Descrive in modo completo architettura, dataset, performance, gestione dei rischi e ciclo di vita del sistema AI. Deve essere mantenuta aggiornata per tutta la vita del sistema.',
    howToUse: [
      'Conserva la documentazione tecnica insieme al codice sorgente o nei sistemi di configuration management',
      'Aggiorna obbligatoriamente ad ogni modifica sostanziale del sistema',
      'Metti a disposizione delle autorità di vigilanza su richiesta (entro 10 giorni)',
      'Usa come base per la Dichiarazione di Conformità (Art. 47)',
    ],
    howToValidate: [
      'Verifica che la descrizione dell\'architettura corrisponda alla realtà implementativa',
      'Controlla che le metriche di performance siano supportate da test recenti',
      'Assicurati che i dataset siano documentati con provenienza e metodi di pulizia',
      'Firma del responsabile tecnico e data di ultima revisione obbligatorie',
    ],
    complianceImpact: 'Chiude il gap Art. 11, prerequisito per la Dichiarazione di Conformità e l\'iscrizione nel database EU AI (Art. 49). Senza documentazione tecnica, il sistema non può legalmente essere immesso sul mercato EU come sistema ad alto rischio.',
    template: `DOCUMENTAZIONE TECNICA AI
Art. 11 — Reg. UE 2024/1689
────────────────────────────────────────────────

1. INFORMAZIONI GENERALI
   Denominazione: [Nome sistema AI]
   Provider: [Nome organizzazione]
   Versione documentazione: [x.x]
   Data ultima revisione: [GG/MM/AAAA]
   Categoria rischio: Alto Rischio — All. III, §[X]

2. DESCRIZIONE GENERALE DEL SISTEMA
   Finalità dichiarata: [Descrizione scopo]
   Architettura: [Tipo modello — es. LLM, CNN, RF]
   Input accettati: [Descrizione dati in ingresso]
   Output prodotti: [Decisioni / previsioni / classificazioni]
   Casi d\'uso previsti: [Elenco]
   Casi d\'uso esclusi: [Elenco]

3. DATASET DI ADDESTRAMENTO E VALIDAZIONE
   Fonte dati: [Origine / fornitore]
   Volume training set: [N] campioni
   Volume validation set: [N] campioni
   Periodo copertura dati: [date]
   Metodi di preprocessing: [descrizione]
   Misure anti-bias applicate: [descrizione]

4. PERFORMANCE E METRICHE (TEST SET INDIPENDENTE)
   Metrica      | Valore ottenuto | Soglia minima
   ─────────────|─────────────────|──────────────
   Accuratezza  | [XX.X]%         | ≥ [YY]%
   F1-Score     | [X.XX]          | ≥ [Y.YY]
   [Metrica 3]  | [...]           | ≥ [...]

5. GESTIONE DEL RISCHIO TECNICO
   Rischi identificati: [lista con livello]
   Misure tecniche di mitigazione: [lista]
   Test di robustezza e adversarial: [risultati]
   Vulnerabilità note: [descrizione e piano]

6. MANUTENZIONE E AGGIORNAMENTI
   Responsabile tecnico: [Nome/Ruolo]
   Frequenza aggiornamenti pianificati: [ciclo]
   Procedura di change management: [riferimento]
   Soglia per re-training: [criterio]

Firma Responsabile Tecnico: __________ Data: ______`,
  },

  conformity_declaration: {
    icon:    '✅',
    label:   'Dichiarazione UE di Conformità',
    articles:'Art. 47 · Art. 49',
    scope:   'La Dichiarazione UE di Conformità è il documento formale con cui il provider dichiara sotto la propria responsabilità che il sistema AI soddisfa i requisiti del Reg. UE 2024/1689. È il documento finale del percorso di conformità e prerequisito per l\'iscrizione nel database EU AI.',
    howToUse: [
      'Compila solo dopo aver completato tutti i requisiti tecnici (Art. 9-15)',
      'Firma dal legale rappresentante o dal responsabile AI nominato',
      'Conserva per almeno 10 anni dalla messa sul mercato del sistema',
      'Usa per la registrazione nel database EU AI (eUID obbligatorio per sistemi All. III)',
    ],
    howToValidate: [
      'Verifica che tutti gli articoli citati abbiano documentazione di supporto nel vault',
      'Controlla che la versione del sistema dichiarata corrisponda a quella in produzione',
      'Firma e timbro del legale rappresentante obbligatori (non delegabile)',
      'Aggiorna la dichiarazione ad ogni modifica sostanziale del sistema',
    ],
    complianceImpact: 'Chiude i gap Art. 47 e Art. 49. È il documento "sigillo" che attesta la conformità complessiva al Reg. UE 2024/1689. La sua assenza costituisce violazione autonoma sanzionabile, indipendentemente dalla conformità sostanziale del sistema.',
    template: `DICHIARAZIONE UE DI CONFORMITÀ
Art. 47 — Reg. UE 2024/1689
────────────────────────────────────────────────

Il/La sottoscritto/a, in qualità di Legale
Rappresentante di:

   [Nome e forma giuridica dell'organizzazione]
   [Indirizzo sede legale]
   [P.IVA / C.F. / Registro Imprese]

DICHIARA SOTTO LA PROPRIA RESPONSABILITÀ

che il sistema di intelligenza artificiale:

   ┌───────────────────────────────────────┐
   │  Denominazione: [Nome sistema AI]     │
   │  Versione:      [x.x]                │
   │  ID interno:    [identificativo]      │
   │  Scopo:         [finalità dichiarata] │
   └───────────────────────────────────────┘

rientra nella categoria ALTO RISCHIO
ai sensi dell'Allegato III, §[X] del Reg. UE 2024/1689
ed è conforme ai seguenti requisiti essenziali:

   ✓ Art. 9  — Sistema di gestione del rischio
   ✓ Art. 10 — Qualità dei dati e governance
   ✓ Art. 11 — Documentazione tecnica
   ✓ Art. 12 — Conservazione dei log
   ✓ Art. 13 — Trasparenza e informazione
   ✓ Art. 14 — Supervisione umana
   ✓ Art. 15 — Accuratezza, robustezza, sicurezza

Norme tecniche armonizzate applicate:
   [ISO/IEC XXXXX:AAAA] — [Titolo norma]
   [Altra norma se applicabile]

Documentazione tecnica conservata presso:
   [Luogo / sistema documentale]

Luogo e data: ______________, __/__/20__

___________________________________
[Nome e Cognome]
[Ruolo — Legale Rappresentante]
[Timbro aziendale]`,
  },
};

// ─── Document Scope Modal ─────────────────────────────────────────────────────

function DocScopeModal({ gap, onConfirm, onClose, generating }: {
  gap:        ComplianceGap;
  onConfirm:  () => void;
  onClose:    () => void;
  generating: boolean;
}) {
  const info = DOC_SCOPE_INFO[gap.automation_type!];
  if (!info) { onConfirm(); return null; }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px 32px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 860,
          background: 'linear-gradient(145deg, rgba(24,24,36,0.99) 0%, rgba(16,16,28,1) 100%)',
          border: '1px solid rgba(255,255,255,.12)',
          borderTop: '2px solid rgba(99,102,241,.6)',
          borderRadius: 20,
          boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 80px rgba(0,0,0,.8)',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* ── Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(99,102,241,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(99,102,241,.12)', border: '1.5px solid rgba(99,102,241,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              {info.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#818CF8',
                  background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)',
                  borderRadius: 6, padding: '2px 9px', letterSpacing: 0.4,
                }}>
                  {info.articles}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#22C55E',
                  background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)',
                  borderRadius: 6, padding: '2px 9px',
                }}>
                  Generato da Actify AI
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: -0.4 }}>
                {info.label}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Documento di compliance per: <strong style={{ color: 'var(--text2)' }}>{gap.requirement}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,.12)', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* ── Body: 2 colonne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

          {/* Colonna sinistra — info */}
          <div style={{ padding: '24px 24px 24px 28px', borderRight: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Scope */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                A cosa serve
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                {info.scope}
              </p>
            </div>

            {/* Come usarlo */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Come usarlo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {info.howToUse.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(14,165,233,.15)', border: '1px solid rgba(14,165,233,.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: '#38BDF8', marginTop: 1,
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Come validarlo */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Come validarlo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {info.howToValidate.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1, fontSize: 13 }}>✓</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impatto compliance */}
            <div style={{
              background: 'rgba(34,197,94,.07)',
              border: '1px solid rgba(34,197,94,.2)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Impatto sulla compliance
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>
                {info.complianceImpact}
              </p>
            </div>

          </div>

          {/* Colonna destra — template preview */}
          <div style={{ padding: '24px 28px 24px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Bozza template — struttura del documento
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(0,0,0,.35)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10,
              padding: '16px 18px',
              overflowY: 'auto',
              maxHeight: 420,
            }}>
              <pre style={{
                fontSize: 11.5, lineHeight: 1.7, color: 'rgba(255,255,255,.7)',
                fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {info.template}
              </pre>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>
              I campi tra <code style={{ color: '#818CF8', background: 'rgba(99,102,241,.12)', padding: '1px 5px', borderRadius: 3 }}>[parentesi]</code> vengono compilati automaticamente da Actify AI sulla base dei dati del tuo sistema AI.
            </div>
          </div>

        </div>

        {/* ── AI disclaimer banner */}
        <div style={{
          margin: '0 28px 0',
          padding: '10px 14px',
          background: 'rgba(245,158,11,.07)',
          border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 10,
          fontSize: 12,
          color: 'rgba(251,191,36,.9)',
          lineHeight: 1.55,
        }}>
          <strong>Nota:</strong> il documento è generato automaticamente da un template standard + AI sulla base dei dati del tuo sistema.
          Devi <strong>validare integralmente la struttura</strong>, completare i campi [DA COMPLETARE], e puoi aggiungere o rimuovere paragrafi liberamente prima di firmarlo e depositarlo.
        </div>

        {/* ── Footer */}
        <div style={{
          padding: '16px 28px 18px',
          borderTop: '1px solid rgba(255,255,255,.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: 'rgba(0,0,0,.2)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Il documento verrà personalizzato per il tuo sistema
            e <strong style={{ color: 'var(--text2)' }}>salvato automaticamente nel Document Vault</strong>.
          </div>
          <button
            onClick={onConfirm}
            disabled={generating}
            style={{
              flexShrink: 0,
              background: generating ? 'rgba(99,102,241,.4)' : 'linear-gradient(135deg, #6C47FF, #818CF8)',
              color: '#fff', border: 'none', borderRadius: 11,
              padding: '13px 28px', fontSize: 14, fontWeight: 800,
              cursor: generating ? 'not-allowed' : 'pointer',
              boxShadow: generating ? 'none' : '0 4px 20px rgba(108,71,255,.5)',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {generating
              ? <><span className="spin-sm" /> Avvio generazione…</>
              : '⚡ Genera e Salva nel Vault →'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Preview Modal ───────────────────────────────────────────────────

function DocumentPreviewModal({ doc, onMarkReady, onClose }: {
  doc:         ActifyDocument;
  onMarkReady: () => void;
  onClose:     () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-badge">Bozza</div>
            <h2 className="modal-title">{doc.title}</h2>
            <p className="modal-meta">{doc.article} · Generato il {new Date(doc.generated_at).toLocaleDateString('it-IT')}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <iframe src={doc.preview_url} className="pdf-preview-frame" title="Anteprima documento" />
          <p className="modal-disclaimer">
            ⚠ Verifica il documento. Puoi scaricarlo, modificarlo e ricaricarlo nel Document Vault.
            Quando sei pronto, segnalo come READY — solo allora potrai chiudere il gap.
          </p>
        </div>
        <div className="modal-footer">
          <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="btn-doc-download">
            ⬇ Scarica PDF
          </a>
          <button className="btn-doc-finalize" onClick={onMarkReady}>
            ✓ Segna come READY
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gap Generate Block ───────────────────────────────────────────────────────

const GEN_STATUS_LABELS: Record<string, string> = {
  QUEUED:           'In coda…',
  RUNNING:          'Generazione in corso (~60s)…',
  DRAFT_READY:      'Bozza pronta',
  REVIEW_REQUIRED:  'Revisione richiesta',
  FAILED:           'Generazione fallita',
};

function GapGenerateBlock({ gap, doc, gen, generating, onGenerate, onFinalize, onRegenerate, onOpenPreview, onSanctionUpdate, onCloseGap }: {
  gap:                ComplianceGap;
  doc?:               ActifyDocument;
  gen?:               DocGeneration;
  generating:         boolean;
  onGenerate:         () => void;
  onFinalize:         (docId: string) => void;
  onRegenerate:       (docId: string) => void;
  onOpenPreview:      (doc: ActifyDocument) => void;
  onSanctionUpdate?:  () => void;
  onCloseGap?:        (gapId: string, evidenceNote?: string, proofFile?: File) => Promise<void>;
}) {
  const [showScope, setShowScope] = useState(false);
  const typeLabel = AUTO_LABELS[gap.automation_type!] ?? (gap.automation_type ?? '').replace(/_/g, ' ');

  // Pipeline states take priority over legacy doc states
  if (gen?.status === 'QUEUED' || gen?.status === 'RUNNING') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-running">
          <span className="spin-sm" /> {GEN_STATUS_LABELS[gen.status]}
        </div>
      </div>
    );
  }

  if (gen?.status === 'FAILED') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-error">
          ⚠ {gen.errorMessage ?? 'Errore nella generazione del documento'}
        </div>
        <button className="btn-generate" onClick={onGenerate} disabled={generating}>
          <span>↻</span> Riprova
        </button>
      </div>
    );
  }

  if (gen?.status === 'REVIEW_REQUIRED') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-error" style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', color: '#f59e0b' }}>
          ⚠ Validazione non superata — revisione manuale richiesta
          {gen.errorMessage && <p style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{gen.errorMessage}</p>}
        </div>
        <button className="btn-generate" onClick={onGenerate} disabled={generating}>
          <span>↻</span> Rigenera
        </button>
      </div>
    );
  }

  // Legacy doc-based rendering (includes DRAFT_READY with linked doc)
  if (!doc || doc.status === 'error') {
    return (
      <>
        <div className="gap-gen-block">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <div className="gap-gen-type">{typeLabel}</div>
            {gap.automation_type && DOC_SCOPE_INFO[gap.automation_type] && (
              <button
                onClick={() => setShowScope(true)}
                style={{ fontSize: 11, fontWeight: 600, color: '#818CF8', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
              >
                ℹ Scopri il documento →
              </button>
            )}
          </div>
          {doc?.status === 'error' && (
            <div className="gap-gen-error">⚠ Errore nella generazione: {doc.error_message ?? 'errore sconosciuto'}</div>
          )}
          <button
            className="btn-generate"
            onClick={() => gap.automation_type && DOC_SCOPE_INFO[gap.automation_type] ? setShowScope(true) : onGenerate()}
            disabled={generating}
          >
            {generating ? <><span className="spin-sm" /> Avvio generazione…</> : <><span>⚡</span> Genera con Actify</>}
          </button>
        </div>
        {showScope && (
          <DocScopeModal
            gap={gap}
            generating={generating}
            onConfirm={() => { setShowScope(false); onGenerate(); }}
            onClose={() => setShowScope(false)}
          />
        )}
      </>
    );
  }

  if (doc.status === 'generating') {
    return (
      <div className="gap-gen-block">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-running"><span className="spin-sm" /> Generazione in corso (~60s)…</div>
      </div>
    );
  }

  if (doc.status === 'draft') {
    const isTechDoc = gap.automation_type === 'document_generation';
    return (
      <div className="gap-gen-block gap-gen-draft">
        <div className="gap-gen-type">{typeLabel}</div>
        <div className="gap-gen-doc-row">
          <span className="gap-gen-doc-title">📄 {doc.title}</span>
          <span className="badge-draft">Salvato nel Vault</span>
        </div>
        <p className="gap-gen-hint">
          {isTechDoc
            ? 'Scarica il file .docx dal Document Vault, completa tutti i campi seguendo la struttura del documento, poi ricaricalo firmato tramite "↑ Ricarica" nel Vault. Una volta caricata la versione finalizzata, torna qui e segna il gap come conforme.'
            : 'Il documento è stato salvato nel Document Vault. Aprilo dal Vault per scaricarlo e verificarlo.'}
        </p>
        <div className="gap-gen-actions" style={{ marginBottom: 14 }}>
          <button className="btn-doc-regen" onClick={() => onRegenerate(doc.document_id)}>↻ Rigenera</button>
        </div>
        {onCloseGap && (
          <div className="gap-gen-close-gap">
            <div style={{
              background: 'rgba(202,138,4,.1)',
              border: '1px solid rgba(202,138,4,.35)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 14,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FCD34D', marginBottom: 4 }}>
                  Azione richiesta prima di dichiarare la conformità
                </div>
                <p style={{ fontSize: 12.5, color: 'rgba(252,211,77,.85)', lineHeight: 1.6, margin: 0 }}>
                  {isTechDoc
                    ? <>Segna il gap come conforme solo dopo aver <strong>completato e firmato</strong> la Documentazione Tecnica. Se non hai ancora ricaricato la versione firmata nel Vault, il gap risulterà conforme <strong>con avviso</strong> fino al caricamento.</>
                    : <>Segna questo gap come conforme solo dopo aver <strong>implementato concretamente tutte le azioni necessarie</strong> per soddisfare il requisito. Il documento generato è una prova documentale, ma non sostituisce l&apos;implementazione operativa. Dichiarare la conformità senza aver agito costituisce una falsa attestazione in sede ispettiva.</>}
                </p>
              </div>
            </div>
            <button
              className="btn-hybrid-close"
              onClick={() => onCloseGap(gap.gap_id, isTechDoc ? '_no_finalized_doc' : undefined)}>
              ✓ Segna gap come conforme
            </button>
          </div>
        )}
      </div>
    );
  }

  // final = READY
  return (
    <div className="gap-gen-block gap-gen-final">
      <div className="gap-gen-done-row">
        <span className="gap-gen-done-badge">✓ Documento READY</span>
        <span className="gap-gen-doc-title">{doc.title}</span>
      </div>
      <div className="gap-gen-actions" style={{ marginBottom: 12 }}>
        <button className="btn-doc-regen" onClick={() => onRegenerate(doc.document_id)}>↻ Rigenera</button>
      </div>
      {onCloseGap && (
        <div className="gap-gen-close-gap">
          <div style={{
            background: 'rgba(202,138,4,.1)',
            border: '1px solid rgba(202,138,4,.35)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 14,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FCD34D', marginBottom: 4 }}>
                Azione richiesta prima di dichiarare la conformità
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(252,211,77,.85)', lineHeight: 1.6, margin: 0 }}>
                Segna questo gap come conforme solo dopo aver <strong>implementato concretamente tutte le azioni necessarie</strong> per soddisfare il requisito.
                Il documento generato è una prova documentale, ma non sostituisce l&apos;implementazione operativa.
                Dichiarare la conformità senza aver agito costituisce una falsa attestazione in sede ispettiva.
              </p>
            </div>
          </div>
          <button
            className="btn-hybrid-close"
            onClick={() => onCloseGap(gap.gap_id)}>
            ✓ Segna gap come conforme
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HYBRID gap action panel (document ready, operational action pending) ─────

function HybridActionPanel({ gap, doc, onCloseGap }: {
  gap:        ComplianceGap;
  doc?:       ActifyDocument;
  onCloseGap: (gapId: string, evidenceNote?: string, proofFile?: File) => Promise<void>;
}) {
  const [note, setNote]           = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [closing, setClosing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleClose() {
    setClosing(true);
    setError(null);
    try {
      await onCloseGap(gap.gap_id, note || undefined, proofFile || undefined);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore nel salvataggio');
      setClosing(false);
    }
  }

  return (
    <div className="hybrid-action-panel">
      <div className="hybrid-action-banner">
        <span className="hybrid-action-icon">⚡</span>
        <div>
          <strong>Azione operativa richiesta</strong>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--dim)' }}>
            Il documento è pronto nel Vault. Implementa il requisito operativamente, poi dichiara la conformità.
          </p>
        </div>
      </div>

      {doc?.preview_url && (
        <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="btn-doc-open" style={{ display: 'inline-flex', marginBottom: 10 }}>
          📄 Apri documento nel Vault
        </a>
      )}

      <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 10 }}>
        <strong>Cosa fare:</strong> {gap.what_to_do}
      </p>

      <label style={{ display: 'block', fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>
        📎 Carica prova (PDF/immagine, opzionale)
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'block', marginTop: 4, fontSize: 12 }}
          onChange={e => setProofFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {proofFile && (
        <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 8 }}>✓ {proofFile.name}</div>
      )}

      <textarea
        className="cl-evidence-input"
        placeholder="Nota facoltativa (data implementazione, link documento interno…)"
        maxLength={500}
        rows={2}
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{ marginTop: 6, marginBottom: 10 }}
      />

      {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>⚠ {error}</div>}

      <button className="btn-hybrid-close" onClick={handleClose} disabled={closing}>
        {closing ? <><span className="spin-sm" /> Salvataggio…</> : '✓ Dichiara conforme — chiudi gap'}
      </button>
    </div>
  );
}

// ─── FIX-12: Interactive compliance checklist — 3 states + evidence note ──────

function ComplianceChecklist({
  gaps,
  checklist,
  onSetEntry,
  saving,
  documents,
  docGenerations,
  generatingGapId,
  onGenerate,
  onFinalize,
  onRegenerate,
  onSanctionUpdate,
  onCloseGap,
  literacyCompliant,
  isPremium,
  isStarterOrAbove,
}: {
  gaps:               ComplianceGap[];
  checklist:          Record<string, ChecklistEntry>;
  onSetEntry:         (article: string, entry: ChecklistEntry | null) => void;
  saving:             boolean;
  documents:          Record<string, ActifyDocument>;
  docGenerations:     Record<string, DocGeneration>;
  generatingGapId:    string | null;
  onGenerate:         (gapId: string) => void;
  onFinalize:         (docId: string) => void;
  onRegenerate:       (docId: string) => void;
  onSanctionUpdate:    () => void;
  onCloseGap:          (gapId: string, evidenceNote?: string, proofFile?: File) => Promise<void>;
  literacyCompliant:   boolean;
  isPremium:           boolean;
  isStarterOrAbove:    boolean;
}) {
  const [previewDoc, setPreviewDoc] = useState<ActifyDocument | null>(null);
  const [articleSidebar, setArticleSidebar] = useState<number | null>(null);
  // Local note drafts — synced to parent on blur (prevents a save on every keystroke)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const getStatus = (article: string) => normalizeEntry(checklist[article]).status;

  const ArticleBtn = ({ article }: { article: string }) => {
    const num = parseArticleNum(article);
    if (!num || !isPremium) return null;
    return (
      <button
        onClick={() => setArticleSidebar(num)}
        title="Leggi l'articolo completo del Regolamento UE 2024/1689"
        className="so-bar-read-cta"
        style={{ marginLeft: 'auto', cursor: 'pointer' }}
      >
        <span>⚖️</span>
        <span>Vedi articolo completo</span>
        <span style={{ opacity: 0.5 }}>→</span>
      </button>
    );
  };

  const isArt4 = (g: ComplianceGap) => /^Art\.?\s*4$/i.test(g.article);

  // llmCompliant: AI marked compliant, no user checklist entry (pure AI determination)
  const llmCompliant   = gaps.filter(g => g.status === 'compliant' && !checklist[g.article]);
  const art4Compliant  = gaps.filter(g => isArt4(g) && literacyCompliant);
  // userPresent: user closed the gap (checklist 'present') — includes gaps also marked
  // compliant by AI after closeGap sets BOTH status:'compliant' AND checklist:'present'
  const userPresent    = gaps.filter(g => getStatus(g.article) === 'present' && (!isArt4(g) || !isStarterOrAbove));
  const userPartial    = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'partial' && (!isArt4(g) || !isStarterOrAbove));
  const documentReady  = gaps.filter(g => g.status !== 'compliant' && getStatus(g.article) === 'document_ready' && !isArt4(g));
  const stillMissing   = gaps.filter(g => {
    if (g.status === 'compliant') return false;
    if (isArt4(g)) return isStarterOrAbove ? !literacyCompliant : getStatus(g.article) === 'missing';
    return getStatus(g.article) === 'missing';
  });

  function handleMark(article: string, status: 'present' | 'partial') {
    const existing = checklist[article] ?? {};
    const entry: ChecklistEntry = {
      ...(typeof existing === 'object' ? existing : {}),
      status,
      ...(status === 'present' ? { addressed_at: new Date().toISOString() } : {}),
    };
    onSetEntry(article, entry);
    setNoteDrafts(prev => ({ ...prev, [article]: (existing as ChecklistEntry).evidence_note ?? '' }));
  }

  function handleUnmark(article: string) {
    onSetEntry(article, null);
    setNoteDrafts(prev => { const n = { ...prev }; delete n[article]; return n; });
  }

  function handleNoteBlur(article: string) {
    const note = (noteDrafts[article] ?? '').trim();
    const existing = checklist[article];
    if (!existing) return;
    const entry = normalizeEntry(existing);
    onSetEntry(article, { ...entry, evidence_note: note || undefined });
  }

  const GapActions = ({ gap }: { gap: ComplianceGap }) => {
    if (isArt4(gap) && isStarterOrAbove) return null;
    const st = getStatus(gap.article);
    return (
      <div className="cl-gap-actions">
        <button
          className={`ci-mark-btn ci-mark-present${st === 'present' ? ' active' : ''}`}
          onClick={() => st === 'present' ? handleUnmark(gap.article) : handleMark(gap.article, 'present')}>
          ✓ Ho già questo
        </button>
        <button
          className={`ci-mark-btn ci-mark-partial${st === 'partial' ? ' active' : ''}`}
          onClick={() => st === 'partial' ? handleUnmark(gap.article) : handleMark(gap.article, 'partial')}>
          ⟳ In lavorazione
        </button>
        {(st === 'present' || st === 'partial') && (
          <button className="ci-mark-btn ci-mark-missing" onClick={() => handleUnmark(gap.article)}>
            ✗ Annulla
          </button>
        )}
      </div>
    );
  };

  const EvidenceInput = ({ gap }: { gap: ComplianceGap }) => (
    <div className="cl-evidence-wrap">
      <textarea
        className="cl-evidence-input"
        placeholder="Opzionale: link a documento, data completamento, descrizione azione… (max 300 caratteri)"
        maxLength={300}
        rows={2}
        value={noteDrafts[gap.article] ?? normalizeEntry(checklist[gap.article]).evidence_note ?? ''}
        onChange={e => setNoteDrafts(prev => ({ ...prev, [gap.article]: e.target.value }))}
        onBlur={() => handleNoteBlur(gap.article)}
      />
    </div>
  );

  return (
    <div className="fcard">
      <div className="cl-header-row">
        <h3>Stato Compliance AI Act</h3>
        {saving && <span className="cl-saving-indicator">Salvataggio…</span>}
      </div>
      <div className="cl-hint">
        Dichiara quali requisiti hai già implementato: il calcolo sanzionatorio si aggiorna in tempo reale.
        Al prossimo Compliance Check gli articoli dichiarati verranno esclusi dall'analisi AI.
      </div>
      <div className="cl-counts">
        <span className="cl-count-ok">✓ {llmCompliant.length + userPresent.length + art4Compliant.length} conformi</span>
        {documentReady.length > 0 && (
          <span className="cl-count-hybrid">⚡ {documentReady.length} azione richiesta</span>
        )}
        {userPartial.length > 0 && (
          <span className="cl-count-partial">⟳ {userPartial.length} in lavorazione</span>
        )}
        <span className="cl-count-miss">✗ {stillMissing.length} da completare</span>
        {userPresent.length > 0 && (
          <span className="cl-count-user">☑ {userPresent.length} dichiarati da te</span>
        )}
      </div>

      {/* ── MACRO BLOCCO 1: CONFORMI ─────────────────────────────────────── */}
      {(llmCompliant.length > 0 || userPresent.length > 0 || art4Compliant.length > 0) && (
        <div className="cl-macro cl-macro-ok">
          <div className="cl-macro-header">
            <span className="cl-macro-icon">✅</span>
            <div>
              <div className="cl-macro-label">Requisiti conformi</div>
              <div className="cl-macro-sublabel">Già implementati o verificati dall&apos;analisi AI</div>
            </div>
            <span className="cl-macro-count">{llmCompliant.length + userPresent.length + art4Compliant.length} su {gaps.length}</span>
          </div>
          <div className="cl-macro-body">

            {/* LLM-compliant */}
            {llmCompliant.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-ok-title">Analisi AI — già presenti</div>
                {llmCompliant.map(gap => (
                  <div key={gap.gap_id} className="cl-item cl-item-ok">
                    <span className="cl-art">{gap.article}</span>
                    <span className="cl-req">{gap.requirement}</span>
                    <span className="cl-status-ok">Conforme</span>
                    <ArticleBtn article={gap.article} />
                  </div>
                ))}
              </div>
            )}

            {/* User-declared present */}
            {userPresent.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-user-title">Dichiarati da te</div>
                {userPresent.map(gap => {
                  const entry = normalizeEntry(checklist[gap.article]);
                  return (
                    <div key={gap.gap_id} className="cl-item cl-item-user">
                      <div className="cl-item-head">
                        <span className="cl-art">{gap.article}</span>
                        <span className="cl-req">{gap.requirement}</span>
                        <span className="cl-status-user">Già implementato</span>
                        <ArticleBtn article={gap.article} />
                      </div>
                      {entry.addressed_at && (
                        <div className="cl-addressed-date">📅 Addressato il {entry.addressed_at}</div>
                      )}
                      {entry.evidence_note === '_no_finalized_doc' ? (
                        <div style={{
                          background: 'rgba(245,158,11,.1)',
                          border: '1px solid rgba(245,158,11,.35)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginTop: 6,
                          fontSize: 12,
                          color: '#FCD34D',
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}>
                          <span style={{ flexShrink: 0 }}>⚠</span>
                          <span>Documentazione tecnica non ancora finalizzata nel Vault. Carica la versione firmata tramite <strong>"↑ Ricarica"</strong> nel Document Vault per completare l&apos;evidenza.</span>
                        </div>
                      ) : entry.evidence_note ? (
                        <div className="cl-evidence-note">📎 {entry.evidence_note}</div>
                      ) : null}
                      <EvidenceInput gap={gap} />
                      <div className="cl-user-row">
                        <span className="cl-user-note">Escluso dal calcolo sanzionatorio</span>
                        <button className="cl-undo-btn" onClick={() => handleUnmark(gap.article)}>Annulla</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Art. 4 compliant via AI Literacy */}
            {art4Compliant.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-ok-title">AI Literacy Tracker — Conforme Art. 4</div>
                {art4Compliant.map(gap => (
                  <div key={gap.gap_id} className="cl-item cl-item-ok" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <span className="cl-art">{gap.article}</span>
                    <span className="cl-req">{gap.requirement}</span>
                    <span className="cl-status-ok" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      🎓 Conforme
                    </span>
                    <ArticleBtn article={gap.article} />
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── MACRO BLOCCO 2: APERTI ───────────────────────────────────────── */}
      {(userPartial.length > 0 || documentReady.length > 0 || stillMissing.length > 0) && (
        <div className="cl-macro cl-macro-open">
          <div className="cl-macro-header">
            <span className="cl-macro-icon">🔴</span>
            <div>
              <div className="cl-macro-label">Gap aperti</div>
              <div className="cl-macro-sublabel">Requisiti ancora da completare o in lavorazione</div>
            </div>
            <span className="cl-macro-count">{userPartial.length + documentReady.length + stillMissing.length} gap</span>
          </div>
          <div className="cl-macro-body">

            {/* User-partial */}
            {userPartial.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-partial-title">In lavorazione</div>
                {userPartial.map(gap => {
                  const entry = normalizeEntry(checklist[gap.article]);
                  return (
                    <div key={gap.gap_id} className="cl-item cl-item-partial">
                      <div className="cl-item-head">
                        <span className="cl-art">{gap.article}</span>
                        <span className="cl-req">{gap.requirement}</span>
                        <span className="cl-status-partial">In lavorazione</span>
                        <ArticleBtn article={gap.article} />
                      </div>
                      {entry.evidence_note && (
                        <div className="cl-evidence-note">📎 {entry.evidence_note}</div>
                      )}
                      <EvidenceInput gap={gap} />
                      <GapActions gap={gap} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* HYBRID — document in Vault, operational action pending */}
            {documentReady.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-hybrid-title">Azione richiesta — documento pronto</div>
                {documentReady.map(gap => (
                  <div key={gap.gap_id} className="cl-item cl-item-hybrid">
                    <div className="cl-item-head">
                      <span className="cl-art">{gap.article}</span>
                      <span className="cl-req">{gap.requirement}</span>
                      <span className="cl-status-hybrid">Parzialmente risolto</span>
                      <ArticleBtn article={gap.article} />
                    </div>
                    <p className="cl-desc">{gap.description}</p>
                    <HybridActionPanel
                      gap={gap}
                      doc={documents[gap.gap_id]}
                      onCloseGap={onCloseGap}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Still missing */}
            {stillMissing.length > 0 && (
              <div className="cl-section">
                <div className="cl-section-title cl-miss-title">Da completare</div>
                {stillMissing.map(gap => (
            <div key={gap.gap_id} className="cl-item cl-item-miss">
              <div className="cl-item-head">
                <span className="cl-art">{gap.article}</span>
                <span className="cl-req">{gap.requirement}</span>
                <span className={`cl-status-miss${gap.status === 'partial' ? ' cl-partial' : ''}`}>
                  {gap.status === 'partial' ? 'Parziale' : 'Mancante'}
                </span>
                {gap.ungrounded && (
                  <span className="cl-ungrounded-badge" title="Nessun chunk normativo supporta questo articolo — verificare manualmente">
                    ⚠ Da verificare
                  </span>
                )}
                <ArticleBtn article={gap.article} />
              </div>
              <p className="cl-desc">{gap.description}</p>
              <GapActions gap={gap} />
              {isArt4(gap) ? (
                isStarterOrAbove ? (
                  <div className="cl-manual-card" style={{ borderColor: 'rgba(34,197,94,.35)', background: 'rgba(34,197,94,.05)' }}>
                    <div className="cl-manual-header">
                      <span className="cl-manual-icon">🎓</span>
                      <strong style={{ color: '#4ade80' }}>Alfabetizzazione AI — Art. 4</strong>
                    </div>
                    <p className="cl-manual-steps">La compliance sull&apos;Art. 4 si gestisce esclusivamente tramite <strong>AI Literacy Tracker</strong>. Censisci i profili di formazione del tuo personale e aggiungi evidenze (certificazioni, sessioni di training) per dichiarare la conformità su questo articolo.</p>
                    <a href="/dashboard/literacy" className="so-bar-read-cta" style={{ marginTop: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: '#4ade80' }}>
                      <span>🎓</span>
                      <span style={{ fontWeight: 700 }}>Gestisci in AI Literacy Tracker →</span>
                    </a>
                  </div>
                ) : (
                  <div className="cl-manual-card" style={{ borderColor: 'rgba(139,92,246,.3)', background: 'rgba(139,92,246,.05)', marginTop: 10 }}>
                    <div className="cl-manual-header">
                      <span className="cl-manual-icon">🔒</span>
                      <strong style={{ color: '#a78bfa' }}>AI Literacy Tracker — disponibile da Piano Starter</strong>
                    </div>
                    <p className="cl-manual-steps">
                      Nei piani <strong>Starter</strong> e <strong>Professional</strong> puoi usare l&apos;AI Literacy Tracker per gestire i profili di formazione, caricare certificazioni e dichiarare automaticamente la conformità all&apos;Art. 4.{' '}
                      <a href="/plan" style={{ color: '#a78bfa', fontWeight: 700 }}>Esegui l&apos;upgrade →</a>
                    </p>
                  </div>
                )
              ) : gap.can_actify_automate && gap.automation_type ? (
                !isStarterOrAbove ? (
                  <div className="cl-manual-card" style={{ borderColor: 'rgba(59,130,246,.3)', background: 'rgba(59,130,246,.05)' }}>
                    <div className="cl-manual-header">
                      <span className="cl-manual-icon">🔒</span>
                      <strong style={{ color: '#93c5fd' }}>Generazione documenti — Piano Starter o superiore</strong>
                    </div>
                    <p className="cl-manual-steps">
                      La generazione automatica dei documenti di compliance è disponibile nei piani Starter, Professional ed Enterprise.{' '}
                      <a href="/plan" style={{ color: '#60a5fa', fontWeight: 700 }}>Esegui l&apos;upgrade →</a>
                    </p>
                  </div>
                ) : gap.automation_type === 'risk_assessment' && !isPremium ? (
                  <div className="cl-manual-card" style={{ borderColor: 'rgba(139,92,246,.3)', background: 'rgba(139,92,246,.05)' }}>
                    <div className="cl-manual-header">
                      <span className="cl-manual-icon">🔒</span>
                      <strong style={{ color: '#a78bfa' }}>FRIA — Solo Piano Professional</strong>
                    </div>
                    <p className="cl-manual-steps">
                      La Valutazione di Impatto sui Diritti Fondamentali (FRIA) è disponibile nei piani Professional ed Enterprise.{' '}
                      <a href="/plan" style={{ color: '#a78bfa', fontWeight: 700 }}>Esegui l&apos;upgrade →</a>
                    </p>
                  </div>
                ) : (
                  <GapGenerateBlock
                    gap={gap}
                    doc={documents[gap.gap_id]}
                    gen={docGenerations[gap.gap_id]}
                    generating={generatingGapId === gap.gap_id}
                    onGenerate={() => onGenerate(gap.gap_id)}
                    onFinalize={onFinalize}
                    onRegenerate={onRegenerate}
                    onOpenPreview={(d: ActifyDocument) => setPreviewDoc(d)}
                    onSanctionUpdate={onSanctionUpdate}
                    onCloseGap={onCloseGap}
                  />
                )
              ) : (
                <div className="cl-manual-card">
                  <div className="cl-manual-header">
                    <span className="cl-manual-icon">📋</span>
                    <strong>Procedura manuale richiesta</strong>
                  </div>
                  <p className="cl-manual-steps">{gap.what_to_do}</p>
                  {gap.deadline && (
                    <div className="cl-deadline">📅 Scadenza: <strong>{gap.deadline}</strong></div>
                  )}
                </div>
              )}
            </div>
          ))}
              </div>
            )}

          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onMarkReady={async () => {
            await onFinalize(previewDoc.document_id);
            setPreviewDoc(null);
          }}
        />
      )}

      {articleSidebar !== null && (
        <ArticleSidebar
          articleNum={articleSidebar}
          onClose={() => setArticleSidebar(null)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SystemDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const systemId = searchParams.get('id') ?? '';
  const viewFines = searchParams.get('view') === 'fines';

  const [system, setSystem]   = useState<Record<string, unknown> | null>(null);
  const [check, setCheck]     = useState<ComplianceCheck | null>(null);
  const [company, setCompany] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [literacyCompliant, setLiteracyCompliant] = useState(false);
  const isPremium = ['premium', 'enterprise'].includes((company.subscription_tier as string) ?? '');
  const isStarterOrAbove = ['base', 'premium', 'enterprise'].includes((company.subscription_tier as string) ?? '');

  // FIX-12: checklist state — supports enriched ChecklistEntry
  const [checklist, setChecklist] = useState<Record<string, ChecklistEntry>>({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Document Vault state: keyed by gap_id
  const [documents, setDocuments] = useState<Record<string, ActifyDocument>>({});
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);
  const docPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step Functions pipeline state: keyed by gap_id
  const [docGenerations, setDocGenerations] = useState<Record<string, DocGeneration>>({});
  const genPollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const pollDocGeneration = useCallback((generationId: string, gapId: string) => {
    if (genPollTimers.current[gapId]) clearTimeout(genPollTimers.current[gapId]);
    genPollTimers.current[gapId] = setTimeout(async () => {
      try {
        const gen = await api.docPipeline.getStatus(generationId);
        setDocGenerations(prev => ({ ...prev, [gapId]: gen }));
        if (gen.status === 'QUEUED' || gen.status === 'RUNNING') {
          pollDocGeneration(generationId, gapId);
        } else if (gen.status === 'DRAFT_READY' && gen.documentId) {
          const doc = await api.documents.get(gen.documentId) as unknown as ActifyDocument;
          setDocuments(prev => ({ ...prev, [gapId]: doc }));
        }
      } catch {
        // silent — leave gen state as-is
      }
    }, 5000);
  }, []);

  const load = useCallback(async () => {
    if (!systemId) return;
    try {
      const [sysData, latestCheck, docsData, gensData, litData, companyData] = await Promise.allSettled([
        api.systems.get(systemId),
        api.compliance.getLatest(systemId),
        api.documents.listBySystem(systemId),
        api.docPipeline.listBySystem(systemId),
        api.literacy.getProfiles(systemId),
        api.company.get(),
      ]);
      if (sysData.status === 'fulfilled') setSystem(sysData.value);
      if (latestCheck.status === 'fulfilled') setCheck(latestCheck.value as unknown as ComplianceCheck);
      if (docsData.status === 'fulfilled') {
        const docMap: Record<string, ActifyDocument> = {};
        for (const d of (docsData.value.documents ?? []) as ActifyDocument[]) {
          docMap[d.gap_id] = d;
        }
        setDocuments(docMap);
      }
      if (gensData.status === 'fulfilled') {
        const genMap: Record<string, DocGeneration> = {};
        for (const gen of (gensData.value.generations ?? [])) {
          const existing = genMap[gen.gapId];
          if (!existing || gen.createdAt > existing.createdAt) genMap[gen.gapId] = gen;
        }
        setDocGenerations(genMap);
        // Resume polling for active generations
        for (const [gapId, gen] of Object.entries(genMap)) {
          if (gen.status === 'QUEUED' || gen.status === 'RUNNING') {
            pollDocGeneration(gen.generationId, gapId);
          }
        }
      }
      if (litData.status === 'fulfilled') {
        const ls = (litData.value as { literacy_status?: string }).literacy_status;
        const litCompliant = ls === 'compliant';
        setLiteracyCompliant(litCompliant);

        // Auto-sync: when literacy is compliant, mark Art. 4 as 'present' in the
        // compliance_checklist so that fines/inventory pages (which use
        // last_article_sanctions + compliance_checklist) correctly exclude it.
        if (litCompliant && latestCheck.status === 'fulfilled' && sysData.status === 'fulfilled') {
          const freshGaps = ((latestCheck.value as unknown as ComplianceCheck)?.result?.compliance_gaps ?? []) as ComplianceGap[];
          const sys = sysData.value as Record<string, unknown>;
          const rawCl = (sys.compliance_checklist ?? {}) as Record<string, { status?: string; evidence_note?: string } | string>;
          const art4Entry = rawCl['Art. 4'];
          const art4St = typeof art4Entry === 'string' ? art4Entry : (art4Entry as { status?: string })?.status;
          const needsClUpdate = art4St !== 'present';

          const effectiveNow = freshGaps.map(g => {
            const e = rawCl[g.article];
            const st = typeof e === 'string' ? e : (e as { status?: string })?.status;
            if (st === 'present' || isArt4Gap(g.article)) {
              return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
            }
            return g;
          });
          const nonCompliant = effectiveNow.filter(g => g.status !== 'compliant');
          const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
          const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
          const storedMax = (sys.last_exposure_max as number) ?? 0;
          const needsExposureUpdate = Math.abs(storedMax - newMax) > 1;

          if (needsClUpdate || needsExposureUpdate) {
            try {
              const updatedCl = { ...rawCl, 'Art. 4': { status: 'present' as const, addressed_at: new Date().toISOString(), evidence_note: 'literacy' } };
              await api.systems.update(systemId, {
                ...(needsExposureUpdate ? { last_exposure_min: newMin, last_exposure_max: newMax, compliance_status: newMax === 0 ? 'compliant' : 'gap_found' } : {}),
                compliance_checklist: updatedCl,
                updated_at: new Date().toISOString(),
              });
              setSystem(prev => prev ? {
                ...prev,
                compliance_checklist: updatedCl,
                ...(needsExposureUpdate ? { last_exposure_max: newMax, last_exposure_min: newMin, compliance_status: newMax === 0 ? 'compliant' : 'gap_found' } : {}),
              } : prev);
              setChecklist(prev => ({ ...prev, 'Art. 4': { status: 'present', addressed_at: new Date().toISOString() } }));
            } catch { /* silent — next load will retry */ }
          }
        }
      }
      if (companyData.status === 'fulfilled') setCompany(companyData.value as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  }, [systemId, pollDocGeneration]);

  useEffect(() => { load(); }, [load]);

  // Initialize checklist from persisted system data — normalize legacy string values
  useEffect(() => {
    if (system) {
      const raw = system.compliance_checklist as Record<string, ChecklistEntry | 'present' | 'missing'> | undefined;
      if (!raw) { setChecklist({}); return; }
      const normalized: Record<string, ChecklistEntry> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalized[k] = normalizeEntry(v);
      }
      setChecklist(normalized);
    }
  }, [system]);

  useEffect(() => {
    if (check?.status === 'running') {
      const t = setTimeout(load, 4000);
      return () => clearTimeout(t);
    }
  }, [check, load]);

  const result = check?.result;
  const gaps   = result?.compliance_gaps ?? [];

  // Derive effective gaps: user-present articles OR Art. 4 literacy-compliant → 0 sanctions
  const effectiveGaps = useMemo((): ComplianceGap[] => {
    return gaps.map(g => {
      const entry = checklist[g.article];
      if (entry?.status === 'present' || (isArt4Gap(g.article) && literacyCompliant)) {
        return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
      }
      return g;
    });
  }, [gaps, checklist, literacyCompliant]);

  const effectiveResult = useMemo((): ComplianceResult | undefined => {
    if (!result) return undefined;
    const nonCompliant = effectiveGaps.filter(g => g.status !== 'compliant');
    const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
    const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
    return {
      ...result,
      compliance_gaps: effectiveGaps,
      total_exposure_estimate: result.total_exposure_estimate
        ? { ...result.total_exposure_estimate, max: newMax, min: newMin }
        : undefined,
    };
  }, [result, effectiveGaps]);

  // FIX-12: set or remove a checklist entry, debounced save
  function handleSetEntry(article: string, entry: ChecklistEntry | null) {
    const next = { ...checklist };
    if (entry === null) {
      delete next[article];
    } else {
      next[article] = entry;
    }
    setChecklist(next);
    setSaving(true);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updatePayload: Record<string, unknown> = { compliance_checklist: next };
        if (gaps.length > 0) {
          const effectiveGapsNow = gaps.map(g => {
            const e = next[g.article];
            if (e?.status === 'present' || (isArt4Gap(g.article) && literacyCompliant)) {
              return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
            }
            return g;
          });
          const nonCompliant = effectiveGapsNow.filter(g => g.status !== 'compliant');
          const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
          const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
          updatePayload.last_exposure_min = newMin;
          updatePayload.last_exposure_max = newMax;
          updatePayload.compliance_status = newMax === 0 ? 'compliant' : 'gap_found';
        }
        await api.systems.update(systemId, updatePayload);
      } catch {
        // silent — state resets on next page load
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  async function handleSanctionUpdate() {
    try {
      const freshCheck = await api.compliance.getLatest(systemId) as unknown as ComplianceCheck;
      if (freshCheck?.result) {
        const freshGaps = (freshCheck.result.compliance_gaps ?? []) as ComplianceGap[];
        // Apply current checklist overrides (same logic as effectiveGaps useMemo)
        const effectiveGapsNow = freshGaps.map(g => {
          const entry = checklist[g.article];
          if (entry?.status === 'present' || (isArt4Gap(g.article) && literacyCompliant)) {
            return { ...g, status: 'compliant' as const, estimated_sanction_max: 0, estimated_sanction_min: 0 };
          }
          return g;
        });
        const nonCompliant = effectiveGapsNow.filter(g => g.status !== 'compliant');
        const newMax = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_max ?? 0), 0);
        const newMin = nonCompliant.reduce((s, g) => s + (g.estimated_sanction_min ?? 0), 0);
        await api.systems.update(systemId, {
          last_exposure_min:  newMin,
          last_exposure_max:  newMax,
          compliance_status:  newMax === 0 ? 'compliant' : 'gap_found',
          updated_at:         new Date().toISOString(),
        });
      }
    } catch {
      // silent — UI still refreshes
    }
    await load();
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      await api.compliance.trigger(systemId);
      setCheck(prev => prev ? { ...prev, status: 'running' } : null);
      setTimeout(load, 4000);
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore');
    } finally {
      setTriggering(false);
    }
  }

  // ── Document generation handlers ─────────────────────────────────────────

  async function handleGenerate(gapId: string) {
    // Prevent double-click: if already generating or a generation is active, bail out
    if (generatingGapId === gapId) return;
    const existingGen = docGenerations[gapId];
    if (existingGen?.status === 'QUEUED' || existingGen?.status === 'RUNNING') return;

    setGeneratingGapId(gapId);
    try {
      const idempotencyKey = `${systemId}-${gapId}-${Date.now()}`;
      const { generationId } = await api.docPipeline.start(systemId, gapId, idempotencyKey);
      const now = new Date().toISOString();
      // Immediately set QUEUED state so button disappears without waiting for first poll
      setDocGenerations(prev => ({
        ...prev,
        [gapId]: {
          pk: '', sk: '', companyId: '', attempt: 0,
          generationId, systemId: systemId!, gapId,
          docType: '' as import('@/lib/types').DocType,
          status: 'QUEUED', createdAt: now, updatedAt: now,
        },
      }));
      setGeneratingGapId(null);
      pollDocGeneration(generationId, gapId);
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella generazione');
      setGeneratingGapId(null);
    }
  }

  function pollDocument(documentId: string, gapId: string) {
    if (docPollTimer.current) clearTimeout(docPollTimer.current);
    docPollTimer.current = setTimeout(async () => {
      try {
        const doc = await api.documents.get(documentId) as unknown as ActifyDocument;
        setDocuments(prev => ({ ...prev, [gapId]: doc }));
        if (doc.status === 'generating') {
          pollDocument(documentId, gapId);
        } else {
          setGeneratingGapId(null);
          if (doc.status === 'final') {
            // Reload system to pick up the document_ready checklist status.
            // Sanctions are NOT auto-updated — the PMI must explicitly confirm via closeGap().
            await load();
          }
        }
      } catch {
        setGeneratingGapId(null);
      }
    }, 4000);
  }

  async function handleFinalize(documentId: string) {
    try {
      await api.documents.finalize(documentId);
      // Reload: checklist + documents updated
      await load();
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella finalizzazione');
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleCloseGap(gapId: string, evidenceNote?: string, proofFile?: File) {
    let proof_base64: string | undefined;
    let proof_filename: string | undefined;
    if (proofFile) {
      proof_base64 = await fileToBase64(proofFile);
      proof_filename = proofFile.name;
    }
    await api.gaps.close(systemId, gapId, { evidence_note: evidenceNote, proof_base64, proof_filename });
    await load();
  }

  async function handleRegenerate(documentId: string) {
    try {
      const old = Object.values(documents).find(d => d.document_id === documentId);
      const { document_id: newId } = await api.documents.regenerate(documentId);
      if (old) {
        setGeneratingGapId(old.gap_id);
        pollDocument(newId, old.gap_id);
      }
    } catch (err: unknown) {
      alert((err as { message?: string }).message ?? 'Errore nella rigenerazione');
    }
  }

  if (!systemId) return <div className="inv-page"><p>ID sistema mancante.</p></div>;
  if (loading)   return <div className="db-loading"><div className="spin"></div></div>;
  if (!system)   return <div className="inv-page"><p>Sistema non trovato.</p></div>;

  // ── Fine board view: only sanction estimation ────────────────────────────
  if (viewFines) {
    return (
      <div className="inv-page">
        <div className="inv-header">
          <div>
            <button className="btn-back-link" onClick={() => router.push('/dashboard/fines')}>
              ← Fine Estimation Board
            </button>
            <h1 className="inv-title">⚖️ {system.tool_name as string}</h1>
            <p className="inv-sub">{system.vendor as string} · Esposizione sanzionatoria stimata</p>
          </div>
        </div>
        {effectiveResult ? (
          <SanctionOverview result={effectiveResult} />
        ) : (
          <div className="inv-empty">
            <div className="empty-icon">⚖️</div>
            <h3>Nessun dato sanzionatorio</h3>
            <p>Esegui un Compliance Check per calcolare l&apos;esposizione sanzionatoria.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Inventory view: gap analysis ─────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <button className="btn-back-link" onClick={() => router.push('/dashboard/inventory')}>
            ← AI Inventory
          </button>
          <h1 className="inv-title">{system.tool_name as string}</h1>
          <p className="inv-sub">{system.vendor as string} · {system.category as string} · {system.role as string}</p>
        </div>
        {(check?.status === 'running' || triggering) ? (
          <div className="sys-running-pill"><span className="spin-sm" /> Analisi in corso…</div>
        ) : check ? (
          <button className="sys-rerun-btn" onClick={handleTrigger}>↻ Rianalizza</button>
        ) : (
          <button className="sys-check-btn lg" onClick={handleTrigger}>▶ Avvia Compliance Check</button>
        )}
      </div>

      {check?.status === 'running' && (
        <div className="check-running">
          <div className="spin" style={{ width: 32, height: 32 }}></div>
          <div>
            <strong>Analisi in corso…</strong>
            <p>Bedrock sta analizzando il sistema rispetto all'AI Act. ~30 secondi.</p>
          </div>
        </div>
      )}

      {effectiveResult && (
        <>
          {effectiveResult.rag_metadata && !effectiveResult.rag_metadata.rag_used && (
            <div className="rag-fallback-banner">
              <span className="rag-fallback-icon">⚠</span>
              <div className="rag-fallback-body">
                <strong>Analisi basata su contesto semplificato</strong>
                <p>La knowledge base normativa non era disponibile al momento dell&apos;analisi. I gap identificati potrebbero essere incompleti.</p>
                {effectiveResult.rag_metadata.rag_fallback_reason && (
                  <span className="rag-fallback-reason">{effectiveResult.rag_metadata.rag_fallback_reason}</span>
                )}
              </div>
              <button className="rag-fallback-cta" onClick={handleTrigger} disabled={triggering}>
                {triggering ? '⟳' : 'Rianalizza ora'}
              </button>
            </div>
          )}
          <div className={`risk-banner risk-${effectiveResult.risk_classification}`}>
            <div className="risk-label">Classificazione Rischio</div>
            <div className="risk-value">{effectiveResult.risk_classification.toUpperCase()}</div>
            <div className="risk-summary">{effectiveResult.executive_summary}</div>
          </div>
          <ComplianceChecklist
            gaps={gaps}
            checklist={checklist}
            onSetEntry={handleSetEntry}
            saving={saving}
            documents={documents}
            docGenerations={docGenerations}
            generatingGapId={generatingGapId}
            onGenerate={handleGenerate}
            onFinalize={handleFinalize}
            onRegenerate={handleRegenerate}
            onSanctionUpdate={handleSanctionUpdate}
            onCloseGap={handleCloseGap}
            literacyCompliant={literacyCompliant}
            isPremium={isPremium}
            isStarterOrAbove={isStarterOrAbove}
          />
        </>
      )}

      {!effectiveResult && check?.status === 'failed' && (
        <div className="inv-empty" style={{ borderColor: '#EF4444' }}>
          <div className="empty-icon">⚠️</div>
          <h3 style={{ color: '#EF4444' }}>Analisi fallita</h3>
          <p>Si è verificato un errore durante l'analisi. Riprova avviando un nuovo check.</p>
          {(check as unknown as { error?: string }).error && (
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8, fontFamily: 'monospace' }}>
              {(check as unknown as { error?: string }).error}
            </p>
          )}
        </div>
      )}

      {!effectiveResult && check?.status !== 'running' && check?.status !== 'failed' && (
        <div className="inv-empty">
          <div className="empty-icon">📋</div>
          <h3>Nessun check eseguito</h3>
          <p>Avvia un Compliance Check per analizzare questo sistema rispetto all'AI Act.</p>
        </div>
      )}
    </div>
  );
}

export default function SystemDetailPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <SystemDetailContent />
    </Suspense>
  );
}
