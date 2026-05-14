# Actify SaaS — Release 1: Technical Documentation

**Prodotto:** Actify — EU AI Act Compliance Assessment  
**Release:** 1 (Demo)  
**Regione AWS:** eu-central-1 (Frankfurt)  
**IaC:** Terraform  
**Data:** 2026

---

## Panoramica

Actify è un servizio B2B che permette alle aziende di valutare la loro conformità al **Regolamento UE 2024/1689 (AI Act)**. L'utente compila un form di assessment tramite il frontend statico, il sistema elabora i dati tramite un modello AI su Amazon Bedrock, genera un report PDF e restituisce un link di download temporaneo. Ogni submission viene persistita nel Data Lake per analytics aggregata.

**Frontend:** `https://dxmu107adlwoo.cloudfront.net`  
**API endpoint:** `https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com`

---

## Diagramma di architettura

![Architettura Actify Release 1](./architecture.svg)

---

## Flusso end-to-end

| Step | Evento | Attore |
|------|--------|--------|
| ① | `GET /` — il browser carica il frontend statico da CloudFront/S3 | Browser → CloudFront → S3 Frontend |
| ② | Utente compila il wizard (7 step) e invia | Browser |
| ③ | `POST /api/report/generate` — payload JSON | Browser → API Gateway → Lambda |
| ④ | Lambda valida il payload con zod e controlla il rate limit | Lambda |
| ⑤ | Lambda chiama Bedrock (Converse API) con il system prompt AI Act | Lambda → Bedrock |
| ⑥ | Bedrock restituisce un JSON strutturato (`BedrockReportOutput`) | Bedrock → Lambda |
| ⑦ | Lambda renderizza HTML e genera il PDF con Puppeteer + Chromium | Lambda |
| ⑧ | Lambda carica il PDF su S3 e genera una presigned URL (15 min TTL) | Lambda → S3 reports-temp |
| ⑨ | Lambda persiste la submission come JSON nel Data Lake S3 | Lambda → S3 datalake |
| ⑩ | Lambda restituisce `{ download_url }` al browser | Lambda → API Gateway → Browser |
| ⑪ | Lambda e API Gateway scrivono i log strutturati su CloudWatch | Lambda, API GW → CloudWatch |

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
| Cache TTL | default 1 giorno, max 1 anno (file statici) |

**Perché CloudFront + S3 e non Amplify Hosting:** Amplify Hosting in eu-central-1 presenta un bug irrisolvibile ("Unable to assume specified IAM Role") indipendente dalla configurazione IAM. S3 + CloudFront offre maggiore controllo, nessuna dipendenza da servizi IAM opachi di Amplify, e supporto completo per il deploy keyless via GitHub Actions OIDC.

**Perché OAC e non ACL pubblico:** il bucket S3 è completamente privato (tutti i 4 flag public-access-block attivi). CloudFront accede tramite OAC firmando le richieste con SigV4, senza esporre oggetti S3 direttamente.

---

### 2. GitHub Actions CI/CD

Il deploy del frontend è automatizzato tramite GitHub Actions con autenticazione OIDC (nessuna credential long-lived in GitHub Secrets).

**File:** `.github/workflows/deploy-frontend.yml`

| Step | Comando | Note |
|------|---------|------|
| Checkout | `actions/checkout@v4` | |
| Node.js 20 | `actions/setup-node@v4` | cache: npm |
| Install | `npm ci` | da `frontend/` |
| Build | `npm run build` | bake `NEXT_PUBLIC_API_URL` |
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

**Perché OIDC e non access key:** GitHub Actions supporta `sts:AssumeRoleWithWebIdentity` tramite l'OIDC provider `token.actions.githubusercontent.com`. Non servono credenziali statiche in GitHub Secrets: il token JWT efimero viene scambiato con credenziali AWS temporanee a ogni run.

---

### 3. Amazon API Gateway HTTP API v2

| Proprietà | Valore |
|-----------|--------|
| Nome | `actify-saas-api` |
| Tipo | HTTP API (v2) — non REST API |
| Stage | `$default` (auto-deploy) |
| Route | `POST /api/report/generate` → genera il report |
| Integrazione | `AWS_PROXY` payload format `2.0` |
| CORS | `allow_origins: *`, metodi `POST OPTIONS` |
| Throttling | burst 10 req, steady 2 req/s |
| Log group | `/aws/apigateway/actify-saas-api` |

**Nota:** la route `GET /` (che in precedenza serviva il form HTML direttamente dalla Lambda) è mantenuta per backward compatibility ma non è più il punto di ingresso principale. Il frontend è ora servito da CloudFront.

---

### 4. AWS Lambda

| Proprietà | Valore |
|-----------|--------|
| Nome | `actify-saas-pdf-generator` |
| Runtime | Node.js 20.x |
| Handler | `dist/handler.handler` |
| Memory | 1024 MB |
| Timeout | 30 s |
| Deployment | Zip 81 MB via S3 staging |
| Deployment package | `@sparticuz/chromium` + `puppeteer-core` + AWS SDKs + zod |

**Variabili d'ambiente:**

| Variabile | Valore | Scopo |
|-----------|--------|-------|
| `BEDROCK_MODEL_ID` | `eu.amazon.nova-pro-v1:0` | Inference profile EU |
| `BEDROCK_REGION` | `eu-central-1` | Regione endpoint Bedrock |
| `BEDROCK_MAX_TOKENS` | `5120` | Limite output modello |
| `BEDROCK_TEMPERATURE` | `0` | Output deterministico |
| `S3_BUCKET` | `actify-saas-reports-temp` | Bucket destinazione PDF |
| `S3_REGION` | `eu-central-1` | Regione bucket S3 |
| `PRESIGNED_URL_TTL` | `900` | TTL URL in secondi (15 min) |
| `DATALAKE_BUCKET` | `actify-saas-datalake` | Bucket Data Lake per persistence |
| `RATE_LIMIT_MAX` | `5` | Max richieste per IP per finestra |
| `RATE_LIMIT_WINDOW` | `900` | Finestra rate limit in secondi |
| `ENV` | `demo` | Ambiente |
| `LOG_LEVEL` | `info` | Livello di log |

**Componenti interni della Lambda (TypeScript):**

| Modulo | File | Responsabilità |
|--------|------|----------------|
| Handler | `handler.ts` | Entry point, orchestrazione del flusso |
| Rate Limiter | `middleware/rateLimiter.ts` | In-memory Map, 5 req/IP/15 min |
| Validator | `middleware/validator.ts` | Schema zod per `IntakePayload` |
| Bedrock Service | `services/bedrockService.ts` | Converse API, system prompt, retry |
| HTML Template | `services/htmlTemplate.ts` | Cover, KPI, tool cards, timeline |
| PDF Service | `services/pdfService.ts` | Puppeteer + Chromium → Buffer A4 |
| S3 Service | `services/s3Service.ts` | PutObject + getSignedUrl (reports) |
| Datalake Service | `services/datalakeService.ts` | PutObject → bronze/prospects/ (JSON) |
| Form HTML | `services/formHtml.ts` | Wizard HTML self-contained (7 step) |
| System Prompt | `services/systemPrompt.ts` | Knowledge base AI Act (~10K token) |
| Output Schema | `services/outputSchema.ts` | Zod schema + template JSON per Bedrock |

**System prompt AI Act:** `systemPrompt.ts` contiene ~380 righe, ~10K token. Copre Art. 3 (definizioni), Art. 5 (vietati), Art. 6 + Allegato III (8 categorie alto rischio), Art. 8-15 (requisiti sistemi AR), Art. 16-26 (obblighi Provider/Deployer), Art. 50 (trasparenza), Art. 51-56 (GPAI), Art. 99-101 (sanzioni), intersezione GDPR.

**Pattern stub:** al primo `terraform apply` viene deployato uno zip placeholder (503 handler). Il blocco `lifecycle { ignore_changes = [filename, source_code_hash] }` impedisce a Terraform di sovrascrivere il codice reale nelle apply successive.

---

### 5. Amazon Bedrock

| Proprietà | Valore |
|-----------|--------|
| Modello | Amazon Nova Pro |
| Model ID | `eu.amazon.nova-pro-v1:0` |
| Tipo | EU cross-region inference profile |
| Regioni di routing | eu-central-1, eu-west-1, eu-west-3, eu-north-1 |
| API | Converse API (non InvokeModel raw) |
| Auth | IAM SigV4 (ruolo Lambda) |
| Max tokens | 5120 |
| Temperature | 0 (output deterministico) |

**Flusso AI:**
1. Il system prompt (~10K token) contiene l'intera knowledge base dell'AI Act.
2. Il user message contiene il payload dell'azienda + un template JSON esplicito dell'output atteso.
3. Bedrock risponde con un JSON compatto (`BedrockReportOutput`) validato con zod.
4. In caso di parse failure, il servizio riprova con istruzioni più esplicite (retry pattern).

---

### 6. Amazon S3 — Reports Temp

| Proprietà | Valore |
|-----------|--------|
| Nome bucket | `actify-saas-reports-temp` |
| Cifratura | SSE-AES256 |
| Accesso pubblico | Completamente bloccato (4 flag) |
| Lifecycle | Expire dopo 1 giorno (prefix `reports/`) |
| Path PDF | `reports/{YYYY-MM-DD}/{uuid}-{company-slug}.pdf` |
| Presigned URL | GET · TTL 900 s (15 min) · SigV4 |
| Uso secondario | Staging zip Lambda (`deployments/function.zip`) |

---

### 7. Data Lake (S3 + Glue + Athena)

Ogni submission viene persistita come record JSON nel Data Lake per analytics futura (volume, settori, profili di rischio).

#### S3 — Data Lake

| Proprietà | Valore |
|-----------|--------|
| Nome bucket | `actify-saas-datalake` |
| Cifratura | SSE-AES256 |
| Accesso pubblico | Completamente bloccato |
| Path prospects | `bronze/prospects/year=YYYY/month=MM/day=DD/{uuid}.json` |
| Path PDF copy | `company-reports/{uuid}-{slug}.pdf` |
| Path Athena results | `athena-results/` (lifecycle: 30 giorni) |
| Partizioni | Hive-compatible (year/month/day) — Partition Projection |

**Schema JSON prospect (esempio):**
```json
{
  "submission_id": "uuid",
  "company_name": "...",
  "company_sector": "...",
  "company_employees": "...",
  "sede_legale": "IT",
  "ai_role": "provider",
  "tool_count": 3,
  "report_s3_key": "reports/...",
  "year": "2026", "month": "05", "day": "14"
}
```

#### Glue Data Catalog

| Proprietà | Valore |
|-----------|--------|
| Database | `actify_datalake` |
| Crawler | `actify-saas-prospects-crawler` |
| Schedule | Giornaliero alle 02:00 UTC |
| Partition Projection | Abilitata (evita crawl su ogni nuova partizione) |
| Tabella | `prospects` |

Trigger manuale dopo le prime submission:
```bash
aws glue start-crawler --name actify-saas-prospects-crawler --region eu-central-1
```

#### Amazon Athena

| Proprietà | Valore |
|-----------|--------|
| Workgroup | `actify-saas-analytics` |
| Modello di pricing | Pay-per-query |
| Output location | `s3://actify-saas-datalake/athena-results/` |

Query di esempio (tutti i prospect ordinati per data):
```sql
SELECT submission_id, company_name, company_sector, ai_role, tool_count, year, month, day
FROM actify_datalake.prospects
ORDER BY year DESC, month DESC, day DESC
```

---

### 8. AWS IAM

#### Lambda Execution Role

| Risorsa | Nome |
|---------|------|
| Role | `actify-saas-lambda-role` |
| Policy | `actify-saas-lambda-policy` |
| Trust | `lambda.amazonaws.com` |

| Azione | Risorsa | Scopo |
|--------|---------|-------|
| `s3:PutObject` | `actify-saas-reports-temp/reports/*` | Upload PDF |
| `s3:GetObject` | `actify-saas-reports-temp/reports/*` | Firma presigned URL |
| `s3:PutObject` | `actify-saas-datalake/bronze/prospects/*` | Persist JSON submission |
| `s3:PutObject` | `actify-saas-datalake/company-reports/*` | Copia PDF nel datalake |
| `bedrock:InvokeModel` | 6 regioni EU+US + inference profile | Invoke Nova Pro |
| `bedrock:InvokeModelWithResponseStream` | Stesse risorse | Streaming (future use) |
| `logs:CreateLogStream` / `logs:PutLogEvents` | Lambda log group | CloudWatch Logs |

#### GitHub Actions Deploy Role

| Risorsa | Nome |
|---------|------|
| Role | `actify-saas-github-actions-deploy` |
| OIDC Provider | `token.actions.githubusercontent.com` |
| Trust condition | `repo:IngVincenzoBaldoni/actify-iac:*` |

| Azione | Risorsa | Scopo |
|--------|---------|-------|
| `s3:PutObject`, `s3:DeleteObject` | `actify-saas-frontend/*` | Deploy file statici |
| `s3:ListBucket` | `actify-saas-frontend` | Sync con --delete |
| `cloudfront:CreateInvalidation` | Distribution `E2LIJKND7AI4TL` | Invalidazione cache |

---

### 9. Amazon CloudWatch Logs

| Log Group | Retention | Componente |
|-----------|-----------|------------|
| `/aws/lambda/actify-saas-pdf-generator` | 14 giorni | Lambda |
| `/aws/apigateway/actify-saas-api` | 14 giorni | API Gateway |

**Log Lambda:** strutturati in JSON `{ level, msg, ts, ...extra }`. Nessun dato PII — solo metadati aggregati (sector, ai_role, tool_count, risk_level, s3_key).

---

## Sicurezza

| Controllo | Implementazione |
|-----------|-----------------|
| Rate limiting | In-memory: 5 req/IP/15 min (Lambda) |
| Input validation | zod schema su tutti i campi del payload |
| S3 privacy (reports) | Public access block + presigned URL |
| S3 privacy (frontend) | Public access block + OAC CloudFront |
| S3 privacy (datalake) | Public access block totale |
| Cifratura at rest | SSE-AES256 su tutti i bucket S3 |
| IAM least privilege | Solo azioni necessarie, solo sui path `reports/*` e `bronze/*` |
| No PII nei log | Solo metadati aggregati loggati |
| HTTPS everywhere | CloudFront (redirect) + API Gateway (TLS) |
| Dati temporanei | PDF eliminato dopo 1 giorno, URL scade in 15 min |
| CI/CD keyless | GitHub Actions OIDC — nessuna chiave AWS long-lived |

---

## Convenzioni di naming

Tutte le risorse seguono la convenzione `actify-saas-<componente>`:

| Risorsa | Nome |
|---------|------|
| Lambda | `actify-saas-pdf-generator` |
| API Gateway | `actify-saas-api` |
| S3 Reports | `actify-saas-reports-temp` |
| S3 Frontend | `actify-saas-frontend` |
| S3 Data Lake | `actify-saas-datalake` |
| CloudFront | `E2LIJKND7AI4TL` |
| IAM Role Lambda | `actify-saas-lambda-role` |
| IAM Role Deploy | `actify-saas-github-actions-deploy` |
| Glue DB | `actify_datalake` |
| Glue Crawler | `actify-saas-prospects-crawler` |
| Athena Workgroup | `actify-saas-analytics` |
| Log group Lambda | `/aws/lambda/actify-saas-pdf-generator` |
| Log group API GW | `/aws/apigateway/actify-saas-api` |

Tag comuni su tutte le risorse:

```hcl
Project     = "actify"
Product     = "actify-saas"
Environment = "demo"
Release     = "release-1"
ManagedBy   = "terraform"
Repository  = "actify-iac"
```

---

## Deploy e operazioni

### Prima installazione (Terraform)
```bash
cd terraform/release-1
terraform init
terraform apply
# Output: frontend_url, api_endpoint, frontend_deploy_role_arn, ecc.
```

### Build e deploy Lambda
```bash
cd lambda-pdf
npm install
npm run build

# Staging via S3 (zip > 50 MB)
aws s3 cp lambda-pdf/dist/function.zip \
  s3://actify-saas-reports-temp/deployments/function.zip

aws lambda update-function-code \
  --function-name actify-saas-pdf-generator \
  --s3-bucket actify-saas-reports-temp \
  --s3-key deployments/function.zip \
  --region eu-central-1
```

### Build e deploy Frontend (manuale)
```bash
cd frontend
NEXT_PUBLIC_API_URL=https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com \
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
AWS_DEPLOY_ROLE_ARN  = arn:aws:iam::265020547280:role/actify-saas-github-actions-deploy
AWS_S3_BUCKET        = actify-saas-frontend
CLOUDFRONT_DISTRIBUTION_ID = E2LIJKND7AI4TL
```
Variable (non Secret):
```
NEXT_PUBLIC_API_URL  = https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com
```

### Analytics Data Lake
```bash
# Trigger manuale Glue Crawler (dopo le prime submission)
aws glue start-crawler --name actify-saas-prospects-crawler --region eu-central-1

# Query Athena: tutti i prospect
aws athena start-query-execution \
  --query-string "SELECT * FROM actify_datalake.prospects ORDER BY year DESC, month DESC, day DESC" \
  --work-group actify-saas-analytics \
  --region eu-central-1
```

### Consultare i log Lambda
```bash
aws logs tail /aws/lambda/actify-saas-pdf-generator \
  --follow --region eu-central-1
```

### Test endpoint
```bash
curl -X POST https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com/api/report/generate \
  -H "Content-Type: application/json" \
  -d '{ ... payload ... }'
```

---

## Struttura repository

```
actify-iac/
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml       # CI/CD: build + S3 sync + CF invalidation
├── doc/
│   ├── architecture.svg              # Diagramma architettura (questo file)
│   └── technical-documentation.md   # Questo documento
├── frontend/
│   ├── app/                          # Next.js 14 App Router
│   ├── components/                   # React components
│   ├── next.config.mjs               # output: 'export' (static)
│   ├── package.json
│   └── .gitignore                    # esclude .next/ e out/
├── lambda-pdf/
│   ├── handler.ts                    # Entry point Lambda
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   └── validator.ts
│   ├── services/
│   │   ├── bedrockService.ts
│   │   ├── datalakeService.ts        # Persistence JSON → S3 datalake
│   │   ├── formHtml.ts
│   │   ├── htmlTemplate.ts
│   │   ├── outputSchema.ts
│   │   ├── pdfService.ts
│   │   ├── s3Service.ts
│   │   └── systemPrompt.ts           # ~10K token AI Act knowledge base
│   ├── types/
│   │   ├── intake.ts
│   │   └── reportOutput.ts
│   ├── package.json
│   └── tsconfig.json
├── terraform/
│   └── release-1/
│       ├── amplify.tf                # Vuoto — Amplify rimosso, sostituito da frontend.tf
│       ├── api_gateway.tf
│       ├── cloudwatch.tf
│       ├── datalake.tf               # S3 datalake + Glue + Athena
│       ├── frontend.tf               # CloudFront + S3 frontend + OIDC IAM
│       ├── iam.tf
│       ├── lambda.tf
│       ├── locals.tf
│       ├── outputs.tf
│       ├── providers.tf
│       ├── s3.tf
│       ├── terraform.tfvars
│       └── variables.tf
└── SDD/
    └── Release_DEMO_1/
        ├── Actify_SDD_Release1_v1.0.md
        └── system_prompt_ai_act.md
```

---

## Costi stimati (Demo)

| Servizio | Ipotesi | Costo stimato/mese |
|----------|---------|-------------------|
| API Gateway HTTP API | 1.000 richieste | < $0.01 |
| Lambda | 1.000 invocazioni × 20s × 1024MB | ~$0.33 |
| Bedrock Nova Pro | 1.000 richieste × ~11K token input + 1K output | ~$2.50 |
| S3 Reports | 1.000 PDF × ~200 KB, 1-day retention | < $0.01 |
| S3 Frontend | ~5 MB file statici | < $0.01 |
| S3 Data Lake | 1.000 record JSON × ~2 KB + Athena results | < $0.01 |
| CloudFront | 1.000 pagine × ~1 MB (PriceClass_100) | ~$0.01 |
| Glue Crawler | 1 DPU × 10 min/giorno | ~$0.15 |
| Athena | Query occasionali × ~10 KB scanned/query | < $0.01 |
| CloudWatch | 1 GB log/mese | ~$0.50 |
| **Totale** | | **~$3.52/mese** |

Il costo è dominato da Bedrock. In produzione con volumi alti conviene valutare Bedrock Provisioned Throughput. CloudFront e S3 frontend hanno costo trascurabile per i volumi demo.
