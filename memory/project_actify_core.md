---
name: project-actify-core
description: Actify — SaaS EU AI Act compliance. Stack completo, risorse AWS critiche, regola di branch, puntatore a CLAUDE.md
metadata:
  type: project
---

## Actify — AI Act Compliance SaaS (production, eu-central-1)

**La prima cosa da fare in ogni sessione**: leggere `CLAUDE.md` nella root del progetto. Contiene tutto: comandi deploy, schema DynamoDB, ID AWS, gotcha, feature status. È il riferimento operativo primario.

**Why:** il progetto è complesso (10 tabelle DynamoDB, 3 Lambda, Step Functions, Cognito, CloudFront). Senza CLAUDE.md si perde tempo a riscoprire cose già documentate.

**How to apply:** Prima di toccare qualsiasi codice, leggere `CLAUDE.md`. Prima di fare domande su come funziona qualcosa, cercarlo lì.

---

## Regola di branch — NON DEROGABILE

**Branch attivo: `develop`** — NON mergiare su `main` senza rilascio esplicito da parte di Vince.

**Why:** `main` è production. Il deploy automatico potrebbe triggerarsi. Vince ha stabilito questa regola esplicitamente.

**How to apply:** Tutti i commit, PR, modifiche vanno su `develop`. Se l'utente chiede di fare qualcosa che implica `main`, avvisarlo e chiedere conferma.

---

## ID AWS critici (eu-central-1)

```
API Gateway HTTP API:   lql1qfmdua
JWT Authorizer ID:      w03hoi
Lambda integration:     mbo1rpq
CloudFront distrib:     E2LIJKND7AI4TL  (us-east-1!)
Lambda API:             actify-saas-api
Lambda PDF:             actify-saas-pdf-generator
S3 frontend:            actify-saas-frontend
S3 documenti:           actify-saas-documents
Cognito User Pool:      eu-central-1_4D3kDUrMF
Cognito Client ID:      2v3ggh33m5b4ap7kj96ufcqhmg
```

**Why:** questi ID servono per ogni deploy, ogni update di route API Gateway, ogni invalidazione CloudFront. Tenerli in memoria evita di cercarli ogni volta su AWS console.

---

## Stack in sintesi

- **Frontend**: Next.js 14 static export → S3 + CloudFront. Auth via AWS Amplify v6.
- **API**: Lambda Node 20.x + TypeScript + Zod. API Gateway HTTP v2 con JWT authorizer.
- **AI**: Bedrock `eu.amazon.nova-pro-v1:0` (inference profile EU, solo eu-central-1).
- **Storage**: DynamoDB (10 tabelle, pay-per-request), S3.
- **Pipeline documenti**: Step Functions → 5 Lambda steps (assembleContext → generateSlot × N → validate → assemble → renderPdf → persistAudit).
- **IaC**: Terraform 1.6+, tutto in `terraform/release-2/`. Ambiente production già attivo.

---

## Ultimo aggiornamento: 2026-06-14

Novità rilevanti di questa sessione:
- AI Literacy redesign v2 completamente deployato (profili per sistema, PMI unified card, report → Document Vault)
- `generateArt4Report` ora salva PDF in S3 + tabella `documents`, non scarica più
- `UnifiedProfileCard` nel frontend: quando PMI mode ON, mostra una card sola con evidenze combinate
- CLAUDE.md creato nella root (non esisteva prima)
