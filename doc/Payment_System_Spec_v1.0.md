# Payment System — Spec Tecnica v1.0

**Versione:** 1.0 | Giugno 2026  
**Stack:** Next.js (Amplify) · Lambda API (Node/TypeScript) · DynamoDB · Stripe  
**Target clienti:** PMI italiane ed europee (B2B)  

---

## Decisioni architetturali

### Perché Stripe Checkout (hosted) e non un form custom

Per PMI italiane, Stripe Checkout hosted è la scelta corretta per questi motivi:

- **PCI DSS**: con Checkout hosted non tocchi mai i dati carta → zero compliance PCI a carico tuo
- **SCA/PSD2**: Stripe gestisce automaticamente 3D Secure per le banche EU
- **Stripe Tax**: calcolo e applicazione IVA automatica per tutte le aziende EU (rilevante se hai clienti europei non italiani)
- **Metodi di pagamento PMI**: Checkout supporta carta + SEPA Direct Debit in un'unica sessione — molte PMI preferiscono SEPA per abbonamenti B2B
- **Fatture**: Stripe genera automaticamente invoice con P.IVA e dati aziendali, scaricabili dal Customer Portal

### Enterprise: sales-assisted, NON self-serve

Il piano Enterprise (€249/mese) viene gestito manualmente: call commerciale → offerta personalizzata → fattura proforma → pagamento. Non passa per Stripe Checkout automatico. Il CTA nel frontend resta "Contattaci".

---

## Struttura Stripe da configurare (dashboard)

### Products & Prices

Creare **1 product per piano** con **2 price ciascuno** (mensile + annuale):

| Piano | Price mensile | Price annuale | Note |
|-------|--------------|---------------|------|
| Base | €79/mese | €790/anno (2 mesi gratis) | `price_base_monthly`, `price_base_annual` |
| Premium | €129/mese | €1.290/anno (2 mesi gratis) | `price_premium_monthly`, `price_premium_annual` |

Memorizzare i Price ID in variabili d'ambiente Lambda:
```
STRIPE_PRICE_BASE_MONTHLY=price_xxx
STRIPE_PRICE_BASE_ANNUAL=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx
```

### Stripe Tax

Attivare **Stripe Tax** nel dashboard. Configurare:
- Paese d'origine: Italia
- Registrazione IVA IT attiva
- `automatic_tax: { enabled: true }` in ogni Checkout Session

Questo gestisce automaticamente:
- IVA 22% per clienti italiani
- Reverse charge per PMI UE con P.IVA valida
- Esenzione IVA per clienti extra-UE

### Customer Portal

Attivare **Stripe Customer Portal** (Billing → Customer portal nel dashboard). Permette al cliente di:
- Scaricare tutte le fatture
- Aggiornare metodo di pagamento
- Fare upgrade/downgrade autonomo
- Cancellare l'abbonamento

Il link al portal viene generato server-side su richiesta (vedi endpoint `/api/billing/portal`).

---

## Schema DynamoDB — modifiche a `Company`

Aggiungere i seguenti campi al tipo `Company` (`lambda-api/types/company.ts`):

```typescript
export interface Company {
  // ... campi esistenti ...

  // ── Stripe ──────────────────────────────────────────────────────────────────
  stripe_customer_id?:      string;   // cus_xxx — creato al primo checkout
  stripe_subscription_id?:  string;   // sub_xxx — creato dopo checkout.session.completed
  stripe_price_id?:         string;   // price_xxx — piano attivo corrente
  subscription_status?:     'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  subscription_billing?:    'monthly' | 'annual';
  subscription_current_period_end?: string;  // ISO date — per mostrare "rinnovo il..."
  subscription_cancel_at_period_end?: boolean;

  // ── Dati fiscali PMI (raccolti al checkout) ──────────────────────────────────
  vat_number?:              string;   // P.IVA — es. IT01234567890
  billing_email?:           string;   // email per le fatture (può differire da login)
  billing_name?:            string;   // ragione sociale completa
  billing_address?: {
    line1:   string;
    city:    string;
    postal_code: string;
    country: string;        // 'IT' nella maggior parte dei casi
  };
  sdi_code?:                string;   // Codice SDI per fatturazione elettronica (opzionale)
}
```

**Nota fatturazione elettronica:** Stripe non supporta nativamente la fatturazione elettronica italiana (SDI). Le invoice Stripe vanno considerate come ricevute/proforma. Se i clienti richiedono fattura elettronica SDI, valutare integrazione con **Fatture in Cloud** o **Aruba** via API, oppure gestirla manualmente per i primi mesi.

---

## Nuovi endpoint Lambda API

### `POST /api/checkout/create-session`

Crea una Stripe Checkout Session e restituisce l'URL di redirect.

**Auth:** richiesta (JWT)

**Body:**
```typescript
{
  tier:    'base' | 'premium';
  billing: 'monthly' | 'annual';
}
```

**Logica:**
```typescript
// lambda-api/routes/billing.ts

export async function createCheckoutSession(companyId: string, tier: PlanTier, billing: BillingCycle) {
  const company = await dynamo.getCompany(companyId);
  const priceId = PRICE_IDS[tier][billing];

  // Se il cliente Stripe esiste già, passarlo per evitare duplicati
  const customerParam = company.stripe_customer_id
    ? { customer: company.stripe_customer_id }
    : { customer_email: company.billing_email ?? company.email };

  const session = await stripe.checkout.sessions.create({
    ...customerParam,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },   // raccoglie P.IVA nel form Stripe
    customer_update: company.stripe_customer_id
      ? { address: 'auto', name: 'auto', tax: 'auto' }
      : undefined,
    success_url: `${BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/plan`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { company_id: companyId, tier, billing },
    },
    metadata: { company_id: companyId, tier, billing },
  });

  return { url: session.url };
}
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/pay/cs_xxx" }
```

Frontend fa `window.location.href = url`.

---

### `POST /api/billing/portal`

Genera URL del Customer Portal Stripe per la gestione autonoma dell'abbonamento.

**Auth:** richiesta (JWT)

**Logica:**
```typescript
export async function createPortalSession(companyId: string) {
  const company = await dynamo.getCompany(companyId);

  if (!company.stripe_customer_id) {
    throw new Error('Nessun abbonamento attivo');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   company.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard/settings`,
  });

  return { url: session.url };
}
```

Aggiungere un link "Gestisci abbonamento" in `/dashboard/settings` che chiama questo endpoint e fa redirect.

---

### `POST /api/stripe/webhook` (endpoint pubblico, no auth JWT)

Riceve gli eventi Stripe. **Deve essere un endpoint separato** con verifica firma HMAC.

**Importante:** questo endpoint deve ricevere il body grezzo (raw Buffer), non parsato come JSON, altrimenti la verifica firma fallisce. Gestire nel Lambda handler prima del middleware JSON.

```typescript
// lambda-api/routes/stripeWebhook.ts

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch {
    throw new Error('Webhook signature verification failed');
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { company_id, tier, billing } = session.metadata!;

      await dynamo.updateCompany(company_id, {
        subscription_tier:       tier as SubscriptionTier,
        stripe_customer_id:      session.customer as string,
        stripe_subscription_id:  session.subscription as string,
        stripe_price_id:         PRICE_IDS[tier][billing],
        subscription_status:     'active',
        subscription_billing:    billing as BillingCycle,
      });

      // Aggiornare anche il customer Stripe con i tax ID raccolti
      // (Stripe li allega automaticamente al customer dopo il checkout)
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata.company_id;
      const newTier   = sub.metadata.tier ?? await resolveTierFromPriceId(sub.items.data[0].price.id);

      await dynamo.updateCompany(companyId, {
        subscription_tier:                newTier,
        subscription_status:              sub.status as SubscriptionStatus,
        subscription_current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
        subscription_cancel_at_period_end: sub.cancel_at_period_end,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice   = event.data.object as Stripe.Invoice;
      const companyId = (invoice.subscription_details?.metadata?.company_id) ?? '';

      await dynamo.updateCompany(companyId, {
        subscription_status: 'past_due',
      });

      // TODO: inviare email di avviso (SES) con link al portal per aggiornare pagamento
      break;
    }

    case 'customer.subscription.deleted': {
      const sub       = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata.company_id;

      await dynamo.updateCompany(companyId, {
        subscription_tier:       'trial',
        subscription_status:     'canceled',
        stripe_subscription_id:  undefined,
      });
      break;
    }

    case 'invoice.paid': {
      // Rinnovo andato a buon fine — assicurarsi che lo status sia 'active'
      const invoice   = event.data.object as Stripe.Invoice;
      const companyId = invoice.subscription_details?.metadata?.company_id ?? '';

      await dynamo.updateCompany(companyId, {
        subscription_status: 'active',
        subscription_current_period_end: new Date(
          (invoice.lines.data[0]?.period?.end ?? 0) * 1000
        ).toISOString(),
      });
      break;
    }
  }
}
```

---

## Pagine frontend da creare/modificare

### `/plan/page.tsx` — modifiche

Sostituire la chiamata `api.company.update({ subscription_tier: tier })` con:

```typescript
async function selectPlan(tier: PlanTier) {
  setSelecting(tier);
  try {
    const { url } = await api.billing.createCheckoutSession(tier, annual ? 'annual' : 'monthly');
    window.location.href = url;
  } catch {
    alert('Errore nell\'avvio del pagamento. Riprova.');
  } finally {
    setSelecting(null);
  }
}
```

### `/payment/success/page.tsx` — nuova pagina

Mostrata dopo il redirect da Stripe. Deve:
1. Fare polling su `GET /api/company` fino a quando `subscription_tier !== 'trial'` (il webhook aggiorna DynamoDB con un ritardo di 1-3 secondi)
2. Mostrare conferma con il piano attivato
3. Redirect automatico su `/dashboard` dopo 3 secondi

```typescript
// Polling semplice — max 10 tentativi, ogni 1.5s
useEffect(() => {
  let attempts = 0;
  const poll = setInterval(async () => {
    const company = await api.company.get();
    if (company.subscription_tier !== 'trial' || ++attempts >= 10) {
      clearInterval(poll);
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }, 1500);
  return () => clearInterval(poll);
}, []);
```

### `/dashboard/settings` — aggiungere sezione "Il tuo piano"

Mostrare: piano attivo, data prossimo rinnovo, link "Gestisci abbonamento" (→ Customer Portal).

```typescript
async function openBillingPortal() {
  const { url } = await api.billing.createPortalSession();
  window.location.href = url;
}
```

---

## Enforcement lato backend

Il `subscription_tier` in DynamoDB deve essere letto **dal backend**, non fidarsi mai del frontend per i limiti. Nei punti critici della Lambda API (es. `POST /api/systems` per aggiungere un nuovo AI Passport):

```typescript
// lambda-api/routes/systems.ts — guard all'aggiunta
const PLAN_LIMITS = { trial: 2, base: 10, premium: Infinity, enterprise: Infinity };

const company  = await dynamo.getCompany(companyId);
const limit    = PLAN_LIMITS[company.subscription_tier];
const count    = await dynamo.countSystems(companyId);

if (count >= limit) {
  return { statusCode: 403, body: JSON.stringify({
    error: 'plan_limit_reached',
    message: `Piano ${company.subscription_tier}: limite di ${limit} sistemi raggiunto`,
  })};
}
```

---

## Infrastruttura Terraform da aggiungere

### Nuovo endpoint API Gateway per webhook

Il webhook Stripe deve essere raggiungibile pubblicamente (no auth JWT, ma firma HMAC). Nel file `lambda-api.tf` o `apigateway.tf`:

```hcl
# Route webhook — no authorizer JWT
resource "aws_apigatewayv2_route" "stripe_webhook" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/stripe/webhook"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_api.id}"
  # Nessun authorizer — la firma viene verificata nel codice
}
```

### Variabili d'ambiente Lambda

Aggiungere al blocco `environment` della Lambda API:

```hcl
STRIPE_SECRET_KEY            = var.stripe_secret_key
STRIPE_WEBHOOK_SECRET        = var.stripe_webhook_secret
STRIPE_PRICE_BASE_MONTHLY    = var.stripe_price_base_monthly
STRIPE_PRICE_BASE_ANNUAL     = var.stripe_price_base_annual
STRIPE_PRICE_PREMIUM_MONTHLY = var.stripe_price_premium_monthly
STRIPE_PRICE_PREMIUM_ANNUAL  = var.stripe_price_premium_annual
```

Tutte le variabili Stripe vanno in **AWS Secrets Manager** o SSM Parameter Store (SecureString), non hardcodate in `terraform.tfvars`.

---

## Considerazioni specifiche PMI italiane

**Fatturazione elettronica SDI:** Stripe non emette fatture elettroniche valide per SDI. Le invoice Stripe sono ricevute valide ai fini IVA per reverse charge / clienti esteri, ma per clienti italiani che richiedono fattura elettronica è necessario:
- Raccogliere P.IVA e Codice SDI nel form Stripe (`tax_id_collection: { enabled: true }`)
- Emettere fattura elettronica manualmente (o via Fatture in Cloud API) a partire dai dati Stripe
- Valutare questa integrazione dopo i primi 10-20 clienti paganti (prima manuale va bene)

**SEPA Direct Debit:** Molte PMI preferiscono SEPA per gli abbonamenti B2B. Attivare nel dashboard Stripe → Payment methods. Stripe Checkout lo mostra automaticamente per clienti con IBAN EU. Il primo addebito SEPA richiede mandato (gestito da Stripe), i successivi sono automatici.

**Contratto/Ordine d'acquisto:** Alcune PMI (specialmente PA-adjacent o con procurement formale) richiedono un ordine d'acquisto prima di pagare. Predisporre un template PDF "Offerta commerciale" da inviare via email per questi casi — il pagamento avviene poi manualmente o tramite link Stripe Payment Link dedicato.

---

## Sequenza di implementazione consigliata

1. **Configurare Stripe** (dashboard): prodotti, prezzi, tax, customer portal, webhook endpoint
2. **Aggiornare schema DynamoDB** (aggiungere campi Stripe e fiscali a `Company`)
3. **Implementare endpoint Lambda** (`/api/checkout/create-session`, `/api/billing/portal`, `/api/stripe/webhook`)
4. **Aggiornare `/plan/page.tsx`** per chiamare il checkout reale
5. **Creare `/payment/success`** con polling
6. **Aggiungere guard backend** su `POST /api/systems` (e altri endpoint limitati per piano)
7. **Aggiornare Terraform** (route webhook pubblica, env vars)
8. **Test in Stripe test mode** con carta test `4000 0025 0000 3155` (SCA richiesta) e IBAN test `DE89370400440532013000`
9. **Go live** con chiavi production
