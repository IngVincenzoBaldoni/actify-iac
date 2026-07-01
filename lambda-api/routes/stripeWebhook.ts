// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');
import * as dynamo from '../services/dynamoService';
import { logEvent } from '../services/auditService';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStripe(): any {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' });
}

function tierFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_TRIAL_MONTHLY ?? '']:   'trial',
    [process.env.STRIPE_PRICE_TRIAL_ANNUAL ?? '']:    'trial',
    [process.env.STRIPE_PRICE_BASE_MONTHLY ?? '']:    'base',
    [process.env.STRIPE_PRICE_BASE_ANNUAL ?? '']:     'base',
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '']: 'premium',
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? '']:  'premium',
  };
  return map[priceId] ?? null;
}

export async function handleWebhook(event: APIGatewayProxyEventV2) {
  const sig = event.headers['stripe-signature'] ?? '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
    : (event.body ?? '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stripeEvent: any;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Webhook signature verification failed' }) };
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      const companyId = session.client_reference_id ?? session.metadata?.company_id;
      const tier = session.metadata?.tier;
      if (!companyId || !tier) break;

      await dynamo.updateCompany(companyId, {
        stripe_customer_id:     session.customer,
        stripe_subscription_id: session.subscription,
        subscription_tier:      tier,
        subscription_status:    'active',
      });

      await logEvent(companyId, 'subscription_activated', { tier, session_id: session.id }, '').catch(() => {});
      break;
    }

    case 'customer.subscription.updated': {
      const sub = stripeEvent.data.object;
      const companyId = sub.metadata?.company_id;
      if (!companyId) break;

      const priceId = sub.items?.data?.[0]?.price?.id;
      const tier = priceId ? tierFromPriceId(priceId) : null;
      const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled';

      await dynamo.updateCompany(companyId, {
        ...(tier ? { subscription_tier: tier } : {}),
        subscription_status: status,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = stripeEvent.data.object;
      const companyId = sub.metadata?.company_id;
      if (!companyId) break;

      await dynamo.updateCompany(companyId, { subscription_status: 'canceled' });
      await logEvent(companyId, 'subscription_canceled', {}, '').catch(() => {});
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) break;

      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const companyId = sub.metadata?.company_id;
      if (!companyId) break;

      await dynamo.updateCompany(companyId, { subscription_status: 'past_due' });
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
