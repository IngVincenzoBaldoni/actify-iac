---
name: project-actify-partner
description: Actify Partner feature — multi-client dashboard for Studios/Consultants managing PMI clients
metadata:
  type: project
---

## Actify Partner Feature — fully deployed as of 2026-06-04

**Architecture:**
- `custom:role='partner'` in Cognito — distinct from 'admin'/'member'
- Partner `companyId` = `partner_id` (UUID generated at registration)
- Two new DynamoDB tables:
  - `actify-saas-partners` (PK: partner_id)
  - `actify-saas-partner-pmi` (PK: partner_id, SK: pmi_id, GSI: token-index on form_token)

**API Routes:**
- Public: `POST /api/partner/request` — partner registration
- Public: `GET /api/assessment/{token}` — get white-label form config
- Public: `POST /api/assessment/{token}/submit` — submit multi-tool form
- Protected (JWT): `GET/PUT /api/partner/me`, `GET/POST/DELETE /api/partner/pmi`, `POST /api/partner/pmi/import-csv`, `POST /api/partner/pmi/{pmiId}/send-assessment`, `POST /api/partner/pmi/{pmiId}/pdf`

**Key files:**
- `lambda-api/routes/partner.ts` — all partner routes
- `lambda-api/services/partnerEmailService.ts` — Resend email with white-label template
- `lambda-api/types/partner.ts` — Partner, PartnerPMI, PMISystem types
- `frontend/app/partner/page.tsx` — Discovery Dashboard (PMI grid, add/email/report modals)
- `frontend/app/partner/layout.tsx` — Partner sidebar nav (auth guards `role === 'partner'`)
- `frontend/app/partner/settings/page.tsx` — logo URL, primary color, sender name, reply-to
- `frontend/app/assessment/page.tsx` — white-label multi-tool assessment form (public, uses `?token=`)
- `frontend/app/register/page.tsx` — Step 0: PMI vs Partner type selector

**Login routing:** after `doSignIn`, `getAuthClaims()` checked → partner goes to `/partner`, PMI to `/dashboard`

**PDF:** `POST /api/partner/pmi/{pmiId}/pdf` returns structured JSON report (not base64 PDF); frontend uses `window.print()` for now.

**Why:** Studios/consultants (Studi Legali, Commercialisti, DPO) need to manage compliance for many SME clients without each client having their own Actify account.

**How to apply:** When modifying auth flows, always handle 3 roles: admin, member, partner. Never limit role type to only 'admin'|'member' in TypeScript.
