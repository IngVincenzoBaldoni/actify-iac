---
name: project-actify-literacy-v2
description: AI Literacy Tracker v2 — design decisions, schema, PMI mode, report flow. Redesign completo giugno 2026.
metadata:
  type: project
---

## AI Literacy Tracker v2 — deployato 2026-06-14

Feature per tracciare la formazione AI obbligatoria per Art. 4 EU AI Act, per ogni sistema nell'AI Inventory.

---

## Schema DynamoDB (tabella `actify-saas-literacy`)

PK = `company_id`, SK = `record_id`. Pattern SK:

```
PROFILE#<systemId>#<profileType>   → profilo per sistema
EVIDENCE#<profileId>#<evidenceId>  → singola evidenza formativa
SUGGEST#<systemId>#<profileType>   → cache suggerimenti Bedrock
```

Profile types:
- `deployer` → `operational_users`, `supervisors`
- `provider` → `dev_team`, `qa_team`, `commercial_team`

**Record v1 legacy** (`DEPT#`, `CERT#`) ancora presenti nella tabella — il codice v2 li ignora filtrando su prefix. Non eliminare.

---

## PMI piccola — profilo unificato

Quando una piccola azienda ha una sola persona che copre entrambi i ruoli (es. supervisore + utente operativo):

- Il profilo **secondario** ha `merged_with: 'primaryProfileType'`
- Il profilo **primario** ha `merged_with: null`
- Il backend `literacyStatus()` esclude i profili con `merged_with != null` dal calcolo status
- Il frontend rileva PMI mode con `profiles.find(p => !!p.merged_with)`
- Quando PMI mode ON → `UnifiedProfileCard` (una card sola, evidenze combinate)
- Quando PMI mode OFF → due `ProfileCard` separate, ciascuna con il toggle per attivare PMI

**Coverage combinata**: `UnifiedProfileCard` somma le evidenze di entrambi i profili (`primaryProfile.evidences + secondaryProfile.evidences`) divise per `primaryProfile.headcount`.

---

## Report Art. 4 — va nel Document Vault

Il bottone "Genera Report Art. 4" **NON scarica** un PDF. Invece:
1. Chiama `GET /api/literacy/{systemId}/report`
2. Il backend genera PDF via lambda-pdf (`_literacyReportRequest`)
3. Carica il PDF su S3: `documents/<companyId>/<systemId>/art4_literacy_report/<docId>_v1.pdf`
4. Crea un record in tabella `documents` con `status: 'final'`, `document_type: 'art4_literacy_report'`
5. Risponde `{ document_id, title }`
6. Il frontend fa redirect su `/dashboard/documents`

**Why:** Il report è un documento legale da conservare e mostrare agli ispettori. Deve stare nel vault, non essere scaricato e perso.

Sotto il bottone c'è un disclaimer: "Questo documento è fondamentale in caso di ispezione da parte delle autorità competenti."

---

## File principali

- `lambda-api/routes/literacy.ts` — tutti gli endpoint
- `lambda-api/services/literacySuggestService.ts` — suggerimenti Bedrock per profilo
- `lambda-pdf/services/literacyReportHtml.ts` — HTML template report Art. 4
- `frontend/app/dashboard/literacy/page.tsx` — lista sistemi con stato literacy
- `frontend/app/dashboard/literacy/detail/page.tsx` — dettaglio: ProfileCard, UnifiedProfileCard, SuggestionsPanel, report button
- `frontend/app/dashboard/literacy/[systemId]/page.tsx` — placeholder statico (solo per next.js static export)

---

## Gotcha noti

**CORS**: il PATCH endpoint (`/api/literacy/{systemId}/profiles/{profileId}`) richiede che `AllowMethods` di API Gateway includa `PATCH`. Era il bug principale — browser bloccava silenziosamente, catch vuoto inghiottiva l'errore.

**Headcount sul profilo secondario**: quando PMI mode è ON, il headcount si modifica solo sul profilo primario (quello con `merged_with: null`). `UnifiedProfileCard` chiama `updateProfile` con `primaryProfile.profile_id`.

**Delete evidence nel profilo unificato**: le evidenze possono stare su primario o secondario (se aggiunte prima del merge). `UnifiedProfileCard` tiene traccia del `_pid` (profile_id di provenienza) per ogni evidenza e usa il corretto profile_id nel delete call.
