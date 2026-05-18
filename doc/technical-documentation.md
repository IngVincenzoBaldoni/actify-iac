# Actify SaaS — Release 2: Technical Documentation

**Prodotto:** Actify — EU AI Act Compliance Platform  
**Release:** 2 (SaaS Multi-Tenant)  
**Regione AWS:** eu-central-1 (Frankfurt)  
**IaC:** Terraform  
**Data:** 2026

---

## Panoramica

Actify è una piattaforma B2B SaaS che permette alle aziende di censire i propri sistemi AI, valutare la conformità al **Regolamento UE 2024/1689 (AI Act)** e stimare l'esposizione sanzionatoria ai sensi dell'Art. 99. L'architettura è completamente serverless, multi-tenant, con autenticazione Cognito e persistenza DynamoDB.

**Frontend:** `https://dxmu107adlwoo.cloudfront.net`  
**API endpoint:** `https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com`

---

## Diagramma di architettura

![Architettura Actify Release 2](./architecture.svg)

---

## Flusso end-to-end

| Step | Evento | Attore |
|------|--------|--------|
| ① | `GET /` — il browser carica il frontend statico da CloudFront/S3 | Browser → CloudFront → S3 |
| ② | L'utente inserisce email/password → Cognito restituisce JWT access token (1h) + refresh (30gg) | Browser → Cognito |
| ③ | Il frontend invia richieste REST con `Authorization: Bearer <JWT>` | Browser → API Gateway |
| ④ | API Gateway valida il JWT tramite l'authorizer Cognito (no Lambda) → forwarda a Lambda | API Gateway → Lambda |
| ⑤ | Lambda legge/scrive i dati dell'azienda, sistemi AI e utenti su DynamoDB | Lambda → DynamoDB |
| ⑥ | `POST /api/systems/{id}/compliance-check` → Lambda salva record `running`, si auto-invoca async | Lambda → Lambda (Event) |
| ⑦ | Lambda restituisce `202 Accepted` immediatamente senza aspettare l'analisi | Lambda → Browser |
| ⑧ | Lambda (async) legge sistema + company da DynamoDB → chiama Bedrock → calcola sanzioni → scrive result | Lambda → Bedrock → DynamoDB |
| ⑨ | Frontend fa polling `GET .../compliance-checks/latest` ogni ~5s fino a `status=completed\|failed` | Browser → API Gateway → Lambda |
| ⑩ | Lambda e API Gateway scrivono log strutturati JSON su CloudWatch | Lambda, API GW → CloudWatch |

---

## Servizi AWS

### 1. CloudFront + S3 — Frontend statico

Il frontend Next.js è servito come sito statico (static export) tramite CloudFront CDN, con S3 come origin privato.

| Proprietà | Valore |
|-----------|--------|
| CloudFront Distribution ID | `E2LIJKND7AI4TL` |
| URL pubblico | `https://dxmu107adlwoo.cloudfront.net` |
| S3 Bucket | `actify-saas-frontend` |
| Price Class | `PriceClass_100` (US + Europe) |
| HTTPS | Redirect HTTP → HTTPS (CloudFront default cert) |
| SPA routing | Custom error response: 403/404 → `/index.html` (200) |
| Accesso S3 | Origin Access Control (OAC) — S3 completamente privato |
| Framework | Next.js 14 App Router, `output: 'export'`, Amplify v6 SDK |

**Variabili d'ambiente baked al build:**

| Variabile | Valore |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `eu-central-1_4D3kDUrMF` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `2v3ggh33m5b4ap7kj96ufcqhmg` |

#### Pagine pubbliche (pre-login)

Il frontend include una sezione pubblica accessibile senza autenticazione, dedicata alla compliance AI Act di Actify e alla presentazione del prodotto. Tutte queste pagine sono pre-renderizzate come HTML statico al build time.

| Percorso | Descrizione |
|----------|-------------|
| `/` | Landing page — header nav con link "Perché puoi fidarti", "Chi siamo", "FAQ"; sezione trust con badge + 5 stat; sezione team con avatar animati |
| `/compliance` | Hub compliance — badge "Actify Verified Compliant", griglia sistemi AI, tabella articoli AI Act, DB UE, documenti, CTA badge per clienti |
| `/compliance/dichiarazione` | Dichiarazione formale di conformità: sistemi AI, classificazione rischio, articoli applicabili, misure implementate, supervisione umana, DB UE |
| `/compliance/registro-ai` | Registro sistemi AI interni con schede dettagliate (Claude Code + Amazon Nova Pro) |
| `/compliance/trasparenza` | Informativa Art. 50 — quando/come viene usata l'AI, dati trasmessi, diritti utente |
| `/compliance/disclaimer` | Disclaimer legale — natura advisory del servizio, limitazioni responsabilità, obbligo supervisione umana |
| `/perche-fidarti` | Pagina trust estesa — badge, 5 statistiche, narrative, schede sistemi AI, tabella articoli completa, spiegazione DB UE, documenti |
| `/chi-siamo` | Team — profili CTO (5+ anni AWS/AI consulting) e CEO (10+ anni AI nelle PMI), sezione missione |
| `/faq` | FAQ accordion interattivo (`'use client'`) — Q01: chi controlla e quando; Q02: mito "tanto non vengono" |
| `/login` | Auth — footer compliance "Actify è conforme al Reg. UE 2024/1689 · Informativa AI" |

**`lib/branding.ts` — asset SVG brand:**

| Funzione | Output |
|----------|--------|
| `markSvg(size)` | Logomark rotondo con gradiente verde — usato nei nav delle pagine doc |
| `logoCombined(size)` | Logo completo testo + mark |
| `badgeSvg(size)` | Badge "Actify Verified Compliant" — scudo SVG con gradiente verde scuro, checkmark, testo AI Act Reg. UE 2024/1689; usato in compliance hub e landing |

---

### 2. GitHub Actions CI/CD

Il deploy del frontend è automatizzato tramite GitHub Actions con autenticazione OIDC (nessuna credential long-lived in GitHub Secrets).

**File:** `.github/workflows/deploy-frontend.yml`

| Step | Comando | Note |
|------|---------|------|
| Checkout | `actions/checkout@v4` | |
| Node.js 20 | `actions/setup-node@v4` | cache: npm |
| Install | `npm ci` | da `frontend/` |
| Build | `npm run build` | bake `NEXT_PUBLIC_*` |
| AWS Auth | `aws-actions/configure-aws-credentials@v4` | OIDC, nessuna chiave |
| S3 Sync | `aws s3 sync frontend/out/ s3://$BUCKET --delete` | |
| CF Invalidation | `aws cloudfront create-invalidation --paths "/*"` | |

**GitHub Secrets/Variables richiesti:**

| Nome | Tipo | Valore |
|------|------|--------|
| `AWS_DEPLOY_ROLE_ARN` | Secret | `arn:aws:iam::265020547280:role/actify-saas-github-actions-deploy` |
| `AWS_S3_BUCKET` | Secret | `actify-saas-frontend` |
| `CLOUDFRONT_DISTRIBUTION_ID` | Secret | `E2LIJKND7AI4TL` |
| `NEXT_PUBLIC_API_URL` | Variable | `https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Variable | `eu-central-1_4D3kDUrMF` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Variable | `2v3ggh33m5b4ap7kj96ufcqhmg` |

---

### 3. Amazon Cognito

| Proprietà | Valore |
|-----------|--------|
| User Pool ID | `eu-central-1_4D3kDUrMF` |
| App Client ID | `2v3ggh33m5b4ap7kj96ufcqhmg` |
| Hosted UI | Disabilitata — solo app-client |
| Auth flow | `USER_PASSWORD_AUTH` |
| Access token TTL | 1 ora |
| Refresh token TTL | 30 giorni |
| Custom attributes | `custom:companyId`, `custom:role` |
| JWT authorizer | Integrato in API Gateway — validazione senza Lambda |

**Custom attributes sul JWT:**
- `custom:companyId` — usato da Lambda come PK DynamoDB per l'isolamento multi-tenant
- `custom:role` — `admin` o `member`, controlla le operazioni privilegiate (invite, delete)

**Cognito Admin SDK (Lambda):** usato in `cognitoService.ts` per `AdminCreateUser`, `AdminSetUserPassword`, `AdminGetUser` durante registrazione e invite.

---

### 4. Amazon API Gateway HTTP API v2

| Proprietà | Valore |
|-----------|--------|
| Nome | `actify-saas-api` |
| Tipo | HTTP API (v2) — non REST API |
| Stage | `$default` (auto-deploy) |
| Authorizer | JWT — issuer Cognito User Pool |
| Integrazione | `AWS_PROXY` payload format `2.0` |
| CORS | `allow_origins: *`, metodi `GET POST PUT DELETE OPTIONS` |
| Throttling | burst 10 req, steady 2 req/s |
| Log group | `/aws/apigateway/actify-saas-api` |

**Route complete:**

| Metodo | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/auth/register` | No | `register()` |
| POST | `/api/auth/invite` | JWT | `invite()` |
| GET | `/api/company` | JWT | `getCompany()` |
| PUT | `/api/company` | JWT | `updateCompany()` |
| PUT | `/api/company/setup` | JWT | `setupWizard()` |
| GET | `/api/company/users` | JWT | `getUsers()` |
| DELETE | `/api/company/users/{userId}` | JWT | `deleteUser()` |
| GET | `/api/systems` | JWT | `listSystems()` |
| POST | `/api/systems` | JWT | `createSystem()` |
| GET | `/api/systems/{systemId}` | JWT | `getSystem()` |
| PUT | `/api/systems/{systemId}` | JWT | `updateSystem()` |
| DELETE | `/api/systems/{systemId}` | JWT | `deleteSystem()` |
| POST | `/api/systems/{systemId}/compliance-check` | JWT | `triggerCheck()` → 202 |
| GET | `/api/systems/{systemId}/compliance-checks/latest` | JWT | `getLatestCheck()` |
| GET | `/api/systems/{systemId}/compliance-checks` | JWT | `listChecks()` |

---

### 5. AWS Lambda — actify-saas-api

| Proprietà | Valore |
|-----------|--------|
| Nome | `actify-saas-api` |
| Runtime | Node.js 20.x |
| Handler | `dist/handler.handler` |
| Memory | 1024 MB |
| Timeout | **120 s** (necessario per l'async compliance check con Bedrock) |
| Deployment | Zip via S3 staging |

**Variabili d'ambiente:**

| Variabile | Scopo |
|-----------|-------|
| `LAMBDA_SELF_ARN` | ARN della stessa Lambda per self-invoke async |
| `BEDROCK_MODEL_ID` | `eu.amazon.nova-pro-v1:0` |
| `BEDROCK_REGION` | `eu-central-1` |
| `COGNITO_USER_POOL_ID` | `eu-central-1_4D3kDUrMF` |
| `COGNITO_CLIENT_ID` | `2v3ggh33m5b4ap7kj96ufcqhmg` |
| `DYNAMODB_TABLE_COMPANIES` | `actify-saas-companies` |
| `DYNAMODB_TABLE_USERS` | `actify-saas-users` |
| `DYNAMODB_TABLE_SYSTEMS` | `actify-saas-systems` |
| `DYNAMODB_TABLE_CHECKS` | `actify-saas-checks` |
| `AWS_REGION` | `eu-central-1` |

**Struttura interna (TypeScript):**

```
lambda-api/
├── handler.ts                    # Dispatcher: routing + _asyncComplianceCheck branching
├── middleware/
│   └── auth.ts                   # extractAuth() → { companyId, userId, role } dai JWT claims
├── routes/
│   ├── auth.ts                   # register + invite
│   ├── company.ts                # CRUD company + wizard + users
│   ├── systems.ts                # CRUD AI systems
│   └── complianceCheck.ts        # triggerCheck (202) + executeCheckAsync + getLatest + list
├── services/
│   ├── cognitoService.ts         # Admin SDK: AdminCreateUser, AdminSetPassword, AdminGetUser
│   ├── dynamoService.ts          # CRUD su 4 tabelle DynamoDB — removeUndefinedValues:true (fix silent failure)
│   ├── complianceEngine.ts       # Bedrock Converse API → ComplianceResultParsed
│   ├── complianceOutputSchema.ts # Zod schema + template JSON per Bedrock
│   ├── sanctions.ts              # Art. 99 tiers, normalizeArticle, computeSanctions
│   └── systemPrompt.ts           # ~10K token AI Act knowledge base
└── types/
    ├── aiSystem.ts               # AISystem, AISystemInput, ComplianceStatus
    └── company.ts                # Company, CompanyUser
```

**Pattern di auto-invocazione async:**

Il compliance check usa un pattern fire-and-forget per restituire subito `202 Accepted` senza tenere occupata la connessione HTTP per i ~30s necessari all'analisi Bedrock.

```typescript
// handler.ts — branching in base al tipo di evento
if ('_asyncComplianceCheck' in event && event._asyncComplianceCheck) {
  await executeCheckAsync(event as ...);
  return;  // nessuna risposta HTTP
}
```

```typescript
// routes/complianceCheck.ts — triggerCheck()
await lambdaClient.send(new InvokeCommand({
  FunctionName:   process.env.LAMBDA_SELF_ARN!,
  InvocationType: 'Event',       // fire & forget, non aspetta completamento
  Payload: Buffer.from(JSON.stringify({
    _asyncComplianceCheck: true,
    companyId, systemId, checkId, pk,
  })),
}));
return { statusCode: 202, body: JSON.stringify({ check_id, status: 'running' }) };
```

Il client fa poi polling su `GET .../compliance-checks/latest` ogni ~5s fino a `status=completed|failed`.

---

### 6. Amazon Bedrock

| Proprietà | Valore |
|-----------|--------|
| Modello | Amazon Nova Pro |
| Model ID | `eu.amazon.nova-pro-v1:0` |
| Tipo | EU cross-region inference profile |
| Regioni di routing | eu-central-1, eu-west-1, eu-west-3, eu-north-1 |
| API | Converse API |
| Max tokens | 5120 |
| Temperature | 0 (output deterministico) |
| Auth | IAM SigV4 (ruolo Lambda) |

**Flusso analisi conformità:**
1. `complianceEngine.ts` costruisce il messaggio con system prompt AI Act (~10K token) + dati del sistema AI
2. Bedrock risponde con un JSON strutturato (`ComplianceResultParsed`) validato con Zod
3. In caso di parse failure, retry con istruzioni più esplicite
4. `sanctions.ts` arricchisce il risultato con le stime sanzionatorie Art. 99

**Output `ComplianceResultParsed`:**
```typescript
{
  compliance_gaps: Array<{
    article: string;          // es. "Art. 13, comma 1"
    requirement: string;
    gap_description: string;
    recommendation: string;
    status: 'compliant' | 'gap_found' | 'not_applicable';
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  overall_risk_level: string;
  summary: string;
}
```

---

### 7. Amazon DynamoDB

Quattro tabelle On-Demand con SSE-AES256 e PITR (Point-In-Time Recovery, 35 giorni).

**Isolamento multi-tenant:** `company_id` estratto dal JWT Cognito (mai dal body della request) è usato come PK su tutte le tabelle. Lambda non può accedere a dati cross-tenant.

#### actify-saas-companies

| Campo | Tipo | Note |
|-------|------|------|
| `company_id` | PK (String) | UUID generato alla registrazione |
| `name` | String | |
| `sector` | String | |
| `employees_range` | String | es. `"11-50"` |
| `country` | String | |
| `governance` | Map | `has_dpo`, `has_ai_inventory`, `has_impact_assessment`, ecc. |
| `annual_revenue_range` | String | 10 range: `under_100k` … `over_1b` |
| `annual_revenue_exact` | Number | Opzionale — migliora precisione stime sanzioni |
| `subscription_tier` | String | `trial\|starter\|pro\|enterprise` |
| `setup_completed` | Boolean | |
| `created_at`, `updated_at` | String | ISO 8601 |

#### actify-saas-users

| Campo | Tipo | Note |
|-------|------|------|
| `company_id` | PK (String) | |
| `user_id` | SK (String) | `cognito_sub` |
| `email` | String | |
| `role` | String | `admin\|member` |
| `status` | String | `pending\|active` |
| `cognito_sub` | String | |
| `invited_by` | String | user_id dell'invitante |
| `joined_at` | String | null se pending |
| `created_at` | String | |

GSI: `email-index` (PK=email) — lookup cross-company per evitare duplicati.

#### actify-saas-systems

| Campo | Tipo | Note |
|-------|------|------|
| `company_id` | PK (String) | |
| `system_id` | SK (String) | UUID |
| `tool_name` | String | |
| `vendor` | String | |
| `category` | String | `hr\|finance\|llm\|marketing\|operations\|legal\|tech\|healthcare\|altro` |
| `role` | String | `provider\|deployer` |
| `purpose` | String | |
| `target_users` | StringSet | `internal_employees\|clients_users\|third_parties` |
| `makes_automated_decisions` | Boolean | |
| `human_oversight_level` | String | `always\|sometimes\|never\|na` |
| `decision_domains` | StringSet | |
| `affects_vulnerable_groups` | Boolean | |
| `data_types` | StringSet | |
| `compliance_status` | String | `unchecked\|checking\|gap_found\|compliant` |
| `last_check_id` | String | null se mai verificato |
| `last_check_at` | String | ISO 8601 |
| `last_exposure_min`, `last_exposure_max` | Number | EUR — cache sanzione dal check |
| `last_article_sanctions` | String | JSON: `Record<normalizedArticle, {min,max}>` — per dedup cross-system |
| `created_at`, `updated_at` | String | |

#### actify-saas-checks

| Campo | Tipo | Note |
|-------|------|------|
| `pk` | PK (String) | `company_id#system_id` |
| `check_id` | SK (String) | `YYYYMMDDHHmmss-{uuid}` |
| `company_id` | String | |
| `system_id` | String | |
| `triggered_by` | String | user_id |
| `status` | String | `running\|completed\|failed` |
| `result` | Map | `ComplianceResultWithSanctions` |
| `error` | String | solo se status=failed |
| `created_at` | String | |
| `completed_at` | String | |

GSI: `check_id-index` (PK=check_id) — lookup diretto per check_id.

> **Bug fix:** `ComplianceResultWithSanctions` contiene `tier_info?: GapTierInfo` (opzionale — `undefined` per i gap compliant). Il DynamoDB Document Client v3 rifiuta i campi `undefined` per default. Fix applicato in `dynamoService.ts`: `DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })`. Senza questa opzione il check completava correttamente ma il `PutItem` falliva silenziosamente, lasciando il record in stato `running` indefinitamente.

---

### 8. Motore di Conformità e Sanzioni

#### complianceEngine.ts

Chiama Bedrock Converse API con il system prompt AI Act e i dati del sistema AI. Valida la risposta con Zod (`ComplianceResultParsed`). In caso di parsing fallito, effettua un retry con istruzioni esplicite.

#### sanctions.ts

Calcola le stime sanzionatorie Art. 99 AI Act per ogni gap di conformità.

**Tiers Art. 99:**

| Articoli | Massimo | % fatturato |
|---------|---------|-------------|
| Art. 5 (pratiche vietate) | €35.000.000 | 7% |
| Art. 8-15, 16-27, 49, 50 (requisiti/obblighi) | €15.000.000 | 3% |
| Altri / informazioni errate | €7.500.000 | 1% |

**Art. 100 PMI:** riduzione al 50% per aziende con `employees_range` ∈ `{1-10, 11-50, 51-250}`.

**Stima fatturato (`estimateTurnover`):**
1. `annual_revenue_exact` (fonte: `exact`) → range stretto `MIN_FACTOR=0.50`
2. `annual_revenue_range` midpoint (fonte: `declared`) → range medio `MIN_FACTOR=0.30`
3. `employees_range` × sector multiplier (fonte: `estimated`) → range ampio `MIN_FACTOR=0.08`

**Range fatturato (10 fasce):**

| Codice | Valore mediano |
|--------|---------------|
| `under_100k` | €50.000 |
| `100k_500k` | €300.000 |
| `500k_1m` | €750.000 |
| `1m_3m` | €2.000.000 |
| `3m_10m` | €6.500.000 |
| `10m_30m` | €20.000.000 |
| `30m_100m` | €65.000.000 |
| `100m_500m` | €300.000.000 |
| `500m_1b` | €750.000.000 |
| `over_1b` | €3.000.000.000 |

**Deduplicazione articoli (`normalizeArticle`):**

```typescript
// "Art. 13, comma 1" → "Art. 13"
// "Articolo 22 AI Act" → "Art. 22"
// "Art.5(1)(a)" → "Art. 5"
function normalizeArticle(article: string): string {
  const match = article.match(/art(?:icolo|\.?)[\s.]*(\d+)/i);
  return match ? `Art. ${match[1]}` : article.trim().toLowerCase();
}
```

La stessa normalizzazione è applicata:
- **Intra-system:** più gap sullo stesso articolo → una sola sanzione (la più alta)
- **Cross-system (frontend):** l'inventario unisce i `last_article_sanctions` di tutti i sistemi con lo stesso criterio (max per articolo, non somma)

**Campi arricchiti nel risultato:**
- `estimated_sanction_min/max` per gap
- `tier_info`: `{tier_label, tier_cap, tier_pct, theoretical_pct_amount, theoretical_max}`
- `total_exposure_estimate`: `{min, max, currency, turnover_used, turnover_source, methodology}`
- `article_sanctions`: `Record<normalizedArticle, {min,max}>` — salvato nel sistema come `last_article_sanctions`

---

### 9. AWS IAM

#### Lambda Execution Role

| Risorsa | Nome |
|---------|------|
| Role | `actify-saas-lambda-role` |
| Trust | `lambda.amazonaws.com` |

| Azione | Risorsa | Scopo |
|--------|---------|-------|
| `dynamodb:PutItem/GetItem/UpdateItem/Query/DeleteItem` | 4 tabelle | CRUD dati |
| `bedrock:InvokeModel` | `eu.nova-pro-v1:0` (EU cross-region) | Analisi conformità |
| `cognito-idp:AdminCreateUser/AdminSetPassword/AdminGetUser` | User Pool | Registrazione/invite |
| `lambda:InvokeFunction` | Self ARN (`actify-saas-api`) | Self-invoke async |
| `logs:CreateLogStream/PutLogEvents` | Lambda log group | CloudWatch Logs |

#### GitHub Actions Deploy Role

| Azione | Risorsa | Scopo |
|--------|---------|-------|
| `s3:PutObject/DeleteObject` | `actify-saas-frontend/*` | Deploy file statici |
| `s3:ListBucket` | `actify-saas-frontend` | Sync con --delete |
| `cloudfront:CreateInvalidation` | Distribution `E2LIJKND7AI4TL` | Invalidazione cache |

OIDC trust: `token.actions.githubusercontent.com` — `repo:IngVincenzoBaldoni/actify-iac:*`

---

### 10. Amazon CloudWatch Logs

| Log Group | Retention | Componente |
|-----------|-----------|------------|
| `/aws/lambda/actify-saas-api` | 14 giorni | Lambda |
| `/aws/apigateway/actify-saas-api` | 14 giorni | API Gateway |

**Log Lambda:** strutturati in JSON. Includono `requestId`, `latency`, `companyId`, `statusCode`, `path`. Nessun PII.

---

## Sicurezza

| Controllo | Implementazione |
|-----------|-----------------|
| Autenticazione | Cognito JWT — validato da API Gateway, non da Lambda |
| Isolamento tenant | `companyId` estratto dai JWT claims (mai dal body) — PK DynamoDB |
| Input validation | Zod su tutti gli input Lambda |
| S3 privacy (frontend) | Public access block totale + OAC CloudFront |
| Cifratura at rest | SSE-AES256 su DynamoDB + S3 |
| IAM least privilege | Solo azioni necessarie per ogni risorsa specifica |
| HTTPS | CloudFront (redirect HTTP) + API Gateway (TLS) |
| CI/CD keyless | GitHub Actions OIDC — nessuna chiave AWS long-lived |
| Nessun PII nei log | Solo metadati aggregati (companyId, path, statusCode) |

---

## Convenzioni di naming

Tutte le risorse seguono la convenzione `actify-saas-<componente>`:

| Risorsa | Nome |
|---------|------|
| Lambda | `actify-saas-api` |
| API Gateway | `actify-saas-api` |
| S3 Frontend | `actify-saas-frontend` |
| Cognito User Pool | `eu-central-1_4D3kDUrMF` |
| DynamoDB Companies | `actify-saas-companies` |
| DynamoDB Users | `actify-saas-users` |
| DynamoDB Systems | `actify-saas-systems` |
| DynamoDB Checks | `actify-saas-checks` |
| CloudFront | `E2LIJKND7AI4TL` |
| IAM Role Lambda | `actify-saas-lambda-role` |
| IAM Role Deploy | `actify-saas-github-actions-deploy` |
| Log group Lambda | `/aws/lambda/actify-saas-api` |
| Log group API GW | `/aws/apigateway/actify-saas-api` |

Tag comuni su tutte le risorse:

```hcl
Project     = "actify"
Product     = "actify-saas"
Environment = "production"
Release     = "release-2"
ManagedBy   = "terraform"
Repository  = "actify-iac"
```

---

## Deploy e operazioni

### Prima installazione (Terraform)

```bash
cd terraform/release-2
terraform init
terraform apply
# Output: frontend_url, api_endpoint, cognito_user_pool_id, cognito_client_id, ecc.
```

### Build e deploy Lambda

```bash
cd lambda-api
npm install
npm run build   # genera dist/

# Zip e staging via S3
zip -r function.zip dist/ node_modules/ package.json
aws s3 cp function.zip s3://actify-saas-frontend/deployments/lambda.zip

aws lambda update-function-code \
  --function-name actify-saas-api \
  --s3-bucket actify-saas-frontend \
  --s3-key deployments/lambda.zip \
  --region eu-central-1
```

### Build e deploy Frontend (manuale)

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com \
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_4D3kDUrMF \
NEXT_PUBLIC_COGNITO_CLIENT_ID=2v3ggh33m5b4ap7kj96ufcqhmg \
  npm run build

aws s3 sync out/ s3://actify-saas-frontend --delete --region eu-central-1

aws cloudfront create-invalidation \
  --distribution-id E2LIJKND7AI4TL \
  --paths "/*" \
  --region eu-central-1
```

Il deploy automatico avviene via GitHub Actions ad ogni push su `main` che modifica `frontend/**`.

### Configurare GitHub Actions secrets

```
AWS_DEPLOY_ROLE_ARN           = arn:aws:iam::265020547280:role/actify-saas-github-actions-deploy
AWS_S3_BUCKET                 = actify-saas-frontend
CLOUDFRONT_DISTRIBUTION_ID    = E2LIJKND7AI4TL
```

Variables (non Secret):
```
NEXT_PUBLIC_API_URL              = https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID = eu-central-1_4D3kDUrMF
NEXT_PUBLIC_COGNITO_CLIENT_ID    = 2v3ggh33m5b4ap7kj96ufcqhmg
```

### Consultare i log Lambda

```bash
aws logs tail /aws/lambda/actify-saas-api \
  --follow --region eu-central-1
```

### Test endpoint API (registrazione)

```bash
curl -X POST https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Acme","email":"admin@acme.com","password":"Abc123!","sector":"tech","employees_range":"11-50","country":"IT"}'
```

### Test endpoint API (compliance check)

```bash
# Autenticarsi prima con Cognito per ottenere il JWT
TOKEN="eyJhbGc..."

# Triggera il check (risponde 202)
curl -X POST \
  https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com/api/systems/{systemId}/compliance-check \
  -H "Authorization: Bearer $TOKEN"

# Polling risultato
curl \
  https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com/api/systems/{systemId}/compliance-checks/latest \
  -H "Authorization: Bearer $TOKEN"
```

---

## Struttura repository

```
actify-iac/
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml       # CI/CD: build + S3 sync + CF invalidation
├── doc/
│   ├── architecture.svg              # Diagramma architettura Release 2
│   └── technical-documentation.md   # Questo documento
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── inventory/page.tsx    # Inventario AI con banner sanzioni cross-system
│   │   │   ├── setup/page.tsx        # Wizard onboarding (company + AI systems)
│   │   │   ├── settings/page.tsx     # Profilo company + fatturato
│   │   │   └── system/page.tsx       # Dettaglio sistema + check conformità + sanzioni
│   │   ├── compliance/
│   │   │   ├── page.tsx              # Hub compliance Actify — badge, sistemi AI, articoli, CTA
│   │   │   ├── dichiarazione/page.tsx # Dichiarazione formale conformità AI Act
│   │   │   ├── registro-ai/page.tsx  # Registro sistemi AI interni (Claude Code + Nova Pro)
│   │   │   ├── trasparenza/page.tsx  # Informativa Art. 50 — uso AI, dati, diritti
│   │   │   └── disclaimer/page.tsx   # Disclaimer legale e limitazioni responsabilità
│   │   ├── perche-fidarti/page.tsx   # Pagina trust — badge, stat, sistemi AI, articoli completi
│   │   ├── chi-siamo/page.tsx        # Team — CTO (AWS/AI) e CEO (PMI), missione
│   │   ├── faq/page.tsx              # FAQ accordion interattivo ('use client') — Q01, Q02
│   │   ├── login/page.tsx            # Auth + footer compliance
│   │   ├── register/page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── amplify.ts                # Amplify v6 config + Cognito
│   │   ├── auth.ts                   # signIn, signOut, getCurrentUser
│   │   ├── api.ts                    # fetchWithAuth() — aggiunge JWT ad ogni richiesta
│   │   ├── branding.ts               # markSvg, logoCombined, badgeSvg — SVG brand assets
│   │   └── types.ts                  # ComplianceGap, TotalExposure, GapTierInfo, SanctionMethodology
│   ├── next.config.mjs               # output: 'export' (static)
│   └── package.json
├── lambda-api/
│   ├── handler.ts                    # Entry point + async branching
│   ├── middleware/
│   │   └── auth.ts                   # extractAuth() da JWT claims
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── company.ts
│   │   ├── systems.ts
│   │   └── complianceCheck.ts
│   ├── services/
│   │   ├── cognitoService.ts
│   │   ├── dynamoService.ts
│   │   ├── complianceEngine.ts
│   │   ├── complianceOutputSchema.ts
│   │   ├── sanctions.ts
│   │   └── systemPrompt.ts
│   ├── types/
│   │   ├── aiSystem.ts
│   │   └── company.ts
│   ├── package.json
│   └── tsconfig.json
├── terraform/
│   └── release-2/
│       ├── providers.tf
│       ├── variables.tf
│       ├── locals.tf
│       ├── cognito.tf
│       ├── dynamodb.tf
│       ├── lambda.tf
│       ├── api_gateway.tf
│       ├── frontend.tf               # CloudFront + S3 + OIDC IAM
│       ├── iam.tf
│       ├── cloudwatch.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── SDD/
    └── Actify_SDD_Release2_v1.0.docx
```

---

## Costi stimati (produzione leggera)

| Servizio | Ipotesi | Costo stimato/mese |
|----------|---------|-------------------|
| API Gateway HTTP API | 10.000 richieste | ~$0.01 |
| Lambda | 1.000 compliance check × 30s × 1024MB | ~$0.50 |
| Bedrock Nova Pro | 1.000 check × ~12K token input + 2K output | ~$5.00 |
| DynamoDB On-Demand | 100K R/W units | ~$0.25 |
| Cognito | fino a 50.000 MAU | gratuito (free tier) |
| S3 Frontend | ~5 MB file statici | < $0.01 |
| CloudFront | 10.000 pagine × ~1 MB | ~$0.10 |
| CloudWatch | 1 GB log/mese | ~$0.50 |
| **Totale** | | **~$6.40/mese** |

Il costo è dominato da Bedrock. In produzione con volumi alti conviene valutare Bedrock Provisioned Throughput o la cache del system prompt.
