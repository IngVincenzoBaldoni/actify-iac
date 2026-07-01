import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStripe(): any {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' });
}

const PRICE_MAP: Record<string, Record<string, string>> = {
  trial:   { monthly: process.env.STRIPE_PRICE_TRIAL_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_TRIAL_ANNUAL ?? '' },
  base:    { monthly: process.env.STRIPE_PRICE_BASE_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_BASE_ANNUAL ?? '' },
  premium: { monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? '' },
};

const checkoutSchema = z.object({
  tier:          z.enum(['trial', 'base', 'premium']),
  billing_cycle: z.enum(['monthly', 'annual']),
  email:         z.string().email().optional(),
});

export async function createCheckoutSession(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const body = parseBody(event.body, checkoutSchema);
  const { tier, billing_cycle, email } = body;

  const priceId = PRICE_MAP[tier]?.[billing_cycle];
  if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: 'Configurazione piano non valida' }) };

  const frontendUrl = process.env.FRONTEND_URL ?? 'https://official-actify.com';

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(email ? { customer_email: email } : {}),
    client_reference_id: auth.companyId,
    metadata: { company_id: auth.companyId, user_id: auth.userId, tier, billing_cycle },
    subscription_data: {
      metadata: { company_id: auth.companyId, tier, billing_cycle },
    },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/register`,
    allow_promotion_codes: true,
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
}

const changePlanSchema = z.object({
  tier:          z.enum(['trial', 'base', 'premium']),
  billing_cycle: z.enum(['monthly', 'annual']),
});

export async function changePlan(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const { tier, billing_cycle } = parseBody(event.body, changePlanSchema);

  const company = await dynamo.getCompany(auth.companyId);
  const subscriptionId = company?.stripe_subscription_id as string | undefined;
  if (!subscriptionId) return { statusCode: 400, body: JSON.stringify({ error: 'Nessun abbonamento Stripe attivo' }) };

  const priceId = PRICE_MAP[tier]?.[billing_cycle];
  if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: 'Configurazione piano non valida' }) };

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0].id;

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'create_prorations',
    coupon: '',
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

export async function createPortalSession(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const company = await dynamo.getCompany(auth.companyId);
  const customerId = company?.stripe_customer_id as string | undefined;
  if (!customerId) return { statusCode: 400, body: JSON.stringify({ error: 'Nessun abbonamento attivo trovato' }) };

  const frontendUrl = process.env.FRONTEND_URL ?? 'https://official-actify.com';

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${frontendUrl}/dashboard/settings`,
  });

  return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
}
