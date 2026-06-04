# Actify — Spec-Driven Development
## Compliance Re-check Engine — Rule Engine + Checklist Incrementale + Sanzioni

> **Rule engine deterministico → fetch diretto chunk → LLM solo su gap aperti → sanzioni aggiornate**

| Campo | Valore |
|---|---|
| Versione | v1.0 |
| Data | Maggio 2026 |
| Autore | Actify Product Team |
| Status | Pronto per implementazione |
| Destinatario | Sviluppatore implementatore (Claude Code) |
| Dipende da | `Actify_SDD_RAG_Improvements_v1.0.md` (FIX-01 prerequisito) |
| File coinvolti | `ragService.ts`, `complianceEngine.ts`, `types/aiSystem.ts`, `complianceOutputSchema.ts`, `sanctions.ts`, form `page.tsx` |

> **Scope**
> Questo SDD descrive 3 interventi strettamente correlati:
> 1. **FIX-10** — Sostituzione del retrieval semantico con un rule engine deterministico + fetch diretto per article_number
> 2. **FIX-11** — Re-check incrementale: LLM analizza solo gli articoli non ancora addressati, gap compliant portati forward
> 3. **FIX-12** — Checklist arricchita (`partial` + `addressed_at` + `evidence_note`) e aggiornamento sanzioni automatico

---

## 1. Executive Summary

Il sistema attuale ha due problemi strutturali nel compliance check:

**Problema A — Retrieval semantico inadatto:** le query RAG costruite dal JSON del form (es. `"sistema AI hr screening CV"`) e i chunk normativi (es. `"Articolo 6 — classificazione sistemi ad alto rischio"`) vivono in spazi semantici diversi. Titan V2 produce score coseno ≤ 0.56 su questi input, sotto qualsiasi soglia ragionevole. La RAG è di fatto disabilitata in produzione — il sistema usa sempre il fallback al prompt statico.

**Problema B — Re-check inefficiente e incoerente:** ad ogni re-check il LLM rianalizza tutti gli articoli, inclusi quelli che l'utente ha già dichiarato di aver addressato. Questo spreca token, introduce variabilità nelle descrizioni dei gap (il LLM può cambiare phrasing tra run), e non produce aggiornamenti sanzioni affidabili.

**Soluzione:** sostituire il retrieval semantico con un rule engine deterministico (~60 righe) che seleziona gli articoli applicabili in base al profilo sistema. I chunk vengono recuperati per `article_number` (fetch diretto, nessun embedding). Il LLM riceve solo gli articoli ancora aperti. I gap già addressati vengono portati forward deterministicamente. Le sanzioni si ricalcolano automaticamente sul delta.

---

## 2. FIX-10 — Rule Engine + Fetch Diretto per Article Number

### 2.1 Problema

`ragService.ts` costruisce 7 query testuali dal JSON del form, le converte in embedding con Titan V2, e cerca i chunk più simili su S3 Vectors. Il mismatch semantico tra linguaggio di prodotto ("hr screening CV") e linguaggio normativo ("occupazione gestione lavoratori Allegato III") produce score ≤ 0.56 — sotto la soglia `SIMILARITY_THRESHOLD=0.72`. Risultato: zero chunk recuperati, fallback al prompt statico.

La causa è architetturale: la similarity search è lo strumento sbagliato per un corpus strutturato come l'AI Act, dove l'applicabilità degli articoli è determinata da criteri legali espliciti (Allegato III, Art. 6), non da similarità semantica.

### 2.2 Nuovo file: `lambda-api/services/articleEngine.ts`

Crea questo file nuovo. Contiene il rule engine e il chunk fetcher.

```typescript
import { AISystem } from '../types/aiSystem';
import { Company } from '../types/company';

// ─── Mapping Annex III ────────────────────────────────────────────────────────

const ANNEX_III_MAP: Record<string, string> = {
  hiring:                  'Allegato III pt. 4a',
  performance_management:  'Allegato III pt. 4b',
  credit_scoring:          'Allegato III pt. 5b',
  insurance:               'Allegato III pt. 5b',
  healthcare_diagnosis:    'Allegato III pt. 2a',
  education_assessment:    'Allegato III pt. 3a',
  public_services:         'Allegato III pt. 5a',
  law_enforcement:         'Allegato III pt. 6a',
  migration_border:        'Allegato III pt. 7a',   // campo nuovo — vedi FIX-12 form
  critical_infrastructure: 'Allegato III pt. 2b',   // campo nuovo — vedi FIX-12 form
};

// Titoli articoli — usati per i gap sintetici "compliant" nel re-check
export const ARTICLE_TITLES: Record<number, string> = {
  5:  'Pratiche di IA vietate',
  6:  'Classificazione sistemi ad alto rischio',
  9:  'Sistema di gestione della qualità',
  10: 'Governance dei dati',
  11: 'Documentazione tecnica',
  12: 'Registrazione automatica degli eventi',
  13: 'Trasparenza e fornitura di informazioni',
  14: 'Supervisione umana',
  15: 'Accuratezza, robustezza e cybersicurezza',
  16: 'Obblighi dei provider — panoramica',
  17: 'Sistema di gestione qualità (provider)',
  18: 'Documentazione tecnica (provider)',
  19: 'Registrazione automatica (provider)',
  20: 'Cooperazione con autorità (provider)',
  21: 'Misure correttive (provider)',
  22: 'Notifica all\'autorità nazionale (provider)',
  23: 'Obblighi informativi (provider → deployer)',
  24: 'Obblighi rappresentante autorizzato UE',
  25: 'Obblighi importatori',
  26: 'Obblighi dei deployer',
  27: 'Valutazione d\'impatto sui diritti fondamentali (FRIA)',
  28: 'Obblighi distributori',
  29: 'Obblighi per ruoli multipli',
  50: 'Trasparenza verso gli utenti — obblighi disclosure',
  51: 'Classificazione modelli GPAI',
  52: 'Obblighi provider GPAI',
  53: 'Obblighi provider GPAI con rischio sistemico',
  54: 'Valutazione modelli GPAI con rischio sistemico',
  55: 'Incidenti gravi — modelli GPAI',
};

// ─── Rule Engine ──────────────────────────────────────────────────────────────

export interface ArticleSelection {
  articles: number[];
  annexIII: string[];
  classification: 'prohibited' | 'high' | 'limited' | 'minimal';
  classificationRationale: string;
}

export function selectApplicableArticles(
  system: AISystem,
  company: Company,
): ArticleSelection {
  const articles = new Set<number>();
  const annexIII: string[] = [];

  // ── Art. 5 — pratiche vietate (sempre verificato) ─────────────────────────
  articles.add(5);

  // Check prohibited: sistema automatizzato senza supervisione su vulnerabili
  const isProhibited =
    (system.vulnerable_groups?.some(g => ['minors', 'elderly', 'disabled'].includes(g))) &&
    system.output_type === 'automated_decision' &&
    system.human_oversight_level === 'never';

  // Emotion recognition vietata in workplace/education (campo nuovo — vedi FIX-12)
  const emotionInSensitiveContext =
    system.emotion_recognition === true &&
    (system.category === 'hr' || system.decision_domains?.includes('education_assessment'));

  if (isProhibited || emotionInSensitiveContext) {
    return {
      articles: [5],
      annexIII: [],
      classification: 'prohibited',
      classificationRationale: isProhibited
        ? 'Sistema automatizzato senza supervisione umana che impatta soggetti vulnerabili — potenziale Art. 5(1)(b)'
        : 'Emotion recognition in contesto lavorativo o educativo — Art. 5(1)(f)',
    };
  }

  // ── Annex III → Art. 6 → obblighi high-risk ───────────────────────────────
  const matchedDomains = system.decision_domains?.filter(d => ANNEX_III_MAP[d]) ?? [];
  matchedDomains.forEach(d => annexIII.push(ANNEX_III_MAP[d]));

  // Biometria remota in spazi pubblici → Allegato III pt. 1
  if (
    system.data_types?.includes('biometric') &&
    system.target_users?.includes('clients_users') &&
    system.access_mode !== 'integrated' // integrato interno = non pubblico
  ) {
    annexIII.push('Allegato III pt. 1');
  }

  // Infrastrutture critiche → Allegato III pt. 2b
  if (system.category === 'critical_infrastructure') {
    annexIII.push('Allegato III pt. 2b');
  }

  const isHighRisk = annexIII.length > 0 && system.makes_automated_decisions;

  if (isHighRisk) {
    articles.add(6);
    [9, 10, 11, 12, 13, 14, 15].forEach(a => articles.add(a));

    const role = company.ai_role;
    if (role === 'provider' || role === 'both') {
      [16, 17, 18, 19, 20, 21, 22, 23, 24, 25].forEach(a => articles.add(a));
    }
    if (role === 'deployer' || role === 'both') {
      [26, 27, 28, 29].forEach(a => articles.add(a));
    }
  }

  // ── Art. 50 — trasparenza ─────────────────────────────────────────────────
  // Trigger corretto: chatbot verso utenti esterni OPPURE LLM OPPURE no human oversight
  const isChatbotFacingUsers =
    system.access_mode === 'web_chat' &&
    system.target_users?.includes('clients_users');

  const needsTransparency =
    system.category === 'llm' ||
    isChatbotFacingUsers ||
    system.human_oversight_level === 'never';

  if (needsTransparency) articles.add(50);

  // ── Art. 51-55 — GPAI (solo provider di LLM) ─────────────────────────────
  if (system.category === 'llm' && (company.ai_role === 'provider' || company.ai_role === 'both')) {
    [51, 52, 53, 54, 55].forEach(a => articles.add(a));
  }

  // ── Art. 27 — FRIA (deployer high-risk con utenti esterni) ───────────────
  if (isHighRisk && (company.ai_role === 'deployer' || company.ai_role === 'both')) {
    if (system.target_users?.includes('clients_users') || system.target_users?.includes('third_parties')) {
      articles.add(27);
    }
  }

  const classification = isHighRisk ? 'high'
    : needsTransparency ? 'limited'
    : 'minimal';

  const classificationRationale = isHighRisk
    ? `Domini decisione ad alto rischio (${matchedDomains.join(', ')}) con decisioni automatizzate — ${annexIII.join(', ')}`
    : needsTransparency
    ? `Obblighi trasparenza Art. 50 (${isChatbotFacingUsers ? 'chatbot verso utenti' : system.category === 'llm' ? 'LLM' : 'assenza supervisione umana'})`
    : 'Nessun dominio Annex III identificato, supervisione umana presente';

  return {
    articles: [...articles].sort((a, b) => a - b),
    annexIII: [...new Set(annexIII)],
    classification,
    classificationRationale,
  };
}

// ─── Chunk Fetcher — fetch diretto per article_number ─────────────────────────

// Cache in-memory dei chunk (170 chunk ≈ 100KB — accettabile in Lambda)
// Viene popolata al primo accesso e riusata per tutta la vita della Lambda warm.
let chunkCache: RetrievedChunk[] | null = null;

export async function getChunksByArticles(
  articleNumbers: number[],
  s3Client: S3VectorsClient,
): Promise<RetrievedChunk[]> {
  if (!chunkCache) {
    // Carica tutti i chunk dall'indice S3 Vectors una sola volta
    chunkCache = await loadAllChunks(s3Client);
  }

  const targetSet = new Set(articleNumbers);
  return chunkCache.filter(chunk =>
    chunk.article_number != null && targetSet.has(chunk.article_number)
  );
}

async function loadAllChunks(s3Client: S3VectorsClient): Promise<RetrievedChunk[]> {
  // Usa ListVectors o GetVectors per recuperare tutti i 170 chunk con metadata
  // Implementazione dipende dalla versione SDK S3 Vectors disponibile
  // Alternativa: tieni un JSON statico in Lambda environment (es. chunks.json bundlato)
  const response = await s3Client.send(new ListVectorsCommand({
    vectorBucketName: process.env.S3_VECTORS_BUCKET,
    indexName: process.env.S3_VECTORS_INDEX,
    returnMetadata: true,
  }));
  return response.vectors.map(v => ({
    chunk_id: v.key,
    text: v.metadata.text,
    chunk_type: v.metadata.chunk_type,
    article_number: v.metadata.article_number,
    article_title: v.metadata.article_title,
    annex_reference: v.metadata.annex_reference,
    applies_to: v.metadata.applies_to,
    risk_category: v.metadata.risk_category,
    enforcement_date: v.metadata.enforcement_date,
    keywords: v.metadata.keywords,
    score: 1.0, // fetch diretto — score non applicabile
  }));
}
```

### 2.3 Modifiche a `ragService.ts`

`buildRagContext()` viene sostituita da una chiamata diretta ad `articleEngine.ts`. Il file `ragService.ts` rimane per retrocompatibilità ma non viene più chiamato nel flusso principale.

```typescript
// In complianceEngine.ts — runComplianceCheck() — SOSTITUISCI buildRagContext con:

import { selectApplicableArticles, getChunksByArticles } from './articleEngine';

const { articles, annexIII, classification, classificationRationale } =
  selectApplicableArticles(system, company);

const chunks = await getChunksByArticles(articles, s3Client);
const ragContextText = assembleLegalContext(chunks); // funzione esistente — invariata
```

### 2.4 Modifiche al prompt

Con il rule engine, la classificazione è deterministica. Passala come fatto stabilito nel user message:

```
CLASSIFICAZIONE PRE-DETERMINATA: {classification}
MOTIVAZIONE: {classificationRationale}
ARTICOLI APPLICABILI: {articles.map(n => `Art. ${n}`).join(', ')}
ALLEGATO III: {annexIII.join(', ') || 'Non applicabile'}

Analizza i gap di compliance per CIASCUNO degli articoli applicabili elencati sopra.
Non aggiungere articoli non presenti in questa lista. Non rimuovere articoli dalla lista.
```

### 2.5 Aggiornamenti al form (3 campi nuovi)

Aggiungi a `page.tsx` e a `types/aiSystem.ts`:

```typescript
// Nuovi campi da aggiungere al form Step 1 — SystemFields

// 1. Emotion recognition (checkbox standalone)
{ field: 'emotion_recognition', label: 'Il sistema rileva o inferisce stati emotivi', desc: 'Art. 5(1)(f) — vietato in contesto lavorativo ed educativo' }

// 2. Decision domains aggiuntivi
{ v: 'migration_border',        l: 'Migrazione, asilo, controllo frontiere' }
{ v: 'critical_infrastructure', l: 'Infrastrutture critiche (energia, acqua, trasporti)' }

// 3. Soglia automatica (radio)
{ field: 'has_automatic_threshold', label: 'Esiste una soglia automatica di rifiuto/approvazione senza revisione umana?', desc: 'Es. pratiche creditizie sotto score X rifiutate automaticamente — Art. 14' }
```

Questi campi alimentano il rule engine e migliorano la precisione Art. 5 e Art. 14.

---

## 3. FIX-11 — Re-check Incrementale

### 3.1 Problema

Ad ogni re-check il LLM rianalizza tutti gli articoli applicabili, inclusi quelli già marcati `present` dall'utente. Questo causa:
- Spreco di token e latenza inutile
- Variabilità nelle descrizioni (il LLM può cambiare phrasing tra run sullo stesso articolo)
- Impossibilità di calcolare un delta preciso delle sanzioni (prima/dopo un'azione correttiva)

### 3.2 Flusso re-check incrementale

```typescript
// In complianceEngine.ts — runComplianceCheck()

// 1. Rule engine → tutti gli articoli applicabili
const { articles, classification, classificationRationale } =
  selectApplicableArticles(system, company);

// 2. Leggi checklist corrente dal DB
const checklist = system.compliance_checklist ?? {};

// 3. Split: articoli addressati vs ancora aperti
function normalizeArticleNum(art: string): number {
  return parseInt(art.replace(/[^0-9]/g, ''), 10);
}

const addressedNums = Object.entries(checklist)
  .filter(([, entry]) => entry.status === 'present')
  .map(([art]) => normalizeArticleNum(art));

const pendingNums = articles.filter(n => !addressedNums.includes(n));

// 4. Chunk fetch solo per articoli pending
const pendingChunks = await getChunksByArticles(pendingNums, s3Client);
const ragContextText = assembleLegalContext(pendingChunks);

// 5. LLM analizza SOLO gli articoli pending
const llmOutput = pendingNums.length > 0
  ? await callBedrock(system, company, ragContextText, pendingNums, classification, classificationRationale)
  : { compliance_gaps: [], score: { governance: 10, transparency: 10, documentation: 10, monitoring: 10 }, priority_actions: [], executive_summary: 'Tutti i requisiti applicabili risultano soddisfatti.' };

// 6. Genera gap sintetici "compliant" per articoli già addressati
const compliantGaps: ComplianceGap[] = addressedNums.map(artNum => ({
  gap_id: uuidv4(),
  article: `Art. ${artNum}`,
  requirement: ARTICLE_TITLES[artNum] ?? 'Requisito normativo',
  status: 'compliant',
  deadline: null,
  urgency: 'low',
  description: buildCompliantDescription(artNum, checklist[`Art. ${artNum}`]),
  what_to_do: null,
  can_actify_automate: false,
  automation_type: null,
}));

// 7. Merge gap LLM + gap compliant
const allGaps = [...llmOutput.compliance_gaps, ...compliantGaps];
const mergedOutput = { ...llmOutput, compliance_gaps: allGaps };

// 8. Sanctions — ricalcola su tutti i gap (skippa i compliant automaticamente)
const withSanctions = computeSanctions(mergedOutput, company);

function buildCompliantDescription(artNum: number, entry: ChecklistEntry): string {
  const base = `Requisito soddisfatto (${ARTICLE_TITLES[artNum] ?? `Art. ${artNum}`}).`;
  if (entry?.evidence_note) return `${base} Nota: ${entry.evidence_note}`;
  if (entry?.addressed_at) return `${base} Addressato il ${entry.addressed_at}.`;
  return base;
}
```

### 3.3 Prompt per il re-check parziale

Aggiorna `buildUserMessage()` per comunicare al LLM gli articoli esclusi dall'analisi:

```
ARTICOLI APPLICABILI TOTALI: Art. 5, Art. 6, Art. 9, Art. 13, Art. 14, Art. 26, Art. 50
ARTICOLI GIÀ ADDRESSATI (esclusi dall'analisi): Art. 9, Art. 50
ARTICOLI DA ANALIZZARE ORA: Art. 5, Art. 6, Art. 13, Art. 14, Art. 26

Analizza ESCLUSIVAMENTE gli articoli elencati in "DA ANALIZZARE ORA".
Non generare gap per articoli non in questa lista.
```

---

## 4. FIX-12 — Checklist Arricchita

### 4.1 Problema

La checklist attuale ha solo `"Art. 9": "present" | "missing"`. Mancano:
- Stato intermedio `partial` per gap in lavorazione
- Data di addressal per storico e audit trail
- Nota di evidenza (es. "policy approvata su Confluence il 15/03")
- `users_aware_of_ai` come indicatore di status su Art. 50, non come trigger

### 4.2 Nuovo schema checklist

**`lambda-api/types/aiSystem.ts`** — aggiorna il tipo:

```typescript
// Prima:
compliance_checklist?: Record<string, 'present' | 'missing'>;

// Dopo:
export interface ChecklistEntry {
  status: 'present' | 'partial' | 'missing';
  addressed_at?: string;    // ISO date, es. "2026-03-15"
  evidence_note?: string;   // max 300 char — link a doc, descrizione azione
}

// Supporta entrambi i formati per retrocompatibilità con record esistenti:
compliance_checklist?: Record<string, ChecklistEntry | 'present' | 'missing'>;

// Funzione di normalizzazione:
export function normalizeChecklistEntry(v: ChecklistEntry | 'present' | 'missing'): ChecklistEntry {
  if (typeof v === 'string') return { status: v };
  return v;
}
```

**`lambda-api/services/complianceOutputSchema.ts`** — aggiorna lo status dei gap:

```typescript
// Aggiungi 'partial' all'enum status:
status: z.enum(['missing', 'partial', 'compliant']),
```

### 4.3 Come `partial` si propaga all'LLM

Gli articoli con `status: 'partial'` NON vengono esclusi dall'analisi LLM — vengono inclusi nel set `pendingNums` ma con un hint nel prompt:

```typescript
const partialNotes = Object.entries(checklist)
  .filter(([, entry]) => normalizeChecklistEntry(entry).status === 'partial')
  .map(([art, entry]) => {
    const note = normalizeChecklistEntry(entry).evidence_note;
    return `${art}: azione in corso${note ? ` — "${note}"` : ''}`;
  });

if (partialNotes.length > 0) {
  userMessage += `\nREQUISITI IN LAVORAZIONE (azioni parziali già avviate):\n${partialNotes.join('\n')}\n`;
  userMessage += `Per questi requisiti usa status "partial" e abbassa urgency di un livello.\n`;
}
```

### 4.4 Frontend — aggiornamento UI

Il componente di checklist nel form (Step 3 — Compliance Init) deve supportare 3 stati invece di 2:

```tsx
// Sostituisci i due bottoni presenti/mancante con 3 opzioni:
<button onClick={() => toggleChecklist(gap.article, 'present')}>✓ Ho già questo</button>
<button onClick={() => toggleChecklist(gap.article, 'partial')}>⟳ In lavorazione</button>
<button onClick={() => toggleChecklist(gap.article, 'missing')}>✗ Non ce l'ho</button>

// Quando si seleziona 'present' o 'partial', mostra textarea per evidence_note:
{(state === 'present' || state === 'partial') && (
  <textarea
    placeholder="Opzionale: link a documento, data completamento, descrizione azione..."
    maxLength={300}
    onChange={e => updateChecklistNote(gap.article, e.target.value)}
  />
)}
```

**Salvataggio:** `addressed_at` viene settato automaticamente a `new Date().toISOString().split('T')[0]` quando l'utente seleziona `present`.

### 4.5 `users_aware_of_ai` → indicatore di status Art. 50

Questo campo non deve più influenzare il trigger di Art. 50 (che ora è gestito dal rule engine). Deve diventare l'inizializzatore dello status del gap Art. 50 nella checklist:

```typescript
// In runComplianceInit(), dopo che il LLM ha prodotto i gap:
if (system.users_aware_of_ai && articles.includes(50)) {
  // Pre-popola la checklist con Art. 50 = partial
  // (l'utente ha dichiarato di informare gli utenti ma non ha documentazione)
  initialChecklist['Art. 50'] = {
    status: 'partial',
    evidence_note: 'Utente ha dichiarato che gli utenti sono informati dell\'interazione con AI',
  };
}
```

---

## 5. Aggiornamento Sanzioni — Come Funziona

Nessuna modifica a `sanctions.ts`. Il modulo già opera gap per gap e skippa i gap con `status: 'compliant'`. Con il merge del FIX-11, il comportamento è automaticamente corretto.

**Verifica:** assicurarsi che la deduplicazione articoli in `computeSanctions` gestisca il caso edge in cui lo stesso articolo ha sia un gap `compliant` (da checklist) sia un gap `partial` (da LLM re-analisi). In quel caso il gap `partial` deve prevalere per il calcolo della sanzione:

```typescript
// In sanctions.ts — deduplicazione articoli:
// Priorità: missing > partial > compliant
const STATUS_PRIORITY = { missing: 3, partial: 2, compliant: 1 };

const byArticle = new Map<string, ComplianceGap>();
for (const gap of gaps) {
  const existing = byArticle.get(gap.article);
  if (!existing || STATUS_PRIORITY[gap.status] > STATUS_PRIORITY[existing.status]) {
    byArticle.set(gap.article, gap);
  }
}
```

---

## 6. Ordine di Implementazione

```
Step 1 — Rule engine (nessun impatto su flow esistente, aggiunta pura):
  → Crea articleEngine.ts con selectApplicableArticles() + getChunksByArticles()
  → Test unitari: 5 scenari (Tidio, credit scoring, HR, GPAI provider, minimal)

Step 2 — Integrazione in complianceEngine.ts:
  → Sostituisci buildRagContext() con selectApplicableArticles() + getChunksByArticles()
  → Aggiorna buildUserMessage() con classificazione pre-determinata e lista articoli
  → Test: compliance check end-to-end con i 3 scenari Nexus Finance

Step 3 — Re-check incrementale (FIX-11):
  → Aggiungi split pending/addressed in runComplianceCheck()
  → Aggiungi generazione gap sintetici compliant
  → Test: re-check dopo aver marcato 2 articoli "present" — verifica che LLM non li rianalizza

Step 4 — Checklist arricchita (FIX-12):
  → Aggiorna tipo ChecklistEntry in types/aiSystem.ts
  → Aggiorna frontend (3 stati + textarea evidence_note)
  → Aggiorna sanctions.ts deduplicazione per status priority
  → Test: scenario partial → sanzione ridotta ma non zero
```

---

## 7. Test di Accettazione

### FIX-10 — Rule Engine
- [ ] Sistema HR deployer con `decision_domains: ['hiring']` + `makes_automated_decisions: true` → articles include [6, 9, 10, 11, 12, 13, 14, 15, 26, 27] e classification = 'high'
- [ ] Tidio chatbot (`access_mode: 'web_chat'`, `target_users: ['clients_users']`) → articles include [50], classification = 'limited'
- [ ] LLM provider (`category: 'llm'`, `role: 'provider'`) → articles include [51, 52, 53, 54, 55]
- [ ] Sistema con `emotion_recognition: true` + `category: 'hr'` → classification = 'prohibited', articles = [5]
- [ ] Zero chiamate a S3 Vectors con embedding — verificato nei log CloudWatch

### FIX-11 — Re-check Incrementale
- [ ] Articoli marcati `present` in checklist non compaiono nel prompt LLM come "da analizzare"
- [ ] Gap sintetici compliant sono presenti nell'output con `status: 'compliant'`
- [ ] Se tutti gli articoli sono `present`, LLM non viene chiamato e il costo Bedrock = 0
- [ ] Sanzioni dell'output finale non includono gap compliant

### FIX-12 — Checklist Arricchita
- [ ] `compliance_checklist` con formato legacy `"Art. 9": "present"` viene normalizzato correttamente
- [ ] Gap con `partial` in checklist → incluso nell'analisi LLM con hint nel prompt → `status: 'partial'` nell'output
- [ ] `addressed_at` viene settato automaticamente alla data corrente quando l'utente seleziona `present`
- [ ] `users_aware_of_ai: true` inizializza Art. 50 a `partial` in checklist, non esclude Art. 50 dall'analisi
- [ ] Deduplicazione sanzioni: gap `partial` prevale su gap `compliant` per lo stesso articolo

---

## 8. Note per Claude Code

1. **Cache chunk in Lambda**: `chunkCache` in `articleEngine.ts` è una variabile di modulo — persiste tra invocazioni nella stessa Lambda warm. Lambda cold start la ripopola. Con 170 chunk questo è il trade-off corretto: ~50ms al cold start, 0ms nelle invocazioni successive.

2. **Retrocompatibilità checklist**: record DynamoDB esistenti hanno `compliance_checklist: { "Art. 9": "present" }`. La funzione `normalizeChecklistEntry()` gestisce entrambi i formati. Non fare migration.

3. **`ragService.ts` non va eliminato**: il fallback al prompt statico usa ancora `RAG_ENABLED` env var. Mantieni il file ma non chiamarlo nel flusso principale. Potrebbe tornare utile per scenari edge o test.

4. **Ordine post-processing invariato**:
   ```
   verifyGrounding() → [merge compliant gaps] → applyChecklist() → computeSanctions()
   ```
   `applyChecklist()` con il nuovo schema deve usare `normalizeChecklistEntry()` per leggere lo status.

5. **`has_automatic_threshold`** (nuovo campo form): se `true` e `human_oversight_level !== 'never'`, l'LLM deve ricevere un hint: *"L'utente ha dichiarato che esiste una soglia automatica di rifiuto senza revisione umana — valuta Art. 14 con particolare attenzione"*.
