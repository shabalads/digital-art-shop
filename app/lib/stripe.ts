// app/lib/stripe.ts

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_LIVE;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

export const isLiveMode = stripeSecretKey.startsWith('sk_live_') || process.env.STRIPE_LIVE_MODE === 'true';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-06-24.dahlia',
});