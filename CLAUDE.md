# CLAUDE.md — Actify IAC — Riferimento operativo

> **Aggiorna questo file** alla fine di ogni sessione che:
> - Aggiunge/rimuove/rinomina route API o Lambda
> - Cambia schema DynamoDB (nuove tabelle, nuovi key pattern)
> - Aggiunge risorse Terraform (nuovi servizi AWS)
> - Aggiunge feature frontend con nuove pagine significative
> - Scopre un gotcha nuovo o risolve un bug sistemico

**Branch attivo: `develop`** — non mergiare su `main` senza rilascio esplicito.

---

## 1. Stack e struttura

```
actify-iac/
├── frontend/               Next.js 14 — output: 'export' (SPA statica, no SSR)
├── lambda-api/             Lambda Node 20.x — API REST + compliance engine
├── lambda-pdf/             Lambda Node 20.x — generazione PDF (Chromium headless)
├── lambda-doc-pipeline/    Lambda Node 20.x — 5 step functions per doc generation
├── terraform/
│   ├── release-1/          API Gateway HTTP v2, Lambda PDF, S3 KB (infra base)
│   └── release-2/          Cognito, DynamoDB (10 table), Lambda API, Step Functions
├── ingestion/              Python — indicizzazione knowledge base AI Act su S3 Vectors
├── SDD/                    Design docs (non è codice, non modificare)
└── deploy.sh               Deploy rapido lambda-pdf via S3
```

### Layer tecnologico

| Layer | Tecnologia | Note |
|-------|-----------|------|
| Frontend | Next.js 14, React 18, TypeScript 5, AWS Amplify Auth v6 | Static export → S3 + CloudFront |
| API | AWS Lambda Node 20.x, TypeScript, Zod v3, AWS SDK v3 | 512 MB, timeout 120s |
| PDF | Lambda Node 20.x, Puppeteer + @sparticuz/chromium 123 | ZIP > 50 MB — deploy via S3 |
| AI | Amazon Bedrock `eu.amazon.nova-pro-v1:0`, region eu-central-1 | RAG su S3 Vectors |
| Storage | DynamoDB (10 table, pay-per-request), S3 (docs + KB) | |
| Auth | Cognito User Pool `eu-central-1_4D3kDUrMF` | JWT authorizer su API Gateway |
| IaC | Terraform 1.6+, HCL | release-2 gestisce tutto il SaaS |

### ID AWS critici (eu-central-1 salvo diversa indicazione)

```
API Gateway:          lql1qfmdua
JWT Authorizer:       w03hoi
Lambda integration:   mbo1rpq
CloudFront distrib:   E2LIJKND7AI4TL  (us-east-1)
Lambda API:           actify-saas-api
Lambda PDF:           actify-saas-pdf-generator
S3 frontend:          actify-saas-frontend
S3 documenti:         actify-saas-documents
S3 knowledge base:    actify-saas-ai-act-knowledge-base  (release-1)
Cognito User Pool:    eu-central-1_4D3kDUrMF
Cognito Client:       2v3ggh33m5b4ap7kj96ufcqhmg
```

---

## 2. Comandi essenziali

### Frontend

```bash
cd frontend
npm run dev         # dev server http://localhost:3000
npm run build       # output in out/ (static SSG)
npm run lint        # ESLint
```

### Lambda API — build e deploy

```bash
cd lambda-api
npm run build       # tsc + bundle → dist/function.zip (~16 MB)

# Deploy su AWS
aws lambda update-function-code \
  --function-name actify-saas-api \
  --zip-file fileb://dist/function.zip \
  --region eu-central-1 \
  --query 'LastUpdateStatus' --output text

# Aspetta che il deploy finisca (obbligatorio prima di testare)
aws lambda wait function-updated --function-name actify-saas-api --region eu-central-1

# Log in tempo reale
aws logs tail /aws/lambda/actify-saas-api --follow --region eu-central-1
```

### Lambda PDF — build e deploy (ZIP troppo grande per upload diretto)

```bash
cd lambda-pdf
npm run build       # → dist/function.zip (~80 MB, usa S3)

aws s3 cp dist/function.zip s3://actify-saas-reports-temp/deployments/function.zip
aws lambda update-function-code \
  --function-name actify-saas-pdf-generator \
  --s3-bucket actify-saas-reports-temp \
  --s3-key deployments/function.zip \
  --region eu-central-1
aws lambda wait function-updated --function-name actify-saas-pdf-generator --region eu-central-1
```

### Frontend — sync e invalidazione CloudFront

```bash
cd frontend && npm run build

aws s3 sync out/ s3://actify-saas-frontend --delete --exclude "media/*" --region eu-central-1

aws cloudfront create-invalidation \
  --distribution-id E2LIJKND7AI4TL \
  --paths "/*" \
  --region us-east-1
```

### Test Lambda localmente (invoke diretto)

```bash
# Invoke lambda-api con payload JSON
aws lambda invoke \
  --function-name actify-saas-api \
  --region eu-central-1 \
  --payload '{"rawPath":"/api/company","requestContext":{"http":{"method":"GET"},"authorizer":{"jwt":{"claims":{"custom:company_id":"TEST","sub":"uid","email":"test@test.com","custom:role":"admin"}}}}}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/out.json && cat /tmp/out.json
```

### CORS — aggiornare se si aggiunge un nuovo metodo HTTP

```bash
aws apigatewayv2 update-api \
  --api-id lql1qfmdua \
  --region eu-central-1 \
  --cors-configuration 'AllowOrigins=["*"],AllowMethods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],AllowHeaders=["authorization","content-type"],MaxAge=3600'
```

### Terraform

```bash
cd terraform/release-2
terraform init
terraform plan
terraform apply

# Solo per vedere output esistenti
terraform output
```

### TypeScript check (prima di ogni deploy)

```bash
cd lambda-api && npx tsc --noEmit
cd lambda-pdf && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

---

## 3. Architettura DynamoDB

### Tabelle (tutte pay-per-request, PITR abilitato, SSE abilitato)

| Env var | Table name AWS | PK | SK | GSI |
|---------|---------------|----|----|-----|
| `DYNAMODB_COMPANIES_TABLE` | `actify-saas-companies` | `company_id` | — | — |
| `DYNAMODB_USERS_TABLE` | `actify-saas-users` | `company_id` | `user_id` | `user-lookup` (PK: `user_id`) |
| `DYNAMODB_SYSTEMS_TABLE` | `actify-saas-systems` | `company_id` | `system_id` | — |
| `DYNAMODB_CHECKS_TABLE` | `actify-saas-checks` | `pk` | `check_id` | — |
| `DYNAMODB_DOCUMENTS_TABLE` | `actify-saas-documents` | `document_id` | — | `company-index` (PK: `company_id`, SK: `generated_at`), `system-index` (PK: `system_id`, SK: `generated_at`) |
| `DYNAMODB_LITERACY_TABLE` | `actify-saas-literacy` | `company_id` | `record_id` | — |
| `DYNAMODB_PARTNERS_TABLE` | `actify-saas-partners` | `partner_id` | — | — |
| `DYNAMODB_PARTNER_PMI_TABLE` | `actify-saas-partner-pmi` | `partner_id` | `pmi_id` | `token-index` (PK: `form_token`) |
| `DYNAMODB_AUDIT_TABLE` | `actify-saas-audit` | `company_id` | `event_id` | — |
| `DYNAMODB_DOC_GENERATIONS_TABLE` | `actify-saas-doc-generations` | `pk` | `sk` | `system-gen-index` (PK: `system_id`) |

### Key pattern — tabella Literacy (la più complessa)

Tutti i record condividono PK = `company_id`. Il `record_id` (SK) distingue il tipo:

```
PROFILE#<systemId>#<profileType>    → profilo literacy di un sistema
    Campi: profile_id (uuid), headcount, merged_with (null | profileType), updated_at

EVIDENCE#<profileId>#<evidenceId>   → singola evidenza (cert o training)
    Campi: evidence_type, title, date, people_count, issuer?, url?, topics?, responsible?, notes?

SUGGEST#<systemId>#<profileType>    → cache suggerimenti AI (Bedrock)
    Campi: suggestions (array), cached_at, expires_at
```

Profile types per `system_role`:
- `deployer` → `operational_users`, `supervisors`
- `provider` → `dev_team`, `qa_team`, `commercial_team`

**PMI piccola**: il profilo secondario ha `merged_with: 'primaryProfileType'`. Il primario ha `merged_with: null`. Il backend `literacyStatus()` esclude i profili `merged_with != null` dal calcolo dello status. Il frontend mostra `UnifiedProfileCard` quando `profiles.find(p => !!p.merged_with)` è truthy.

**Record v1 deprecati** (possono esistere nella tabella, vengono ignorati dal codice v2):
- `DEPT#<uuid>` — reparti (v1, non più scritti)
- `CERT#<deptId>#<certId>` — certificazioni per reparto (v1, non più scritti)

### Key pattern — tabella Compliance Checks

```
pk  = "<companyId>#<systemId>"    (stringa concatenata)
check_id = ISO timestamp (sort key → ScanIndexForward: false, Limit: 1 per il latest)
```

### Key pattern — tabella Doc Generations

```
pk = "COMPANY#<companyId>"
sk = "GEN#<generationId>"
GSI system-gen-index: PK = system_id
```

### Key pattern — tabella Audit

```
company_id = PK
event_id   = "<ISO_timestamp>#<uuid>"   (ordine cronologico naturale desc con ScanIndexForward: false)
```

### Regola critica su UpdateCommand

`dynamoService.ts` espone la funzione `defined()` che filtra i valori `undefined` prima di costruire l'`UpdateExpression`. **Usarla sempre** su oggetti che possono contenere `undefined` — DocumentClient rimuove `undefined` dagli Item di PutCommand ma NON dagli ExpressionAttributeValues di UpdateCommand (errore runtime: "attribute value :vN is not defined").

```typescript
// ✅ corretto
await updateCompany(id, defined({ field: value }));

// ❌ sbagliato — se value è undefined, UpdateCommand crasha
await client.send(new UpdateCommand({ ..., ExpressionAttributeValues: { ':v': undefined } }));
```

**Nota**: `updateDocument()` in dynamoService non usa `defined()` — bug noto, stare attenti.

### DynamoDB `Limit` + `FilterExpression`

`Limit` si applica **prima** del `FilterExpression`. Se usi entrambi e vuoi "tutti i risultati che matchano il filtro", non mettere `Limit`. Vedi `getPartnerPMIByEmail()` per il pattern corretto con commento esplicativo.

---

## 4. Convenzioni di codice

### Struttura route Lambda API

Ogni route vive in `lambda-api/routes/<dominio>.ts` ed esporta funzioni nominate:

```typescript
// Signature standard
export async function doSomething(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<{ statusCode: number; body: string }> {
  const auth = extractAuth(event);          // throws 401 se mancano i claim
  requireAdmin(auth);                        // throws 403 se non admin
  const body = parseBody(event, MySchema);  // Zod validation, throws 400 se invalido

  // ... logica ...

  await logEvent(auth.companyId, 'event_type', { details }, auth.email);
  return { statusCode: 200, body: JSON.stringify({ result }) };
}
```

### Come si aggiunge un endpoint

1. Scrivere la funzione nel file route appropriato (o creare `routes/nuovoDominio.ts`)
2. Importare in `lambda-api/handler.ts` e aggiungere il blocco di routing:
   ```typescript
   if (method === 'POST' && path.startsWith('/api/nuovopath')) {
     return nuovoDominio.doSomething(event);
   }
   ```
3. Se il path prefix è nuovo, registrare la route su API Gateway:
   ```bash
   aws apigatewayv2 create-route \
     --api-id lql1qfmdua \
     --region eu-central-1 \
     --route-key "POST /api/nuovopath/{proxy+}" \
     --authorization-type JWT \
     --authorizer-id w03hoi \
     --target "integrations/mbo1rpq"
   ```
   > Le route `{proxy+}` fanno già match con tutto sotto quel prefisso se usi `startsWith` nel handler. Aggiungere route specifiche solo se il path è già coperto da una `{proxy+}` che cattura correttamente.

4. Aggiungere la funzione in `frontend/lib/api.ts`
5. Aggiornare `frontend/lib/types.ts` se servono tipi nuovi
6. `npm run build` su lambda-api e frontend, deploy entrambi

### Auth Cognito JWT — claims disponibili

```typescript
const auth = extractAuth(event);
// auth.companyId  ← claims['custom:company_id']
// auth.userId     ← claims['sub']
// auth.email      ← claims['email']
// auth.role       ← 'admin' | 'member' | 'partner'  (da claims['custom:role'])
```

I Cognito custom attributes hanno prefisso `custom:` nell'access/id token. Il Cognito User Pool ha `company_id` limitato a 36 caratteri (UUID v4 = sempre 36 chars, OK).

### Naming convention

- File route: `camelCase.ts` (es. `complianceCheck.ts`, `partnerInventory.ts`)
- Funzioni handler: verbo + sostantivo (es. `listSystems`, `createSystem`, `updateProfile`)
- DynamoDB table env vars: `DYNAMODB_<TABLE>_TABLE` (uppercase snake_case)
- Record ID prefix: `UPPER_CASE#` (es. `PROFILE#`, `EVIDENCE#`, `COMPANY#`, `GEN#`)
- Tutti i timestamp: ISO 8601 UTC (`new Date().toISOString()`)
- UUID: sempre `v4` da `uuid` package

### Schema Zod — dove usarli

Ogni endpoint che riceve un body usa `parseBody(event, ZodSchema)` (dal middleware). Mai fare parsing manuale del body. Gli schema sono co-locati con le route, non centralizzati.

### Frontend — Next.js static export

- `output: 'export'` in `next.config.mjs` → nessun server-side rendering
- Route dinamiche (es. `[systemId]`) devono avere `generateStaticParams()` che restituisce almeno `[{ systemId: '_' }]` per il placeholder — altrimenti la build fallisce
- Pagine reali con parametri dinamici vanno su route `?id=xxx` con `useSearchParams()`, non su `[param]/page.tsx`
- `'use client'` non può stare nello stesso file di `generateStaticParams()`

### Gestione errori frontend

Il pattern base nelle API call è `catch { /* silent */ }` per non crashare l'UI. In sessioni future: se qualcosa "non succede nulla" lato frontend, il problema è quasi sempre nel CORS o in un errore inghiottito dal catch vuoto. **Controllare sempre la network tab del browser prima di debug lato backend.**

---

## 5. Feature esistenti e stato

### AI Inventory
- **Stato**: production, stabile
- **Cosa fa**: censimento sistemi AI, compliance check async (Bedrock + RAG), gap analysis, score rischio, exposure sanzioni
- **File principali**: `lambda-api/routes/systems.ts`, `lambda-api/routes/complianceCheck.ts`, `lambda-api/services/complianceEngine.ts`, `lambda-api/services/ragService.ts`, `lambda-api/services/articleRuleEngine.ts`, `lambda-api/services/sanctions.ts`
- **Frontend**: `frontend/app/dashboard/inventory/page.tsx`, `frontend/app/dashboard/system/[systemId]/page.tsx`
- **Note**: il compliance check è async — viene avviato, poi il frontend polling su `/compliance-checks/latest`. La funzione si auto-invoca (`_asyncComplianceCheck`) per non restare sotto il timeout API Gateway (30s).

### AI Literacy Tracker (Art. 4)
- **Stato**: production, versione v2 (redesign completo giugno 2026)
- **Cosa fa**: traccia formazione AI per sistema censito, profili per ruolo (deployer/provider), evidenze (certificazioni + training), modalità PMI piccola (profilo unificato), report Art. 4 → Document Vault
- **File principali**: `lambda-api/routes/literacy.ts`, `lambda-api/services/literacySuggestService.ts`, `lambda-pdf/services/literacyReportHtml.ts`
- **Frontend**: `frontend/app/dashboard/literacy/page.tsx` (lista sistemi), `frontend/app/dashboard/literacy/detail/page.tsx` (detail con UnifiedProfileCard), `frontend/app/dashboard/literacy/[systemId]/page.tsx` (solo placeholder statico)
- **Note**: Il report Art. 4 ora viene salvato in S3 + Document Vault (tabella `documents`) invece di essere scaricato direttamente. PMI unified card: quando `profiles.find(p => !!p.merged_with)` → `UnifiedProfileCard`, altrimenti due `ProfileCard` separate.

### Document Vault
- **Stato**: production, due pipeline coesistenti
- **Pipeline 1 — Remediation Engine** (legacy): `POST /api/systems/{id}/remediation/generate` → Lambda API chiama se stessa (`_asyncDocumentGeneration`) → genera HTML via Bedrock → PDF via lambda-pdf → S3
- **Pipeline 2 — Step Functions** (corrente): `POST /api/systems/{id}/documents` → avvia Step Functions → 5 Lambda steps (assembleContext → generateSlots × N → validate → assemble → renderPdf → persistAudit)
- **File principali**: `lambda-api/routes/docVault.ts`, `lambda-api/routes/remediation.ts`, `lambda-doc-pipeline/src/handlers/`, `lambda-pdf/services/pdfService.ts`
- **Frontend**: `frontend/app/dashboard/documents/page.tsx`
- **Note**: Il report Art. 4 literacy usa la tabella `documents` ma bypassa entrambe le pipeline — viene generato direttamente da `generateArt4Report()` in `literacy.ts` e scritto su S3 + DynamoDB. S3 key pattern: `documents/<companyId>/<systemId>/<type>/<documentId>_v1.pdf`

### Fine Estimation Board
- **Stato**: production, stabile
- **Cosa fa**: mostra esposizione sanzionatoria aggregata (Art. 99-100 AI Act) calcolata da `sanctions.ts`
- **File principali**: `lambda-api/services/sanctions.ts`, `frontend/app/dashboard/fines/page.tsx`
- **Note**: il pannello sanzionatorio NON va nel dettaglio sistema AI Inventory — solo nella fines page. Regola esplicita per non confondere l'utente.

### Assessment pubblico (white-label)
- **Stato**: production, stabile
- **Cosa fa**: form per PMI partner (token-based, no auth), raccoglie sistemi AI e profilo aziendale, crea sistemi nella tabella `ai-systems` sotto `company_id = pmi_id`
- **File principali**: `lambda-api/routes/partner.ts` (getAssessmentForm, submitAssessmentForm), `lambda-pdf/services/formHtml.ts`
- **Note**: `pmi_id` è usato come `company_id` virtuale — non esiste un utente Cognito per i client PMI partner. Lookup per token: GSI `token-index` su tabella `partner-pmi`.

### Partner Portal
- **Stato**: production, stabile
- **Cosa fa**: dashboard per studi consulenza, gestione clienti PMI, invio assessment, referral, analytics revenue
- **File principali**: `lambda-api/routes/partner.ts`, `lambda-api/routes/partnerInventory.ts`, `lambda-api/services/partnerEmailService.ts`
- **Frontend**: `frontend/app/partner/` (tutto il portal)
- **Note**: partner ha `role: 'partner'` nel JWT. `requirePartner(auth)` nei route handler. Email via Resend API (env: `RESEND_API_KEY`).

### Audit Trail
- **Stato**: production, stabile
- **Cosa fa**: log immutabile di tutti gli eventi aziendali, export PDF tramite Bedrock
- **File principali**: `lambda-api/services/auditService.ts`, `lambda-api/routes/auditTrail.ts`
- **Note**: ogni operazione CRUD importante chiama `logEvent()`. I tipi di evento sono definiti come union type in `auditService.ts` — aggiungere qui i nuovi event type quando si aggiunge una feature.

---

## 6. Regole di sicurezza — cosa non toccare

### Mai modificare in produzione senza coordinamento

```
terraform/release-2/terraform.tfvars         # credenziali e ID prod
terraform/release-2/cognito.tf               # cambierebbe il pool → tutti gli utenti vengono invalidati
terraform/release-2/dynamodb.tf              # mai cambiare pk/sk di tabelle esistenti → destroy + recreate = perdita dati
```

### Variabili d'ambiente Lambda — non modificare senza deploy coordinato

- `COGNITO_USER_POOL_ID` e `COGNITO_CLIENT_ID` — cambiarli invalida tutti i token in circolazione
- `DYNAMODB_*_TABLE` — rinominare una tabella DynamoDB non migra i dati
- `BEDROCK_MODEL_ID` — il modello `eu.amazon.nova-pro-v1:0` ha inference profile EU, usare solo region eu-central-1

### Bucket S3 production — non fare delete o cambio policy

- `actify-saas-documents` — contiene documenti finali dei clienti
- `actify-saas-frontend` — serve il sito in produzione
- `actify-saas-ai-act-knowledge-base` — indice S3 Vectors per RAG, costoso da ricostruire

### Environment è già live

`terraform/release-2/` gestisce infrastruttura production su `eu-central-1`. Ogni `terraform apply` modifica risorse live. Fare sempre `terraform plan` e leggere attentamente il diff prima di applicare.

---

## 7. Gotcha e note importanti

### CORS su API Gateway HTTP API — il bug più insidioso

**Problema**: API Gateway richiede che `AllowMethods` includa **esplicitamente** ogni metodo HTTP. Il browser invia un preflight OPTIONS prima di PATCH/DELETE. Se PATCH non è in `AllowMethods`, il browser blocca silenziosamente la richiesta. Il `catch {}` vuoto nel frontend non mostra nessun errore → sembra che "non succeda nulla".

**Soluzione**: quando si aggiunge un nuovo metodo HTTP, eseguire sempre il comando CORS update (sezione 2). La configurazione attuale include tutti i metodi: GET, POST, PUT, PATCH, DELETE, OPTIONS.

### Next.js static export — route dinamiche

Ogni `app/dashboard/xxx/[param]/page.tsx` deve avere `generateStaticParams()`. Se manca → build failure. Usare il pattern:
```typescript
export function generateStaticParams() { return [{ param: '_' }]; }
export default function Placeholder() { return null; }
```
Le pagine reali con parametri dinamici usano `useSearchParams()` su route tipo `app/dashboard/xxx/detail/page.tsx?id=xxx`.

### Lambda auto-invoke per processi lunghi

Il compliance check e la document generation legacy si auto-invocano usando `InvokeCommand` con `InvocationType: 'Event'` (asincrono). Il Lambda principale risponde con 202, il secondo invocation fa il lavoro pesante. Questo bypassa il timeout di 30s di API Gateway. Il pattern è identificato dal payload `_asyncComplianceCheck` e `_asyncDocumentGeneration` nel handler.ts.

### Lambda PDF — cold start lento

Chromium headless impiega 8-15 secondi al cold start su Lambda. Non è un bug, è il comportamento normale di `@sparticuz/chromium`. Il ZIP pesa ~80 MB — l'upload diretto a Lambda fallisce (limite 50 MB), serve passare per S3.

### PMI partner — non sono utenti Cognito

I client PMI dei partner NON hanno account Cognito. Vengono creati come "virtual companies" con `company_id = pmi_id` nella tabella companies. L'accesso ai loro dati è mediato dal partner (via route `/api/partner/inventory/`). Se si prova a fare login come PMI → non funziona by design.

### S3 Vectors — non è S3 standard

Il servizio RAG usa `S3VectorsClient` (implementazione custom in `lambda-api/services/ragService.ts`), non il normale `S3Client` di AWS SDK. È un servizio sperimentale. Non confonderlo con operazioni S3 normali.

### Bedrock — solo eu-central-1

Il modello `eu.amazon.nova-pro-v1:0` usa inference profiles EU. Se si chiama Bedrock da una region diversa → errore. `BEDROCK_REGION=eu-central-1` va tenuto fisso.

### DynamoDB — `defined()` in UpdateCommand

Il cliente DynamoDB rimuove `undefined` dagli Item in PutCommand ma **non** dagli ExpressionAttributeValues in UpdateCommand. Questo causa errori runtime "attribute value :vN is not defined". La funzione `defined()` in `dynamoService.ts` risolve questo. Usarla sempre prima di costruire UpdateExpression.

**Bug noto**: `updateDocument()` non usa `defined()` — non passare mai `undefined` a quella funzione.

### Limit + FilterExpression in DynamoDB

`Limit` su QueryCommand si applica PRIMA del FilterExpression. Non usarli insieme se vuoi tutti i risultati che matchano il filtro. Pattern corretto: QueryCommand con solo KeyConditionExpression, poi filtra in JavaScript, oppure usa un GSI dedicato.

### Audit Trail — sempre loggare

Ogni nuova operazione che modifica dati deve chiamare `logEvent()`. I tipi di evento sono una union type in `auditService.ts` — aggiungere il nuovo tipo lì prima di usarlo. Non inventare stringhe arbitrary.

### Literacy v1 vs v2

La tabella `actify-saas-literacy` può contenere record v1 (`DEPT#`, `CERT#` prefissi) scritti prima del redesign giugno 2026. Il codice v2 li ignora filtrando su `startsWith('PROFILE#')`. Non eliminare questi record — potrebbero essere rilevanti per audit storici.

### updateCompany con `defined()`

Tutte le funzioni `update*` in `dynamoService.ts` usano la funzione interna `defined()` per filtrare undefined, **eccetto `updateDocument`**. Comportamento inconsistente — stare attenti.

### Partner PMI Limit/FilterExpression

`getPartnerPMIByEmail()` non usa `Limit` intenzionalmente (commento nel codice). DynamoDB applica `Limit` prima del `FilterExpression` → se il primo item della partizione non matcha l'email, `Limit: 1` restituisce 0 risultati anche se l'item esiste. Non aggiungere `Limit` a query che usano `FilterExpression` su dati non-key.

---

## 8. Variable d'ambiente — schema completo

### Lambda API

```bash
# Auth
COGNITO_USER_POOL_ID=eu-central-1_4D3kDUrMF
COGNITO_CLIENT_ID=2v3ggh33m5b4ap7kj96ufcqhmg

# DynamoDB
DYNAMODB_COMPANIES_TABLE=actify-saas-companies
DYNAMODB_USERS_TABLE=actify-saas-company-users
DYNAMODB_SYSTEMS_TABLE=actify-saas-systems
DYNAMODB_CHECKS_TABLE=actify-saas-compliance-checks
DYNAMODB_DOCUMENTS_TABLE=actify-saas-documents
DYNAMODB_LITERACY_TABLE=actify-saas-literacy
DYNAMODB_PARTNERS_TABLE=actify-saas-partners
DYNAMODB_PARTNER_PMI_TABLE=actify-saas-partner-pmi
DYNAMODB_AUDIT_TABLE=actify-saas-audit
DYNAMODB_DOC_GENERATIONS_TABLE=actify-saas-doc-generations

# Storage
DOCUMENTS_BUCKET=actify-saas-documents

# AI
BEDROCK_MODEL_ID=eu.amazon.nova-pro-v1:0
BEDROCK_REGION=eu-central-1
S3_VECTORS_BUCKET=actify-saas-ai-act-knowledge-base
S3_VECTORS_INDEX=ai-act-it
LAMBDA_PDF_ARN=arn:aws:lambda:eu-central-1:<ACCOUNT>:function:actify-saas-pdf-generator

# Orchestrazione
STEP_FUNCTIONS_ARN=arn:aws:states:eu-central-1:<ACCOUNT>:stateMachine:actify-saas-doc-generation-workflow

# Email
RESEND_API_KEY=re_...
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_4D3kDUrMF
NEXT_PUBLIC_COGNITO_CLIENT_ID=2v3ggh33m5b4ap7kj96ufcqhmg
NEXT_PUBLIC_API_URL=https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com
```

---

## 9. Flusso di deploy completo (checklist)

```bash
# 1. TypeScript check
cd lambda-api && npx tsc --noEmit && cd ..
cd lambda-pdf && npx tsc --noEmit && cd ..
cd frontend && npx tsc --noEmit && cd ..

# 2. Build + deploy lambda-api
cd lambda-api && npm run build
aws lambda update-function-code --function-name actify-saas-api --zip-file fileb://dist/function.zip --region eu-central-1
aws lambda wait function-updated --function-name actify-saas-api --region eu-central-1
cd ..

# 3. Build + deploy frontend
cd frontend && npm run build
aws s3 sync out/ s3://actify-saas-frontend --delete --exclude "media/*" --region eu-central-1
aws cloudfront create-invalidation --distribution-id E2LIJKND7AI4TL --paths "/*" --region us-east-1
cd ..

# 4. (se serve) lambda-pdf
cd lambda-pdf && npm run build
aws s3 cp dist/function.zip s3://actify-saas-reports-temp/deployments/function.zip
aws lambda update-function-code --function-name actify-saas-pdf-generator --s3-bucket actify-saas-reports-temp --s3-key deployments/function.zip --region eu-central-1
aws lambda wait function-updated --function-name actify-saas-pdf-generator --region eu-central-1
```
