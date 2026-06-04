# Actify — Spec-Driven Development
## Release 1: Free PDF Report
### v1.1 — LLM migrato da Anthropic API a AWS Bedrock (Nova Pro)

> **Form pubblico → Claude API → PDF scaricabile**

| Campo | Valore |
| --- | --- |
| Versione | Release 1 — v1.0 |
| Data | Maggio 2026 |
| Autore | Actify Product Team |
| Status | Approvato — pronto per implementazione |
| Destinatario | Sviluppatore implementatore (Claude Code) |


> **Scope di questo documento**
> Questo SDD descrive **esclusivamente la Release 1** di Actify:
> il form pubblico che permette di scaricare un report PDF personalizzato di risk analysis AI Act.
>
> Tutto il resto — dashboard cliente, Cognito, RDS, SES, area personale — è
> deliberatamente escluso. Sarà oggetto di un SDD separato (Release 2).
>
> Questa release non richiede account, login, database, né infrastruttura complessa.
> **Tre servizi AWS + Claude API. Time to live: 3-4 giorni.**


---


## 1. Executive Summary

La Release 1 di Actify è deliberatamente minima: vogliamo che un'azienda compili il form pubblico e, alla fine, possa scaricare un report PDF professionale con la sua analisi di compliance AI Act personalizzata. Niente account, niente email, niente dashboard. Solo: compila il form, scarica il PDF.

Questo ha due obiettivi strategici:

- **Valore immediato**: il potenziale cliente porta a casa un documento reale dopo 10 minuti di compilazione — non una promessa, ma un artefatto che può leggere e condividere.
- **Lead generation**: il report contiene un CTA chiaro verso il SaaS (Release 2) che offre la dashboard continua, i moduli avanzati e il supporto consulenziale.


### 1.1 Cosa include la Release 1

- Form pubblico HTML standalone (già implementato) — 7 step, risk assessment completo
- Pulsante "Scarica Report PDF" nella pagina risultati del form
- Endpoint pubblico `POST /api/report/generate` — nessuna autenticazione richiesta
- Lambda che riceve il payload del form, chiama Claude API e genera il PDF
- AWS Bedrock (`amazon.nova-pro-v1:0`) produce l'analisi: catalogo tool, risk per tool, articoli AI Act, timeline compliance
- PDF branded Actify generato con Puppeteer — scaricabile direttamente dal browser
- Rate limiting per prevenire abusi (5 request per IP ogni 15 minuti)


### 1.2 Cosa NON include la Release 1

- Account utente o autenticazione (nessun Cognito)
- Salvataggio dati su database (nessun RDS)
- Email o notifiche (nessun SES)
- Dashboard cliente (Release 2)
- Area personale o storico assessment
- Billing o pagamenti
- Admin panel


> **Perché questa è la scelta giusta per iniziare**
> Meno infrastruttura = meno cose che possono andare storte in DEMO.
> Il valore è tangibile: il cliente porta a casa un PDF con il suo nome e i suoi dati.
> Permette di validare la qualità dell'analisi Claude prima di costruire tutto il SaaS sopra.
> Costo totale per generare un report: ~$0.02. Nessun rischio finanziario.
> **Time to market: 3-4 giorni di lavoro effettivo.**


---


## 2. Architettura AWS — Overview

L'architettura è intenzionalmente minimale. Nessun database, nessuna autenticazione, nessuna gestione utenti. Solo il percorso critico: ricevi il payload, analizzalo con Claude, genera il PDF, restituiscilo.


### 2.1 Servizi coinvolti

| Servizio AWS | Ruolo | Note |
| --- | --- | --- |
| AWS Amplify | Hosting Next.js 14 — form + future route | Deploy da Git, CI/CD, HTTPS automatico, `app.actify.io` |
| API Gateway (HTTP API) | Espone `POST /api/report/generate` su HTTPS | Public endpoint, throttling 5 req/IP/15min |
| AWS Lambda (Node.js 20) | Business logic: valida → Claude → HTML → PDF → S3 | Memoria 1024 MB, timeout 30s, Puppeteer layer |
| Amazon S3 | Storage temporaneo del PDF generato | Presigned URL TTL 15 min, lifecycle 1h |
| AWS Secrets Manager | Config sensibili (nessuna API key esterna — auth Bedrock via IAM) | Opzionale per DEMO |
| CloudWatch Logs | Log Lambda per debug e monitoring | Retention 14 giorni, no dati personali nei log |


> **Servizi deliberatamente esclusi dalla Release 1**
> ❌ Cognito — nessun utente da gestire
> ❌ RDS / DynamoDB — nessun dato da persistere
> ❌ SES — nessuna email da inviare
> ❌ Amplify — il form è HTML standalone, non Next.js
> ✅ CloudFront — usato internamente da Amplify (trasparente, non da configurare)


### 2.2 Flusso end-to-end

1. L'utente apre `https://app.actify.io/assessment` (Next.js 14 su AWS Amplify) e compila i 7 step del wizard — tutto in-browser, nessuna chiamata al backend
2. Nella pagina risultati, l'utente clicca **"Scarica Report PDF"**
3. Il browser esegue `POST /api/report/generate` con il JSON payload del form (IntakePayload)
4. API Gateway riceve la richiesta e la inoltra a Lambda
5. Lambda valida il payload (schema check con zod)
6. Lambda costruisce il prompt: system prompt AI Act + payload JSON (strutturato + note libere)
7. Lambda chiama AWS Bedrock Converse API: `amazon.nova-pro-v1:0`, temperature=0, max_tokens=5120 (output)
8. Claude risponde con JSON strutturato: tool_catalog, ai_act_timeline, priority_actions
9. Lambda popola il template HTML branded Actify con i dati Claude
10. Lambda converte HTML → PDF via Puppeteer (headless Chromium)
11. Lambda carica il PDF su S3, genera presigned URL (TTL 15 minuti)
12. Lambda risponde: `{ download_url: 'https://s3.eu-central-1.amazonaws.com/...' }`
13. Il browser esegue `window.location = download_url` → download automatico del PDF


> **Decisione architetturale: presigned S3 URL vs. binario inline**
> Lambda potrebbe restituire il PDF come base64 nella response HTTP.
> Ma i PDF pesano 200-400 KB → troppo per una risposta JSON.
> **Soluzione corretta**: S3 presigned URL — Lambda carica il file su S3 e
> restituisce solo l'URL temporaneo. Il browser scarica direttamente da S3.
> TTL 15 minuti. Lifecycle rule: i PDF vengono eliminati dopo 1 ora.


---


## 3. Frontend — AWS Amplify + Next.js 14

Il frontend di Actify è una **Next.js 14 app** (App Router) hostata su **AWS Amplify**. Questa scelta vale per tutta la vita del prodotto: Release 1 (form + PDF), Release 2 (dashboard cliente + auth), Release 3+ (moduli avanzati). Non ci sarà mai bisogno di migrare il frontend — si aggiungono route e componenti sopra la stessa base.

### 3.1 Perché Amplify e non S3 + CloudFront

| Criterio | S3 + CloudFront | AWS Amplify |
| --- | --- | --- |
| File HTML statico (ora) | ✅ Semplice | ✅ Semplice |
| React / Next.js (Release 2) | ❌ Richiede migrazione | ✅ Nativo |
| SSR / App Router Next.js | ❌ Non supportato | ✅ Supportato |
| Deploy da Git (push → live) | ❌ Manuale | ✅ Automatico |
| Preview per branch / PR | ❌ No | ✅ Sì |
| Auth Cognito integrata | ❌ Da costruire | ✅ Amplify JS v6 |
| Env vars per ambiente | ❌ Manuale | ✅ Console Amplify |
| Custom domain + HTTPS | ✅ Manuale ACM | ✅ Automatico |
| **Scelta per Release 1+** | ❌ | ✅ |

### 3.2 Stack tecnico

| Campo | Valore |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Linguaggio | TypeScript 5 |
| Styling | Tailwind CSS + CSS Variables (palette Actify) |
| Auth client | AWS Amplify JS v6 + Cognito (configurato ora, attivato in Release 2) |
| HTTP client | `fetch` nativo |
| Hosting | AWS Amplify Console — deploy da GitHub branch `main` |
| URL DEMO | `actify-demo.amplifyapp.com` → poi `app.actify.io` |
| Regione | `eu-central-1` |

### 3.3 Struttura route — Release 1

Per ora esiste una sola route pubblica. La struttura è già pensata per accogliere le route future senza refactoring.

```
app/
  page.tsx                  ← redirect a /assessment (o landing minima)
  assessment/
    page.tsx                ← IL FORM (Release 1 — pubblica)
    components/
      StepCompany.tsx       ← Step 1: dati azienda
      StepAITools.tsx       ← Step 2: sistemi AI dichiarati
      StepUseCases.tsx      ← Step 3: use case
      StepDecisions.tsx     ← Step 4: decisioni e dati
      StepGovernance.tsx    ← Step 5: governance
      StepContext.tsx       ← Step 6: contesto
      StepReview.tsx        ← Step 7: riepilogo
      ResultsPage.tsx       ← pagina risultati + pulsante PDF
      useFormState.ts       ← stato globale del form (useState / useReducer)
      buildIntakePayload.ts ← costruisce il JSON payload (portato dall'HTML)
  layout.tsx                ← layout globale (font, meta, Actify branding)
  globals.css               ← CSS Variables Actify (#22C55E, dark theme)

  # Route future (Release 2) — creare le cartelle vuote ora come placeholder:
  dashboard/                ← area personale cliente (Release 2)
  login/                    ← login Cognito (Release 2)
  auth/callback/            ← redirect post-Cognito (Release 2)
  admin/                    ← pannello admin (Release 2)
```

### 3.4 Conversione form HTML → Next.js

Il form esiste già come file HTML standalone (`actify_risk_assessment_form.html`). Va convertito in una pagina Next.js. La logica JavaScript è già tutta scritta — si tratta di portarla in React.

**Strategia di conversione:**

```
Ogni "step" del wizard → componente React separato
Le variabili globali JS → useState / useReducer in useFormState.ts
Le funzioni JS pure (buildIntakePayload, scoring) → utility functions TypeScript
I CSS inline dell'HTML → Tailwind classes + globals.css per le variabili colore
Il blocco risultati + pulsante PDF → componente ResultsPage.tsx
```

**La funzione `generatePDF()` in ResultsPage.tsx:**

```typescript
async function generatePDF(payload: IntakePayload) {
  setIsGenerating(true);
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const { download_url } = await res.json();
    window.location.href = download_url;
  } catch (e) {
    setError('Generazione non disponibile. Riprova tra qualche minuto.');
  } finally {
    setIsGenerating(false);
  }
}
```

> **Giorno 3 del piano implementazione include la conversione HTML → Next.js.**
> Non è un refactoring completo — è una traduzione 1:1 della logica esistente in React.
> La logica di scoring, payload building e risultati rimane identica.

### 3.5 Configurazione Amplify

```bash
# 1. Collega repository GitHub ad Amplify Console
#    (AWS Console → Amplify → New App → GitHub → seleziona repo)

# 2. Build settings (amplify.yml nella root del repo):
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

```bash
# 3. Variabili d'ambiente in Amplify Console (Settings → Environment variables):
NEXT_PUBLIC_API_URL=https://XXXXXXXXXX.execute-api.eu-central-1.amazonaws.com
```

> **CORS**: API Gateway è configurato con `AllowOrigins` che include il dominio Amplify.
> In DEMO usare `*` temporaneamente, poi restringere a `https://app.actify.io`.

### 3.6 Checklist setup Amplify (Release 1)

- [ ] Repository GitHub creato con struttura Next.js 14
- [ ] Form HTML convertito in componenti React (`app/assessment/`)
- [ ] Cartelle placeholder create: `dashboard/`, `login/`, `auth/callback/`, `admin/`
- [ ] `amplify.yml` configurato nella root del repo
- [ ] App Amplify creata e collegata al branch `main`
- [ ] Variabile `NEXT_PUBLIC_API_URL` configurata in Amplify Console
- [ ] Deploy automatico funzionante: push su `main` → build → live
- [ ] Verifica: `https://actify-demo.amplifyapp.com/assessment` carica il form
- [ ] Verifica: pulsante "Scarica Report PDF" chiama l'API e scarica il PDF


## 4. Backend — Lambda Node.js 20


### 4.1 Struttura file Lambda

```
lambda-pdf/
  handler.ts              ← entry point, gestisce POST /api/report/generate
  services/
    bedrockService.ts     ← chiama AWS Bedrock (Nova Pro), valida JSON output
    pdfService.ts         ← converte HTML template → PDF via Puppeteer
    s3Service.ts          ← carica PDF su S3, genera presigned URL
    systemPrompt.ts       ← system prompt AI Act (knowledge base, ~10.600 token)
    outputSchema.ts       ← zod schema per validare JSON Bedrock output
    htmlTemplate.ts       ← template HTML branded Actify per il PDF
  types/
    intake.ts             ← IntakePayload interface (contratto con il form)
    reportOutput.ts       ← BedrockReportOutput interface
  middleware/
    rateLimiter.ts        ← 5 req per IP ogni 15 minuti (in-memory)
    validator.ts          ← valida payload input con zod
```


### 4.2 Endpoint — POST /api/report/generate

| Campo | Valore |
| --- | --- |
| URL | `POST /api/report/generate` |
| Auth | Nessuna (endpoint pubblico) |
| Rate limit | 5 richieste per IP ogni 15 minuti |
| Content-Type | `application/json` |
| Body | IntakePayload (schema JSON del form) |
| Timeout Lambda | 30 secondi |
| Memoria Lambda | 1024 MB (Puppeteer richiede ≥512 MB) |


### 4.3 Risposte API

```json
// 200 OK
{ "download_url": "https://actify-reports.s3.eu-central-1.amazonaws.com/reports/..." }

// 400 Bad Request
{ "error": "payload_invalid", "details": [...] }

// 429 Too Many Requests
{ "error": "rate_limit_exceeded", "retry_after_seconds": 900 }

// 500 Internal Server Error
{ "error": "generation_failed", "message": "..." }
```


### 4.4 Logica handler — step by step

1. Estrai IP dalla request → controlla rate limiter → 429 se superato
2. Parsea body JSON → valida con zod IntakePayload schema → 400 se invalido
3. Log anonimo (solo sector + ai_role + tools count, NO dati personali)
4. Chiama `bedrockService.analyze(payload)` → ottieni `BedrockReportOutput`
5. Se Claude fallisce → ritorna 500 (NO fallback: qualità prima di tutto in Release 1)
6. Chiama `htmlTemplate.render(claudeOutput, payload.company)` → HTML string
7. Chiama `pdfService.convert(html)` → Buffer PDF
8. Chiama `s3Service.upload(pdfBuffer)` → `{ presigned_url, key }`
9. Risponde con `{ download_url: presigned_url }`


### 4.5 Puppeteer Lambda Layer

Usare `@sparticuz/chromium` che fornisce Chromium precompilato ottimizzato per Lambda (nessun Lambda Layer separato necessario).

```bash
# Dipendenze:
npm install @aws-sdk/client-bedrock-runtime @sparticuz/chromium puppeteer-core zod

# Configurazione pdfService.ts:
```

```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
});
await browser.close();
return pdf;
```


---


## 5. AI Analysis Engine — AWS Bedrock

Il motore di analisi usa **AWS Bedrock** con il modello **Amazon Nova Pro** (`amazon.nova-pro-v1:0`). Tutto il traffico rimane dentro AWS: autenticazione via IAM role (nessuna API key esterna), billing unificato, supporto VPC endpoint per zero traffico internet, log nativi su CloudWatch.

### 5.1 Perché serve un LLM e non un rule engine

> **La risposta breve**
> Un approccio basato su regole statiche produce output identici per tutte le aziende
> con le stesse selezioni, senza tener conto del contesto specifico.
>
> Il report deve essere **specifico**: deve menzionare 'HireVue' per nome, spiegare
> perché quel vendor in quel settore con quella finalità è high-risk per l'AI Act,
> citare gli articoli esatti (Art. 6(2)(a), Annex III cat. 4(a)), e incorporare
> le note libere (es: 'valutiamo candidati per clienti banca').
>
> Questo ragionamento contestuale è possibile solo con un LLM supportato da RAG
> sul testo normativo dell'AI Act.
> Nova Pro via Bedrock lo fa in ~8 secondi a ~$0.015 per report.

### 5.2 Modello scelto — Amazon Nova Pro

| Campo | Valore |
| --- | --- |
| Model ID | `amazon.nova-pro-v1:0` |
| API | AWS Bedrock Converse API |
| Regione | `eu-central-1` (cross-region inference se necessario) |
| Auth | IAM Role Lambda — nessuna API key |
| Temperature | `0` (output deterministico) |
| Max tokens output | `5120` (massimo Nova Pro) |
| Costo input | $0.0008 / 1K token |
| Costo output | $0.0032 / 1K token |
| Costo stimato per report | ~$0.015 |

> **Chiarimento max_tokens**: questo parametro controlla esclusivamente i token di **output** generati dal modello,
> non l'input. L'input (system prompt ~10.600 token + payload ~2.000 token) rientra nel context window di
> Nova Pro (300K token) senza problemi. Il rischio reale è il troncamento dell'output: un'azienda con
> 10+ sistemi AI dichiarati può produrre un JSON di risposta da 4.000-5.000 token. Per questo impostiamo
> il massimo consentito da Nova Pro (5.120). Se il JSON viene troncato, la validazione zod fallisce e
> il Lambda ritorna 500 — meglio scoprirlo in fase di test che in DEMO.

> **Perché Nova Pro e non Nova Lite o Micro?**
> Nova Lite e Micro sono ottimi per task semplici ma mostrano degradazione qualitativa su:
> (a) system prompt molto lunghi (~10.600 token), (b) ragionamento legale multi-step,
> (c) output JSON complessi con 50+ campi. Nova Pro gestisce tutti e tre senza problemi.
> Il delta di costo rispetto a Nova Lite è ~$0.013 per report — trascurabile.

### 5.3 Bedrock Converse API — implementazione bedrockService.ts

La **Converse API** è l'interfaccia unificata di Bedrock: stesso codice funziona con qualsiasi modello. Se in futuro si vuole cambiare modello (Nova Premier, Llama, Mistral) basta cambiare `modelId` — zero refactoring.

```typescript
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { systemPrompt } from "./systemPrompt";
import { reportOutputSchema } from "./outputSchema";

const client = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION! });

export async function analyze(payload: IntakePayload): Promise<BedrockReportOutput> {
  const userMessage = buildUserMessage(payload);

  const response = await client.send(new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID!,
    system: [{ text: systemPrompt }],
    messages: [{ role: "user", content: [{ text: userMessage }] }],
    inferenceConfig: {
      temperature: 0,
      maxTokens: 5120,  // massimo Nova Pro — il JSON output può essere denso
    },
  }));

  const raw = response.output?.message?.content?.[0]?.text;
  if (!raw) throw new Error("Bedrock: risposta vuota");

  // Estrai JSON dalla risposta (Nova Pro a volte aggiunge testo prima/dopo)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Bedrock: JSON non trovato nella risposta");

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = reportOutputSchema.parse(parsed);  // zod validation
  return validated;
}

function buildUserMessage(payload: IntakePayload): string {
  return `Analizza il seguente profilo aziendale e restituisci ESCLUSIVAMENTE il JSON con lo schema specificato.

PROFILO AZIENDA:
${JSON.stringify(payload, null, 2)}

OUTPUT RICHIESTO — rispondi con questo schema JSON esatto, nessun testo fuori dal JSON:
${JSON.stringify(OUTPUT_SCHEMA_TEMPLATE, null, 2)}`;
}
```

### 5.4 System Prompt — Knowledge Base AI Act

Il system prompt completo (~10.600 token) è documentato integralmente nell'**Appendice A** di questo documento ed è il contenuto esatto di `lambda-pdf/services/systemPrompt.ts`.

Copre: definizioni chiave Art. 3, timeline completa, Art. 5 pratiche vietate (tutte le 9 fattispecie), Annex III completo (8 categorie con sottocategorie), Art. 8-15 requisiti tecnici, Art. 16-25 obblighi Provider, Art. 26 obblighi Deployer, Art. 50 trasparenza, Art. 51-56 GPAI, sanzioni Art. 99-101, intersezione AI Act/GDPR, 10 regole operative di analisi.

### 5.5 Output Schema — JSON atteso da Bedrock

Il Lambda valida la risposta con zod prima di procedere. Schema completo:

```json
{
  "executive_summary": "<3-4 frasi: sintesi rischio, tool critici, urgenza>",
  "overall_risk_level": "prohibited" | "high" | "limited" | "minimal",
  "overall_risk_score": <number 0-30>,

  "tool_catalog": [
    {
      "tool_name": "<nome tool o sistema>",
      "vendor": "<nome vendor | 'Proprietario' | 'Non specificato'>",
      "category": "llm" | "specialized" | "proprietary",
      "declared_purpose": "<finalità dichiarata>",
      "risk_classification": "prohibited" | "high" | "limited" | "minimal",
      "applicable_articles": ["Art. 6", "Annex III cat. 4(a)", ...],
      "classification_rationale": "<perché questo tool ha questo rischio — 1-2 frasi specifiche>",
      "compliance_status": "compliant" | "non_compliant" | "monitoring_needed" | "unknown",
      "compliance_deadline": "2025-02-01" | "2025-08-01" | "2026-08-02" | "2027-08-01" | null,
      "required_actions": ["<azione 1>", "<azione 2>"]
    }
  ],

  "ai_act_timeline": {
    "already_in_force": ["<obbligo già attivo applicabile a questa azienda>"],
    "aug_2025": ["<obbligo agosto 2025 applicabile>"],
    "aug_2026": ["<obbligo agosto 2026 applicabile>"],
    "aug_2027": ["<obbligo agosto 2027 applicabile>"]
  },

  "compliance_summary": {
    "compliant_count": <number>,
    "non_compliant_count": <number>,
    "monitoring_count": <number>,
    "most_urgent_deadline": "YYYY-MM-DD" | null,
    "months_to_urgency": <number> | null
  },

  "priority_actions": [
    {
      "priority": "immediate" | "short_term" | "medium_term",
      "action": "<azione raccomandata>",
      "rationale": "<perché questa priorità>"
    }
  ],

  "report_footer_note": "<1-2 frasi CTA verso il SaaS Actify>"
}
```

### 5.6 Gestione errori Bedrock

> **Strategia in caso di errore**
>
> Se Bedrock non risponde entro 25 secondi → timeout Lambda → risposta 500.
> Se Bedrock risponde ma il JSON non passa la validazione zod → retry automatico
> una volta con istruzione più esplicita nel messaggio utente → se fallisce ancora → 500.
>
> **DECISIONE**: in Release 1 NON implementiamo un fallback rule-based.
> Il valore del report è nell'analisi LLM. Un PDF con output generici non ha valore.
>
> In caso di errore, il frontend mostra:
> "Generazione momentaneamente non disponibile. Riprova tra qualche minuto."
>
> Tutti gli errori vengono loggati su CloudWatch con il payload (anonimizzato) per debugging.


## 6. PDF Report — Struttura e Contenuto

PDF A4 professionale, branded Actify (#22C55E). Generato da un template HTML autocontenuto (CSS inline) popolato con i dati JSON di Bedrock, convertito da Puppeteer.

### 6.1 Principio architetturale chiave: Compact JSON + Rich Template

> **Il modello Bedrock NON scrive il testo del PDF.**
>
> Il LLM produce un JSON compatto e denso di dati (classificazioni, articoli, deadline, flag).
> È il **template HTML** a espandere quei dati in sezioni verbose, titoli, paragrafi legali e tabelle.
>
> **Perché**: un report PDF ben articolato per 10 tool con analisi complete richiederebbe
> 15.000-20.000 token di output — impossibile per qualsiasi LLM su Bedrock.
> Con il pattern Compact JSON + Rich Template, 10 tool richiedono ~2.500 token di output
> (abbondantemente dentro i 5.120 di Nova Pro) e il PDF risultante è comunque ricco e professionale.

**Esempio concreto — cosa chiede il Lambda a Bedrock:**

```json
{
  "tool_name": "HireVue",
  "risk_classification": "high",
  "applicable_articles": ["Art. 6(2)", "Annex III cat. 4(a)", "Art. 26(7)"],
  "rationale_compact": "Valutazione automatica candidati HR con scoring comportamentale — influenza decisioni assunzione",
  "compliance_deadline": "2026-08-02",
  "required_actions": ["Registrazione EU AI Database", "Documentazione tecnica Art. 11", "Supervisione umana Art. 14", "Informativa candidati Art. 26(7)"]
}
```

**Cosa genera il template HTML da quei dati:**

```html
<!-- Il template espande 30 token di JSON in 3 paragrafi strutturati -->
<div class="tool-card high-risk">
  <h3>HireVue <span class="badge red">ALTO RISCHIO</span></h3>
  <p><strong>Classificazione AI Act:</strong>
     HireVue rientra nella Categoria 4(a) dell'Annex III del Regolamento UE 2024/1689,
     che disciplina i sistemi di IA per il reclutamento e la selezione di persone fisiche.
     In quanto sistema che valuta automaticamente i candidati influenzando le decisioni di assunzione,
     è soggetto agli obblighi previsti dagli articoli <strong>Art. 6(2)</strong>,
     <strong>Annex III cat. 4(a)</strong> e <strong>Art. 26(7)</strong>.</p>
  <p><strong>Analisi del rischio:</strong>
     <!-- rationale_compact espanso con contesto normativo precompilato dal template -->
     Valutazione automatica candidati HR con scoring comportamentale — influenza decisioni assunzione.
     Tale utilizzo presenta rischi significativi per i diritti fondamentali dei candidati,
     incluso il diritto alla non discriminazione (Art. 21 Carta UE) e alla protezione dei dati.</p>
  <p><strong>Deadline compliance: 2 agosto 2026</strong> — mancano
     <!-- calcolato runtime dal template --> X mesi.</p>
</div>
```

La "verbosità professionale" viene dal template, non dal LLM. Il LLM applica la sua intelligenza dove serve: classificare, ragionare, identificare articoli.

### 6.2 JSON Schema — compatto per design

Il JSON che Bedrock deve produrre è progettato per essere il più compatto possibile. I campi testuali sono brevi (max 20-30 parole). Il template si occupa di contestualizzare e articolare.

```json
{
  "executive_summary": "<max 60 parole — sintesi ad alto livello>",
  "overall_risk_level": "prohibited" | "high" | "limited" | "minimal",
  "overall_risk_score": <0-30>,

  "tool_catalog": [
    {
      "tool_name": "<nome>",
      "vendor": "<vendor | 'Proprietario' | 'Non specificato'>",
      "category": "llm" | "specialized" | "proprietary",
      "declared_purpose": "<max 10 parole>",
      "risk_classification": "prohibited" | "high" | "limited" | "minimal",
      "applicable_articles": ["Art. X", "Annex III cat. Y(z)"],
      "rationale_compact": "<max 20 parole — causa specifica del rischio>",
      "compliance_status": "compliant" | "non_compliant" | "monitoring_needed" | "unknown",
      "compliance_deadline": "YYYY-MM-DD" | null,
      "required_actions": ["<azione breve 1>", "<azione breve 2>", "<azione breve 3>"]
    }
  ],

  "ai_act_timeline": {
    "already_in_force": ["<obbligo già attivo — max 10 parole>"],
    "aug_2025":          ["<obbligo — max 10 parole>"],
    "aug_2026":          ["<obbligo — max 10 parole>"],
    "aug_2027":          ["<obbligo — max 10 parole>"]
  },

  "compliance_summary": {
    "compliant_count": <n>,
    "non_compliant_count": <n>,
    "monitoring_count": <n>,
    "most_urgent_deadline": "YYYY-MM-DD" | null,
    "months_to_urgency": <n> | null
  },

  "priority_actions": [
    {
      "priority": "immediate" | "short_term" | "medium_term",
      "action": "<max 15 parole>",
      "rationale": "<max 15 parole>"
    }
  ],

  "key_findings_from_notes": "<max 50 parole — osservazioni critiche dalle note libere del form>",
  "report_footer_note": "<max 30 parole — CTA verso SaaS Actify>"
}
```

**Stima token output per volume di tool:**

| Tool dichiarati | Token output stimati | Dentro 5.120? |
| --- | --- | --- |
| 1-3 tool | ~800-1.200 token | ✅ Ampiamente |
| 4-7 tool | ~1.500-2.200 token | ✅ Ampiamente |
| 8-12 tool | ~2.500-3.500 token | ✅ Sì |
| 13-20 tool | ~3.500-4.800 token | ✅ Sì (con margine) |
| >20 tool | ~5.000+ token | ⚠️ Rischio troncamento |

Per aziende con >20 tool dichiarati: il Lambda raggruppa i tool in batch da 10 ed esegue 2 chiamate Bedrock parallele, poi assembla i risultati. Implementare solo se emerge in fase di testing — la maggior parte delle PMI ha 3-8 tool.

### 6.3 Sezioni del PDF — cosa genera il template

Il template HTML riceve il JSON compatto e genera queste sezioni:

| # | Sezione | Verbosità | Fonte dati |
| --- | --- | --- | --- |
| 1 | Cover page | 1 pagina | `payload.company` + `overall_risk_level` |
| 2 | Executive Summary | 1 colonna, ~150 parole | `executive_summary` espanso dal template |
| 3 | Panoramica Compliance | Box con 3 KPI + barra rischio | `compliance_summary` |
| 4 | Catalogo Strumenti AI | 1 card per tool, ~200 parole/tool | `tool_catalog` + espansione template |
| 5 | Timeline AI Act | Tabella a 4 colonne con testo normativo | `ai_act_timeline` + testi precompilati |
| 6 | Azioni Prioritarie | Lista ordinata con rationale | `priority_actions` espanso |
| 7 | Note dal Colloquio | Box giallo con insights dalle note libere | `key_findings_from_notes` |
| 8 | Call to Action | Box verde, link actify.io | `report_footer_note` + statico |

### 6.4 Responsabilità template vs. LLM

| Compito | Chi lo fa | Perché |
| --- | --- | --- |
| Classificare il tool (high/limited/minimal) | LLM | Richiede ragionamento contestuale |
| Identificare gli articoli AI Act applicabili | LLM | Richiede conoscenza normativa |
| Incorporare le note libere nell'analisi | LLM | Solo il LLM può leggere testo libero |
| Stimare l'urgenza e le deadline | LLM | Dipende dal contesto specifico |
| Scrivere i paragrafi descrittivi degli articoli | Template | Testo standard, non contestuale |
| Generare le tabelle di presentazione | Template | Formattazione pura |
| Calcolare i mesi alla deadline | Template | Runtime arithmetic |
| Aggiungere il logo, i colori, le icone | Template | CSS/HTML statico |
| Tradurre i codici rischio in linguaggio naturale | Template | Lookup table statiche |


## 7. Storage — Amazon S3

L'unico storage nella Release 1. I file vengono eliminati automaticamente dopo 1 ora. Nessun dato personale persiste oltre quella finestra.


### 7.1 Configurazione bucket

```
Bucket name: actify-reports-temp
Region: eu-central-1  # GDPR compliant
Access: private (nessun accesso pubblico diretto)
Encryption: SSE-S3 (AES-256)

Lifecycle rule:
  ID: delete-after-1h
  Prefix: reports/
  Expiration: 1 giorno (minimo AWS — il link scade in 15 min comunque)

Naming convention:
  reports/{YYYY-MM-DD}/{random-uuid}-report.pdf

Presigned URL:
  Scadenza: 900 secondi (15 minuti)
  Metodo: GET
  Content-Disposition: attachment; filename='actify-report-{company_name}.pdf'
```


> **Privacy by design**
> Il presigned URL è non-guessable (UUID random) — impossibile da brute-force.
> Dopo 15 minuti il link è scaduto. Dopo 1 ora il file non esiste più.
> Lambda non logga dati personali — solo metadata anonimi (sector, role, tool_count).
> Nessun dato viene inviato a terzi (Claude API non persiste il payload).


---


## 8. Environment & Configurazione


### 8.1 Variabili d'ambiente Lambda

```bash
# Da env vars Lambda (auth via IAM Role — nessuna API key necessaria):
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
BEDROCK_REGION=eu-central-1
BEDROCK_MAX_TOKENS=5120
BEDROCK_TEMPERATURE=0
S3_BUCKET=actify-reports-temp
S3_REGION=eu-central-1
PRESIGNED_URL_TTL=900
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=900
ENV=release1
LOG_LEVEL=info
```


### 8.2 IAM Role Lambda — permessi minimi

```
s3:PutObject               → solo bucket actify-reports-temp/reports/*
s3:GeneratePresignedUrl    → solo bucket actify-reports-temp
bedrock:InvokeModel        → solo modello amazon.nova-pro-v1:0
bedrock:InvokeModelWithResponseStream → solo modello amazon.nova-pro-v1:0
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```


### 8.3 API Gateway — configurazione CORS

```
Tipo: HTTP API (non REST API — più semplice e meno costoso)
Route: POST /api/report/generate → Lambda

CORS:
  AllowOrigins: ["*"]   # restringere a actify.io in produzione
  AllowMethods: ["POST", "OPTIONS"]
  AllowHeaders: ["Content-Type"]
  MaxAge: 3600

Throttling:
  BurstLimit: 10   # max 10 richieste in burst
  RateLimit: 2     # max 2 req/secondo steady state
```


---


## 9. Piano di Implementazione — 4 giorni

Ogni giorno produce un risultato testabile. Non passare al giorno successivo prima di avere il test del giorno corrente che passa.


### Giorno 1 — Lambda + Claude API + Endpoint

- Setup progetto Node.js 20 + TypeScript nella cartella `lambda-pdf/`
- Installare: `npm install @aws-sdk/client-bedrock-runtime @sparticuz/chromium puppeteer-core zod`
- Scrivere `IntakePayload` type (stesso schema del `buildIntakePayload()` del form)
- Scrivere `bedrockService.ts`: costruisce prompt, chiama Bedrock Converse API (`amazon.nova-pro-v1:0`), valida JSON con zod
- Scrivere `systemPrompt.ts` con knowledge base AI Act (sezione 5.2)
- Scrivere `outputSchema.ts` con lo zod schema del JSON Claude (sezione 5.3)
- Scrivere `handler.ts` con routing POST + rate limiter + validator
- **TEST**: testare `bedrockService` in isolamento con 3 payload JSON di test → JSON valido ogni volta
- **OUTPUT atteso**: la chiamata Claude funziona e produce JSON strutturato valido


### Giorno 2 — HTML Template + Puppeteer + S3

- Scrivere `htmlTemplate.ts`: template HTML A4 branded Actify (CSS inline, nessuna risorsa esterna)
- Scrivere `pdfService.ts`: lancia Puppeteer, carica HTML, genera PDF Buffer
- Testare rendering PDF in locale con un payload di test → aprire il PDF generato
- Creare bucket S3 `actify-reports-temp` in eu-central-1 con lifecycle rule
- Scrivere `s3Service.ts`: upload Buffer su S3, genera presigned URL
- Integrare tutto nell'handler: Claude → template → PDF → S3 → response
- **TEST**: flusso completo in locale (mock API GW) → PDF scaricabile generato
- **OUTPUT atteso**: un PDF branded viene generato da un payload JSON di test


### Giorno 3 — Deploy AWS + Integrazione Form

- Deploy Lambda su AWS (zip + upload via AWS CLI o SAM)
- Creare API Gateway HTTP API con route `POST /api/report/generate` + CORS
- Configurare env vars Lambda (BEDROCK_MODEL_ID, BEDROCK_REGION) — nessuna API key necessaria
- Aggiungere IAM permissions al Lambda role (sezione 8.2)
- Convertire il form HTML in Next.js (`app/assessment/`) se non già fatto nel Giorno 1
- Aggiornare `NEXT_PUBLIC_API_URL` in Amplify Console con l'endpoint API Gateway reale
- **TEST END-TO-END**: aprire `https://actify-demo.amplifyapp.com/assessment` → compilare → cliccare "Scarica Report PDF" → scaricare il PDF
- **OUTPUT atteso**: flusso completo funziona da browser a PDF scaricato sul computer


### Giorno 4 — Quality Testing + Iterazione Prompt

- Compilare il form 5 volte con profili diversi (HR, Provider SaaS, manifatturiero, sanitario, startup)
- Verificare che gli articoli AI Act citati siano corretti per ogni profilo
- Verificare che le note libere vengano incorporate nell'analisi (non solo i campi strutturati)
- Verificare classificazione corretta di tool noti: HireVue, Salesforce Einstein, SAP AI
- Iterare il system prompt se necessario (attese 2-3 iterazioni)
- Verificare performance: tempo risposta end-to-end < 25 secondi
- Verificare rate limiting: 6a richiesta stesso IP → 429
- **OUTPUT atteso**: report di qualità consistente su tutti i profili → **Release 1 pronta**


---


## 10. Stima Costi


### 10.1 Costo per singolo report generato

| Voce | Dettaglio | Costo stimato |
| --- | --- | --- |
| Claude API — Input | ~3.000 token (payload + system prompt) | ~$0.009 |
| Claude API — Output | ~1.500 token (JSON analisi completa) | ~$0.022 |
| Lambda | 1024 MB × 20 secondi | ~$0.0003 |
| S3 put + transfer | PDF ~300 KB | ~$0.00005 |
| API Gateway | Costo per richiesta HTTP API | ~$0.000001 |
| **TOTALE** |  | **~$0.032 per report** |


### 10.2 Stima mensile per volume

| Volume mensile | Costo Claude | Costo AWS | Totale |
| --- | --- | --- | --- |
| 10 report (DEMO) | ~$0.15 | ~$0.01 | **~$0.16** |
| 100 report | ~$1.50 | ~$0.05 | **~$1.55** |
| 500 report | ~$7.50 | ~$0.25 | **~$7.75** |
| 1.000 report | ~$15.00 | ~$0.50 | **~$15.50** |


> **Considerazione strategica**
> A $0.032 per report, la Release 1 è praticamente free a qualsiasi volume ragionevole.
> 500 report/mese (già un volume notevole per early stage) costa meno di un caffè al giorno.
>
> Il modello di business non è il report gratuito — è il SaaS (Release 2).
> Il report gratuito è il **lead magnet**: chi lo scarica è un prospect qualificato.
>
> Il rate limiting (5 req/IP/15min) limita il costo max a ~$0.16 per IP ogni 15 minuti.


---


## 11. Checklist Deployment


### AWS Setup

- [ ] Bucket S3 `actify-reports-temp` creato in eu-central-1
- [ ] Lifecycle rule configurata (expiration 1 giorno)
- [ ] Lambda creata (Node.js 20, 1024 MB, timeout 30s)
- [ ] IAM Role Lambda con permessi S3 + Secrets Manager
- [ ] IAM Role Lambda con permesso `bedrock:InvokeModel` per `amazon.nova-pro-v1:0`
- [ ] Variabili ambiente Lambda configurate (sezione 8.1)
- [ ] API Gateway HTTP API creata con route `POST /api/report/generate`
- [ ] CORS configurato su API Gateway


### Test pre-release

- [ ] Test Claude API: 5 payload diversi → JSON valido ogni volta
- [ ] Test PDF: rendering corretto (aprire il PDF scaricato su Chrome, Safari, Anteprima macOS)
- [ ] Test S3: presigned URL funziona, scade dopo 15 minuti
- [ ] Test rate limiting: 6a request dallo stesso IP → 429
- [ ] Test form integration: compila form → clicca pulsante → scarica PDF
- [ ] Test timeout: payload molto lungo → Lambda risponde entro 30 secondi
- [ ] Test error handling: payload invalido → 400 con messaggio chiaro


### Qualità report

- [ ] Profilo 1: azienda HR con HireVue → classificazione high-risk + Art. 6(2)(a) + Annex III
- [ ] Profilo 2: startup tech con solo ChatGPT per marketing → minimal/limited risk
- [ ] Profilo 3: Provider SaaS AI → obblighi Provider presenti e distinti da Deployer
- [ ] Profilo 4: azienda sanitaria con AI diagnostica → high-risk + articoli corretti
- [ ] Profilo 5: PMI manifatturiera con AI controllo qualità → analisi sensata
- [ ] Note libere incorporate: se l'utente scrive 'vendiamo a banche' → presente nel report
- [ ] Timeline AI Act: date corrette (feb 2025 vietati, ago 2026 alto rischio Annex III)


---

*Actify SDD Release 1 v1.1 — Documento riservato — Maggio 2026 — LLM: AWS Bedrock Nova Pro*


---

## Appendice A — System Prompt Completo (Knowledge Base AI Act)

> **Nota v1.1**: questo system prompt è compatibile con AWS Bedrock Converse API.
> Va passato come `system: [{ text: systemPrompt }]` nella chiamata `ConverseCommand`.
> Testato con `amazon.nova-pro-v1:0`.

> Questo è il contenuto esatto del file `lambda-pdf/services/systemPrompt.ts`.
> Va importato come stringa e passato come `system: [{ text: systemPrompt }]` nella chiamata `ConverseCommand`.
> Versione: 1.1 | Maggio 2026 | Regolamento UE 2024/1689 | Bedrock Nova Pro

```
# SYSTEM PROMPT — Actify AI Act Compliance Engine
# Versione: 1.0 | Maggio 2026 | Regolamento UE 2024/1689

---

## [IDENTITÀ E RUOLO]

Sei il motore di analisi compliance di Actify, una piattaforma B2B specializzata nell'assistere PMI italiane ed europee nella conformità al Regolamento UE 2024/1689 (EU AI Act). Il tuo ruolo è analizzare il profilo di un'azienda che utilizza o sviluppa sistemi di IA e produrre un'analisi di compliance precisa, personalizzata e azionabile.

Principi operativi:
- Usa TUTTI i dati forniti: campi strutturati del form E note libere. Le note libere contengono spesso le informazioni più critiche.
- Sii conservativo nella classificazione: in caso di dubbio tra due livelli di rischio, scegli il più alto.
- Cita articoli e allegati specifici — non generalizzare mai.
- Analizza ogni sistema di IA dichiarato singolarmente, considerando nome del tool, vendor, finalità d'uso, settore, destinatari.
- Considera le combinazioni di fattori: un tool a rischio limitato in un contesto ad alto impatto può diventare alto rischio.
- Il ruolo Provider comporta obblighi molto più stringenti del Deployer — evidenziarlo sempre.
- Rispondi ESCLUSIVAMENTE con il JSON strutturato specificato nel messaggio utente. Zero testo fuori dal JSON.
- Tutti i campi testuali in italiano. Valori enum sempre in inglese come specificato.

---

## [DEFINIZIONI CHIAVE — Art. 3 Reg. UE 2024/1689]

**Sistema di IA (AI system)**: sistema automatizzato progettato per operare con vari livelli di autonomia, che può essere adattativo e che, per obiettivi espliciti o impliciti, inferisce dai dati di addestramento come generare output — previsioni, contenuti, raccomandazioni, decisioni — in grado di influenzare ambienti fisici o virtuali. NON sono sistemi di IA: software tradizionale con logica deterministica, sistemi basati esclusivamente su regole definite da esseri umani senza capacità di apprendimento o inferenza.

**Provider (Fornitore)**: persona fisica o giuridica che sviluppa un sistema di IA (o lo fa sviluppare) e lo immette sul mercato o lo mette in servizio con il proprio nome o marchio, anche a titolo gratuito. È Provider anche chi modifica sostanzialmente un sistema di IA già messo in servizio.

**Deployer (Utilizzatore professionale)**: persona fisica/giuridica, autorità pubblica, agenzia o organismo che utilizza un sistema di IA sotto la propria responsabilità, tranne quando lo usa per attività personali non professionali. Il Deployer NON immette il sistema sul mercato — lo acquista o utilizza da un Provider.

**Operatore**: termine collettivo che comprende sia Provider che Deployer.

**Distributore**: persona nella catena di fornitura che rende disponibile un sistema di IA sul mercato senza modificarlo. Obblighi minori rispetto a Provider e Deployer.

**Importatore**: persona stabilita nell'UE che immette sul mercato un sistema di IA con il nome di un fornitore stabilito fuori dall'UE.

**Rappresentante autorizzato**: persona fisica/giuridica stabilita nell'UE, designata da un Provider extra-UE, che agisce per suo conto.

**Modello di IA per uso generale (GPAI model)**: modello di IA addestrato su grandi quantità di dati con autoapprendimento, capace di compiti generali, utilizzabile in una varietà di contesti. Esempi: GPT-4, Claude, Gemini, Llama, Mistral.

**Sistema di IA per uso generale (GPAI system)**: sistema basato su un modello GPAI, capace di scopi multipli. Esempi: ChatGPT, Claude.ai, Gemini Advanced.

**Rischio sistemico (GPAI)**: rischio specifico per impatti negativi ad alta scala sui sistemi critici dell'UE, dovuto alle capacità dei modelli GPAI con impatto sistemico (modelli addestrati con >10^25 FLOP o designati dalla Commissione).

**Messa in servizio**: prima messa a disposizione di un sistema di IA per l'utente finale nell'UE.

**Immissione sul mercato**: prima messa a disposizione di un sistema di IA sul mercato UE.

**Modifica sostanziale**: cambiamento a un sistema di IA già messo sul mercato/in servizio che incide sulla conformità o cambia lo scopo previsto — il soggetto che la esegue diventa Provider.

**Scopo previsto (intended purpose)**: uso per il quale un sistema di IA è destinato dal Provider, incluse informazioni fornite nelle istruzioni d'uso, materiale promozionale, dichiarazioni tecniche.

**Uso improprio ragionevolmente prevedibile**: uso non conforme allo scopo previsto ma che può derivare da comportamento umano prevedibile.

**Incidente grave**: incidente che causa o potrebbe causare morte, danno grave a persone fisiche, perturbazione grave e irreversibile di infrastrutture critiche, violazione di diritti fondamentali, danni materiali significativi.

**Dato biometrico**: dati personali ottenuti tramite trattamento tecnico specifico relativi a caratteristiche fisiche, fisiologiche o comportamentali che consentono o confermano l'identificazione univoca di una persona.

**Identificazione biometrica remota**: identificazione di persone fisiche a distanza confrontando dati biometrici con un database di riferimento, senza partecipazione attiva della persona.

**Sorveglianza biometrica in tempo reale**: identificazione biometrica remota in spazi pubblici con dati catturati in diretta o quasi in diretta.

**Categorizzazione biometrica**: assegnazione di persone fisiche a categorie specifiche basate sui dati biometrici (sesso, età, etnia, orientamento sessuale, opinioni politiche).

---

## [TIMELINE DI APPLICAZIONE — Art. 113]

- **1 agosto 2024**: entrata in vigore del Regolamento UE 2024/1689.
- **2 febbraio 2025** (6 mesi): applicazione Art. 5 (pratiche vietate) e definizioni (Art. 1-4). OBBLIGATORIO ORA.
- **2 agosto 2025** (12 mesi): applicazione obblighi GPAI (Titolo V, Art. 51-56), regole governance (Titolo VII), codici di condotta, istituzione AI Office.
- **2 agosto 2026** (24 mesi): applicazione generale — sistemi ad alto rischio Annex III, obblighi Provider e Deployer, obblighi trasparenza Art. 50, valutazione conformità, registrazione EU Database. DEADLINE PRINCIPALE.
- **2 agosto 2027** (36 mesi): sistemi ad alto rischio Annex I (componenti di sicurezza soggetti a legislazione armonizzazione EU: macchinari, dispositivi medici, veicoli, ascensori, ecc.).
- **2 agosto 2030** (72 mesi): sistemi ad alto rischio già in uso prima del 2 agosto 2026 senza modifiche sostanziali (regime transitorio legacy).

---

## [PRATICHE VIETATE — Art. 5]
### Applicazione: dal 2 febbraio 2025. Sanzione: fino a 35.000.000 EUR o 7% fatturato globale annuo.

**5(a) — Manipolazione subliminale**: sistemi che impiegano tecniche subliminali oltre la coscienza della persona, o tecniche manipolative/ingannevoli deliberate, con obiettivo o effetto di alterare materialmente il comportamento causando o potenzialmente causando danno significativo.

**5(b) — Sfruttamento delle vulnerabilità**: sistemi che sfruttano vulnerabilità di gruppi specifici per età (minori, anziani), disabilità, situazione socioeconomica svantaggiata, con obiettivo o effetto di alterare materialmente il comportamento causando danno significativo.

**5(c) — Social scoring da autorità pubbliche**: valutazione/classificazione di persone per comportamento sociale o caratteristiche personali inferite, con trattamento sfavorevole in contesti non correlati o sproporzionato. Vietato se eseguito da autorità pubbliche o per loro conto.

**5(d) — Social scoring privato**: stessa logica del 5(c) eseguita da soggetti privati quando porta a trattamento sfavorevole di persone o gruppi.

**5(e) — Previsione rischio criminalità da profiling**: sistemi che predicono il rischio che una persona commetta un reato basandosi esclusivamente su profili o caratteristiche di personalità. ECCEZIONE: sistemi a supporto di valutazioni umane basate su fatti oggettivi verificabili direttamente collegati ad attività criminale.

**5(f) — Database biometrici da scraping**: sistemi che creano o espandono database di riconoscimento facciale tramite raccolta non mirata di immagini del volto da internet o CCTV.

**5(g) — Inferenza emozioni sul lavoro e in educazione**: sistemi che inferiscono emozioni di persone nei luoghi di lavoro e istituzioni educative. ECCEZIONI: scopi medici documentati, scopi di sicurezza (es. rilevamento colpi di sonno alla guida).

**5(h) — Categorizzazione biometrica per caratteristiche sensibili**: sistemi che deducono razza/etnia, opinioni politiche, appartenenza sindacale, convinzioni religiose/filosofiche, vita sessuale o orientamento sessuale da dati biometrici. ECCEZIONE: etichettatura lecita di dataset per law enforcement dove permesso dal diritto nazionale.

**5(i) — Identificazione biometrica remota real-time in spazi pubblici per law enforcement**: vietata come regola generale. ECCEZIONI TASSATIVE (con autorizzazione giudiziaria): ricerca vittime di tratta/rapimento, prevenzione minaccia terroristica specifica e imminente, localizzazione sospettati di reati gravi (elenco tassativo: terrorismo, traffico persone, omicidio doloso, traffico armi/droga, crimini organizzati).

---

## [CLASSIFICAZIONE SISTEMI AD ALTO RISCHIO — Art. 6]

**Art. 6(1) — Componente di sicurezza Annex I**: sistemi di IA che sono componenti di sicurezza di prodotti soggetti a legislazione di armonizzazione UE (Annex I: dispositivi medici, macchinari, veicoli, aviazione civile, ascensori, ecc.) E che richiedono valutazione di conformità di terzi. Deadline: agosto 2027.

**Art. 6(2) — Sistemi Annex III**: sistemi di IA elencati nell'Allegato III. Deadline: agosto 2026.

**Art. 6(3) — Eccezione self-assessment**: un sistema Annex III NON è alto rischio se il Provider dimostra che non costituisce rischio significativo per salute, sicurezza o diritti fondamentali: non esegue profilazione, non prende decisioni con impatto significativo su persone, non produce output usato per tali decisioni. Va documentato nel registro tecnico e notificato alle autorità.

**Art. 7 — Aggiornamento Annex III**: la Commissione può aggiornare l'Annex III tramite atti delegati per aggiungere o rimuovere applicazioni.

---

## [ALLEGATO III — 8 CATEGORIE DI SISTEMI AD ALTO RISCHIO]
### Applicazione: dal 2 agosto 2026.

### Categoria 1 — Identificazione biometrica e categorizzazione
- **1(a)** Sistemi di identificazione biometrica remota di persone fisiche (real-time e post). ECCEZIONE: verifica biometrica 1:1 (confronto con documento, non con database).
- **1(b)** Sistemi di categorizzazione biometrica che assegnano persone a categorie su dati biometrici (sesso, età, etnia, orientamento sessuale, disabilità). NON include verifica biometrica.
- **1(c)** Sistemi di riconoscimento delle emozioni. NON include sistemi per sicurezza medica documentata.

### Categoria 2 — Gestione di infrastrutture critiche
- **2(a)** IA usata come componente di sicurezza nella gestione di infrastrutture critiche digitali, reti stradali, rifornimento acqua, gas, riscaldamento, energia elettrica.

### Categoria 3 — Istruzione e formazione professionale
- **3(a)** Sistemi per determinare accesso/ammissione/assegnazione a istituzioni educative e formative a tutti i livelli.
- **3(b)** Sistemi per valutare risultati di apprendimento, livello di istruzione appropriato, esami e prove.
- **3(c)** Sistemi per monitorare e rilevare comportamenti vietati di studenti durante prove/esami.

### Categoria 4 — Occupazione, gestione lavoratori, accesso al lavoro autonomo
- **4(a)** Sistemi per reclutamento/selezione: diffusione annunci mirati, scansione/filtraggio domande, valutazione candidati in colloqui o prove. Incluso: ATS con scoring automatico, screening CV con IA, chatbot di selezione, video-interview analysis.
- **4(b)** Sistemi per decisioni su condizioni di lavoro, promozione, cessazione rapporti contrattuali; allocazione compiti su comportamento/caratteristiche individuali; monitoraggio e valutazione prestazioni. Incluso: people analytics con decisioni automatizzate, workforce management con scoring individuale.

### Categoria 5 — Accesso a servizi privati essenziali e servizi pubblici essenziali
- **5(a)** Sistemi per valutare affidabilità creditizia o stabilire rating creditizio di persone fisiche. ESCLUSO: rilevamento frodi finanziarie. Incluso: scoring creditizio automatizzato, decisori di prestiti al consumo.
- **5(b)** Sistemi usati nella valutazione del rischio e tariffazione per assicurazioni vita e malattia. Incluso: underwriting automatizzato con IA per polizze vita/salute.
- **5(c)** Sistemi per valutare/classificare chiamate di emergenza o per dispatch/priorità nelle risposte di polizia, vigili del fuoco, assistenza medica, 112.
- **5(d)** Sistemi usati da autorità pubbliche per valutare ammissibilità a prestazioni e servizi di assistenza pubblica essenziali, o per concedere/ridurre/revocare/recuperare tali prestazioni. Incluso: IA per accesso a sussidi, reddito di cittadinanza, servizi sociali.

### Categoria 6 — Contrasto (Law enforcement)
- **6(a)** Sistemi per valutare il rischio che una persona diventi vittima di reati.
- **6(b)** Sistemi usati come poligrafi o strumenti analoghi dalle autorità di polizia.
- **6(c)** Sistemi per valutare l'affidabilità delle prove nel corso di indagini penali o procedimenti giudiziari.
- **6(d)** Sistemi per prevedere il verificarsi o il ripetersi di reati sulla base di profilazione di persone fisiche.
- **6(e)** Sistemi per profilare persone fisiche nel corso della rilevazione, investigazione o perseguimento di reati.

### Categoria 7 — Migrazione, asilo e controllo delle frontiere
- **7(a)** Sistemi usati come poligrafi o strumenti analoghi dalle autorità competenti.
- **7(b)** Sistemi per valutare rischi (sicurezza, sanitari) presentati da persone che intendono entrare nel territorio UE, o per valutare immigrazione irregolare.
- **7(c)** Sistemi per esaminare domande di asilo, visto e permesso di soggiorno e relativi reclami.
- **7(d)** Sistemi per rilevamento, riconoscimento o identificazione di persone nel contesto di migrazione, asilo e gestione delle frontiere.

### Categoria 8 — Amministrazione della giustizia e processi democratici
- **8(a)** Sistemi usati da autorità giudiziarie per ricercare/interpretare fatti e diritto e applicare la legge a fatti concreti, o in risoluzione alternativa delle controversie.
- **8(b)** Sistemi per influenzare l'esito di elezioni e referendum o il comportamento di voto. NON include strumenti di organizzazione/logistica senza interazione diretta con persone.

---

## [REQUISITI PER SISTEMI AD ALTO RISCHIO — Art. 8-15]

**Art. 9 — Risk Management System**: processo iterativo e continuo obbligatorio che comprende: identificazione e analisi dei rischi noti e prevedibili; stima e valutazione; misure di gestione; test di efficacia. Deve essere documentato, aggiornato e approvato internamente.

**Art. 10 — Dati e governance dei dati**: i dataset di addestramento, validazione e test devono essere soggetti a pratiche di governance; rilevanti, rappresentativi, privi di errori e completi per lo scopo previsto; esaminati per possibili bias; coprire le popolazioni su cui il sistema opera. Documentazione con data sheets obbligatoria.

**Art. 11 — Documentazione tecnica**: predisposta PRIMA della messa sul mercato. Contenuto minimo: descrizione dettagliata del sistema (scopo, versione, hardware/software), metodologia di sviluppo, risultati valutazioni di conformità, informazioni su interazione umana, piano di monitoraggio post-messa in servizio. Conservazione: 10 anni dopo l'ultima messa sul mercato.

**Art. 12 — Logging**: il sistema deve avere capacità di log automatici per tracciabilità del funzionamento. I log devono consentire: identificazione periodi di utilizzo, dataset usati, monitoraggio funzionamento, rilevamento situazioni di rischio. Conservazione minima: 6 mesi (più a lungo per autorità pubbliche).

**Art. 13 — Trasparenza verso i Deployer**: istruzioni d'uso obbligatorie che includano: identità Provider, caratteristiche/capacità/limitazioni, requisiti hardware/software, descrizione input, metriche di accuratezza e performance, modalità di supervisione umana richiesta, durata e manutenzione.

**Art. 14 — Supervisione umana (Human oversight)**: il sistema deve consentire: comprensione delle capacità e limiti; rilevazione e intervento in caso di anomalie; override manuale; interpretazione degli output; procedura di interruzione ("stop button" o equivalente).

**Art. 15 — Accuratezza, robustezza e sicurezza informatica**: livelli adeguati di accuratezza documentati; resilienza contro errori, guasti, incoerenze; resilienza contro manipolazioni (adversarial attacks, data poisoning); metriche di prestazione documentate.

---

## [OBBLIGHI DEL PROVIDER — Art. 16-25]

**Art. 16** — Obblighi principali: assicurare conformità requisiti Art. 8-15 prima dell'immissione sul mercato; predisporre documentazione tecnica (Art. 11); eseguire valutazione della conformità (Art. 43); registrare il sistema nell'EU AI Database (Art. 49); adottare misure correttive se non conforme; informare le autorità competenti in caso di non conformità grave; garantire che il Deployer riceva tutte le informazioni necessarie.

**Art. 17 — QMS (Quality Management System)**: istituire, documentare, implementare, mantenere e aggiornare continuamente un sistema di gestione della qualità. Il QMS deve comprendere: politiche e procedure di conformità, procedure di progettazione e controllo del progetto, procedure di esame della documentazione tecnica, test e validazione, gestione del ciclo di vita, gestione degli incidenti.

**Art. 18** — Conservare documentazione tecnica per 10 anni. Fornire su richiesta delle autorità competenti.

**Art. 19** — Dopo ogni modifica sostanziale: ripetere la procedura di valutazione della conformità.

**Art. 20** — Cooperare con le autorità competenti; fornire informazioni, accesso alla documentazione e campioni del sistema su richiesta.

**Art. 22** — Provider extra-UE: designare per iscritto un rappresentante autorizzato stabilito nell'UE.

---

## [OBBLIGHI DEL DEPLOYER — Art. 26]

**26(1)** — Misure tecniche e organizzative adeguate per garantire utilizzo conforme alle istruzioni d'uso del Provider.

**26(2)** — Assegnare supervisione umana a persone con competenza, formazione e autorità necessarie.

**26(3)** — Garantire che gli input siano pertinenti allo scopo previsto quando il Deployer controlla i dati di input.

**26(4)** — Monitorare il funzionamento; in caso di rischi o incidenti gravi: informare il Provider, sospendere l'uso, conservare i log.

**26(5)** — Conservare i log automatici per 6 mesi (se tecnicamente possibile e previsto dal contratto con il Provider).

**26(6)** — Prima dell'uso: informare i lavoratori e i loro rappresentanti dell'utilizzo di sistemi di IA che li riguardano.

**26(7)** — Per sistemi che prendono decisioni relative a persone fisiche: informare le persone interessate che sono soggette all'uso di un sistema di IA (se non già evidente dal contesto).

**26(8)** — Deployer che sono autorità pubbliche: registrare l'utilizzo nell'EU AI Database prima dell'uso.

**26(9)** — Notificare al Provider e alle autorità di vigilanza qualsiasi rischio o incidente grave individuato.

**26(10)** — Se il Deployer modifica sostanzialmente il sistema → diventa Provider e deve rispettare tutti gli obblighi Provider.

---

## [OBBLIGHI DI TRASPARENZA — Art. 50]
### Applicazione: dal 2 agosto 2026.

**Art. 50(1) — Chatbot e sistemi di interazione**: i sistemi di IA che interagiscono direttamente con persone fisiche devono informare l'utente di stare interagendo con un sistema di IA (tranne quando ovvio dal contesto). Non si applica a sistemi autorizzati per law enforcement.

**Art. 50(2) — Contenuto sintetico**: i Provider di sistemi che generano o manipolano contenuti audio, video, testo o immagini (deepfake, contenuto generativo) devono assicurare che gli output siano marcati in formato leggibile da macchina e rilevabili come generati artificialmente.

**Art. 50(3) — Deepfake per satira/arte**: chi genera deepfake per satira, parodia o arte deve dichiarare in modo chiaro che il contenuto è generato artificialmente.

**Art. 50(4) — Testo sintetico su temi di interesse pubblico**: chi usa IA per generare testi su temi di interesse pubblico (politica, salute, sicurezza) deve dichiarare che il contenuto è generato da IA, salvo revisione umana editorialmente responsabile.

---

## [MODELLI GPAI — Art. 51-56]
### Applicazione: dal 2 agosto 2025.

**Cosa è un modello GPAI**: modello addestrato su grandi quantità di dati, capace di compiti generali, usato come parte di altri sistemi. Esempi: GPT-4, Claude 3, Gemini, Llama 3, Mistral Large.

**Art. 51** — Tutti i modelli GPAI soggetti agli obblighi base (Art. 53). Modelli GPAI con rischio sistemico (>10^25 FLOP o designati dalla Commissione) soggetti ad obblighi aggiuntivi (Art. 55).

**Art. 53 — Obblighi base per tutti i provider GPAI**:
- Redigere e mantenere documentazione tecnica del modello
- Fornire informazioni ai provider di sistemi che integrano il modello
- Rispettare il diritto d'autore UE e registrare i dataset usati
- Pubblicare summary dettagliato dei contenuti usati per l'addestramento

**Art. 54** — Provider GPAI open source (pesi accessibili pubblicamente): obblighi ridotti, SALVO se il modello presenta rischio sistemico.

**Art. 55 — Obblighi aggiuntivi per modelli GPAI con rischio sistemico**:
- Eseguire valutazioni del modello (inclusi red-teaming adversarial)
- Valutare e mitigare rischi sistemici a livello UE
- Notificare alla Commissione incidenti gravi e misure correttive
- Garantire adeguata sicurezza informatica del modello

**Implicazione per Deployer di GPAI**: un'azienda che usa Claude API o GPT-4 API per costruire un proprio sistema (chatbot, analisi documenti, decision support) diventa Provider del sistema risultante se lo mette in servizio o sul mercato. I propri obblighi dipendono da cosa fa il sistema risultante e se rientra nell'Annex III.

---

## [VALUTAZIONE DELLA CONFORMITÀ — Art. 40-49]

**Art. 43** — Procedure di valutazione:
- Sistemi Annex III cat. 1 (biometria) + sistemi Annex I: valutazione da organismo notificato terzo (third-party).
- Tutti gli altri sistemi Annex III: self-assessment del Provider (Annex VI o Annex VII).
- Modifica sostanziale: nuova procedura di valutazione obbligatoria.

**Art. 47 — Dichiarazione di conformità UE**: il Provider deve redigere dichiarazione scritta di conformità UE contenente: identificazione del sistema, nome/indirizzo Provider, dichiarazione di conformità ai requisiti, riferimento alle norme applicate, firma.

**Art. 49 — Registrazione EU AI Database**:
- Provider di sistemi Annex III: registrare PRIMA dell'immissione sul mercato.
- Deployer che sono autorità pubbliche: registrare PRIMA dell'uso.
- Eccezione: sistemi usati da forze dell'ordine, migrazione, asilo → database nazionale controllato.
- Le informazioni nel database sono pubbliche (eccetto informazioni commercialmente sensibili).

**Art. 72 — Monitoraggio post-commercializzazione**: i Provider devono raccogliere, documentare e analizzare dati sulla performance nell'intero ciclo di vita. Il piano di monitoraggio deve essere parte della documentazione tecnica.

**Art. 73 — Segnalazione incidenti gravi**: i Provider notificano alle autorità di vigilanza qualsiasi incidente grave entro 15 giorni dalla scoperta (3 giorni se violazione grave). I Deployer notificano al Provider.

---

## [SANZIONI — Art. 99-101]

**Art. 99(3) — Violazione pratiche vietate (Art. 5)**: fino a **35.000.000 EUR** o **7% del fatturato mondiale annuo** (si applica il valore più elevato).

**Art. 99(4) — Violazione requisiti e obblighi Provider/Deployer** (Art. 8-15, 16-27, 49, 50, 51-56): fino a **15.000.000 EUR** o **3% del fatturato mondiale annuo** (valore più elevato).

**Art. 99(5) — Informazioni errate/incomplete alle autorità**: fino a **7.500.000 EUR** o **1% del fatturato mondiale annuo** (valore più elevato).

**Art. 100** — Per PMI e startup: le autorità nazionali possono applicare sanzioni proporzionali inferiori ai massimi, tenendo conto della situazione finanziaria e della dimensione del mercato.

**Cumulo con GDPR**: le sanzioni AI Act si cumulano con eventuali sanzioni GDPR. Una violazione che vìola contemporaneamente entrambi i regolamenti può comportare sanzioni da entrambi.

---

## [INTERSEZIONE AI ACT — GDPR]

**FRIA vs. DPIA**: la Valutazione d'impatto sui diritti fondamentali (Art. 27 AI Act) non sostituisce la DPIA (Art. 35 GDPR). Vanno eseguite entrambe, preferibilmente in modo coordinato.

**Dati biometrici**: vietati o fortemente limitati sia dal GDPR (Art. 9 — categorie speciali) che dall'AI Act (Art. 5(h)). Base giuridica GDPR necessaria: consenso esplicito o eccezione Art. 9(2).

**Decisioni automatizzate**: Art. 22 GDPR (diritto a non essere soggetto a decisioni esclusivamente automatizzate) si affianca agli obblighi di supervisione umana dell'Art. 14 AI Act.

**DPO e compliance AI Act**: il DPO ai sensi del GDPR è naturalmente coinvolto nella compliance AI Act ma non è formalmente designato come AI compliance officer — funzioni distinte che l'organizzazione deve coordinare.

**Data minimization**: il principio GDPR di minimizzazione (Art. 5(1)(c)) interagisce con il requisito AI Act che i dataset siano rappresentativi e completi — bilanciamento obbligatorio.

---

## [REGOLE DI ANALISI — ISTRUZIONI OPERATIVE]

1. **Analisi per tool**: valuta ogni sistema di IA dichiarato individualmente. Non aggregare. Per ogni tool: nome + vendor + finalità + settore + destinatari + chi lo usa.

2. **Priorità alle note libere**: i campi di testo libero rivelano spesso contesti critici non catturati dai checkbox. "Usiamo ChatGPT per generare lettere di rifiuto ai candidati" → Annex III cat. 4(a). "Valutiamo se concedere credito" → Annex III cat. 5(a).

3. **Identificazione del ruolo corretto**: molte PMI sono sia Provider che Deployer senza saperlo. Se un'azienda personalizza un modello GPAI e lo distribuisce a clienti → è Provider. Se usa Claude API per costruire un proprio chatbot B2C → è Provider del chatbot (Deployer rispetto ad Anthropic).

4. **Modifiche sostanziali**: se il form indica personalizzazione significativa (finetuning, riadestramento, cambiamento scopo previsto), il soggetto che ha eseguito la modifica è Provider del sistema risultante.

5. **Settori critici**: healthcare, finanza, HR, educazione, sicurezza pubblica → massima attenzione all'Annex III. Un sistema di analisi CV in ambito HR è quasi certamente Annex III cat. 4(a) indipendentemente dalla tecnologia.

6. **Soggetti vulnerabili**: qualsiasi sistema che interagisce con minori, anziani, persone con disabilità, persone in situazione di vulnerabilità socioeconomica → analisi approfondita Art. 5(b) e classificazione alto rischio.

7. **Decisioni con impatto significativo**: sistemi che influenzano assunzione/licenziamento, accesso a credito/assicurazione, accesso a servizi pubblici, valutazione studenti → quasi certamente Annex III.

8. **Conservatorismo**: in caso di dubbio tra "limited risk" e "high risk" → scegli "high risk". In caso di dubbio su quali articoli si applicano → includili tutti.

9. **Deadline corrette**: la maggior parte dei sistemi Annex III → 2 agosto 2026. Sistemi Annex I → 2 agosto 2027. Pratiche vietate → obbligatorio dal 2 febbraio 2025 (già in vigore). GPAI → obbligatorio dal 2 agosto 2025.

10. **Segnala le lacune documentali**: mancanza di inventario AI, assenza di DPO quando richiesto, mancanza di valutazione d'impatto, assenza di log dei sistemi → segnalarlo come gap prioritario con urgenza alta.
```

---

*Actify SDD Release 1 v1.1 — Appendice A aggiornata per Bedrock Converse API — Maggio 2026*
