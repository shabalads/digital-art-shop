// app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '../../lib/stripe';
import { convert } from '../../lib/currency';

export async function POST(req: NextRequest) {
  const { items, customerEmail, currency, promoCode } = await req.json();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 });
  }

  const selectedCurrency = currency === 'eur' ? 'eur' : 'usd';
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_URL || 'https://itemssyprints.com';
  const hasPhysical = items.some((i: any) => i.type === 'physical');

  // ── BUNDLE DISCOUNT ──────────────────────────────────────────────────────
  // Buy 3+ digital prints → cheapest one is free.
  // Applied server-side so it's actually enforced, not just a UI message.
  const digitalItems: any[] = items.filter((i: any) => i.type === 'digital');
  const physicalItems: any[] = items.filter((i: any) => i.type === 'physical');

  let processedDigital = digitalItems;

  if (digitalItems.length >= 3) {
    // Sort cheapest first, make cheapest one free
    const sorted = [...digitalItems].sort((a, b) => a.price - b.price);
    const freeItem = sorted[0];
    processedDigital = digitalItems.map((item: any) =>
      item.id === freeItem.id && item.size === freeItem.size
        ? { ...item, price: 0, originalPrice: item.price, isFreeBundle: true }
        : item
    );
  }

  const allItems = [...processedDigital, ...physicalItems];
  // ─────────────────────────────────────────────────────────────────────────

  // ── PROMO CODE ───────────────────────────────────────────────────────────
  // Stripe's Checkout Session accepts EITHER `discounts` (a specific,
  // pre-applied promotion code) OR `allow_promotion_codes: true` (a free-text
  // field on Stripe's own checkout page where the customer can type any
  // valid code) — never both on the same session, the API rejects that.
  //
  // Default: `allow_promotion_codes: true`, so THANKYOU15 (or any future
  // promo code created the same way, see scripts/create-promo-code.ts)
  // works automatically at checkout with zero code changes here.
  //
  // If the caller already knows which code to apply (e.g. a link from the
  // Etsy review thank-you message that pre-fills it), it can pass
  // `promoCode` in the request body and it gets pre-applied via `discounts`
  // instead — the customer doesn't have to retype it. If the code doesn't
  // resolve to an active Stripe promotion code for any reason, this falls
  // back to `allow_promotion_codes: true` rather than failing checkout.
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  let allowPromotionCodes = true;

  if (typeof promoCode === 'string' && promoCode.trim()) {
    try {
      const matches = await stripe.promotionCodes.list({ code: promoCode.trim(), active: true, limit: 1 });
      if (matches.data.length > 0) {
        discounts = [{ promotion_code: matches.data[0].id }];
        allowPromotionCodes = false; // discounts + allow_promotion_codes can't both be set
      } else {
        console.warn(`Checkout requested promoCode "${promoCode}" but no active Stripe promotion code matches it — falling back to allow_promotion_codes.`);
      }
    } catch (e) {
      console.error('Failed to look up promo code, falling back to allow_promotion_codes:', e);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const shippingOptions = hasPhysical
    ? [
        {
          shipping_rate_data: {
            type: 'fixed_amount' as const,
            fixed_amount: { amount: Math.round(convert(5.99, selectedCurrency) * 100), currency: selectedCurrency },
            display_name: 'Domestic shipping (US)',
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount' as const,
            fixed_amount: { amount: Math.round(convert(9.99, selectedCurrency) * 100), currency: selectedCurrency },
            display_name: 'International shipping',
          },
        },
      ]
    : undefined;

  const lineItems = allItems.map((item: any) => ({
    price_data: {
      currency: selectedCurrency,
      product_data: {
        name: item.isFreeBundle
          ? `${item.title} — Digital Download (FREE with bundle 🎁)`
          : `${item.title} — ${item.type === 'digital' ? 'Digital Download' : 'Printed & Shipped'}`,
        metadata: { product_id: item.id, type: item.type },
      },
      unit_amount: Math.round(convert(item.price, selectedCurrency) * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: customerEmail || undefined,
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: {
      items: JSON.stringify(allItems.map((i: any) => ({
        id: i.id,
        type: i.type,
        price: i.price,
        quantity: i.quantity,
        printful_variant_id: i.printful_variant_id ?? null,
        printify_variant_id: i.printify_variant_id ?? null,
        gelato_variant_id: i.gelato_variant_id ?? null,
      }))),
    },
    shipping_address_collection: hasPhysical
      ? { allowed_countries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'CZ', 'SK'] }
      : undefined,
    shipping_options: shippingOptions,
    ...(discounts ? { discounts } : { allow_promotion_codes: allowPromotionCodes }),
  });

  return NextResponse.json({ url: session.url });
}