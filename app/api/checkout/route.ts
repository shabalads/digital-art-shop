// app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../lib/stripe';
import { convert } from '../../lib/currency';

export async function POST(req: NextRequest) {
  const { items, customerEmail, currency } = await req.json();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 });
  }

  const selectedCurrency = currency === 'eur' ? 'eur' : 'usd';

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_URL || 'https://itemssycrafts.com';
  const hasPhysical = items.some((i: any) => i.type === 'physical');

  // Flat-rate shipping, converted into whichever currency the customer picked.
  // TODO: swap these placeholder USD amounts for real Printful shipping costs
  // once we have that data.
  // NOTE: both options are shown to every physical checkout regardless of
  // country — customer picks the one that matches them. A more robust version
  // would use pre-created Stripe Shipping Rate objects with country
  // `restrictions` to auto-hide the wrong one.
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

  const lineItems = items.map((item: any) => ({
    price_data: {
      currency: selectedCurrency,
      product_data: {
        name: `${item.title} — ${item.type === 'digital' ? 'Digital Download' : 'Printed & Shipped'}`,
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
      // printify_variant_id / gelato_variant_id must survive this round-trip
      // exactly like printful_variant_id did — the webhook reads them back
      // out of session.metadata.items to decide Printify vs Gelato routing
      // (see PRINTIFY_ELIGIBLE_COUNTRIES in app/api/webhook/route.ts) and to
      // build each provider's order.
      //
      // Also restoring `price` here — the webhook's order_items insert reads
      // `i.price` from this same parsed metadata, but it was never actually
      // included in this object, so every order_items row has had a missing
      // price this whole time. Same failure class as the past dropped-variant
      // bug (a field silently absent from this JSON with no error anywhere),
      // just not one this task introduced — fixing it now since this is
      // exactly the object being audited for that.
      items: JSON.stringify(items.map((i: any) => ({
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
  });

  return NextResponse.json({ url: session.url });
}