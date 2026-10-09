// app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '../../lib/stripe';
import { convert } from '../../lib/currency';
import { supabaseAdmin } from '../../lib/supabase';
import { PHYSICAL_SIZES } from '../../data/physical-sizes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stripe caps each metadata value at 500 characters, so the items JSON is
// split across `items`, `items_1`, `items_2`, … (the webhook joins them back).
const METADATA_CHUNK = 500;

export async function POST(req: NextRequest) {
  const { items, customerEmail, currency, promoCode } = await req.json();

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 });
  }

  const selectedCurrency = currency === 'eur' ? 'eur' : 'usd';
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_URL || 'https://www.itemssyprints.com';

  // ── SERVER-SIDE PRICING ──────────────────────────────────────────────────
  // The browser only tells us which product, digital vs physical, which
  // size and how many. Price, title and fulfilment variant ids all come from
  // the database / PHYSICAL_SIZES — never from the request — so a tampered
  // cart can't buy prints for $0.01 or swap in a bigger print's variant.
  const ids = [...new Set(items.map((i: any) => String(i?.id ?? '')))].filter((id) => UUID_RE.test(id));
  const { data: rows, error: productsError } = ids.length
    ? await supabaseAdmin
        .from('products')
        .select('id, title, price_digital, active, deleted_at, printful_variants, printify_variants, gelato_variants')
        .in('id', ids)
    : { data: [], error: null };
  if (productsError) return NextResponse.json({ error: 'Could not load products' }, { status: 500 });
  const byId = new Map((rows || []).map((p: any) => [p.id, p]));

  const resolved: any[] = [];
  for (const raw of items) {
    const product: any = byId.get(String(raw?.id ?? ''));
    if (!product || !product.active || product.deleted_at) {
      return NextResponse.json({ error: 'Some items in your cart are no longer available.' }, { status: 400 });
    }
    const quantity = Math.min(Math.max(Math.floor(Number(raw.quantity) || 1), 1), 20);

    if (raw.type === 'physical') {
      const size = PHYSICAL_SIZES.find((s) => s.label === raw.size);
      if (!size) return NextResponse.json({ error: 'Unknown print size.' }, { status: 400 });
      resolved.push({
        id: product.id,
        title: product.title,
        type: 'physical',
        price: size.price,
        quantity,
        printful_variant_id: product.printful_variants?.[size.key] ?? null,
        printify_variant_id: product.printify_variants?.[size.key] ?? null,
        gelato_variant_id: product.gelato_variants?.[size.key] ?? null,
      });
    } else {
      resolved.push({
        id: product.id,
        title: product.title,
        type: 'digital',
        price: Number(product.price_digital),
        quantity,
        printful_variant_id: null,
        printify_variant_id: null,
        gelato_variant_id: null,
      });
    }
  }
  const hasPhysical = resolved.some((i) => i.type === 'physical');

  // ── BUNDLE DISCOUNT ──────────────────────────────────────────────────────
  // Every full group of 3 digital prints → the cheapest of that group is
  // free. Same rule the cart page shows (app/(shop)/cart/page.tsx), applied
  // here so it's actually enforced, not just a UI message.
  const digitalItems = resolved.filter((i) => i.type === 'digital');
  const physicalItems = resolved.filter((i) => i.type === 'physical');
  const sortedDigital = [...digitalItems].sort((a, b) => a.price - b.price);
  const freeItems = new Set<any>();
  for (let i = 0; i + 2 < sortedDigital.length; i += 3) freeItems.add(sortedDigital[i]);
  const processedDigital = digitalItems.map((item) =>
    freeItems.has(item) ? { ...item, price: 0, originalPrice: item.price, isFreeBundle: true } : item
  );

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
    metadata: chunkMetadata(JSON.stringify(allItems.map((i: any) => ({
      id: i.id,
      type: i.type,
      price: i.price,
      quantity: i.quantity,
      printful_variant_id: i.printful_variant_id ?? null,
      printify_variant_id: i.printify_variant_id ?? null,
      gelato_variant_id: i.gelato_variant_id ?? null,
    })))),
    shipping_address_collection: hasPhysical
      ? { allowed_countries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'CZ', 'SK'] }
      : undefined,
    shipping_options: shippingOptions,
    ...(discounts ? { discounts } : { allow_promotion_codes: allowPromotionCodes }),
  });

  return NextResponse.json({ url: session.url });
}

function chunkMetadata(itemsJson: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (let start = 0, n = 0; start < itemsJson.length; start += METADATA_CHUNK, n++) {
    metadata[n === 0 ? 'items' : `items_${n}`] = itemsJson.slice(start, start + METADATA_CHUNK);
  }
  return metadata;
}
