// app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../lib/stripe';

export async function POST(req: NextRequest) {
  const { items, customerEmail } = await req.json();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_URL || 'https://itemssycrafts.com';

  const lineItems = items.map((item: any) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${item.title} — ${item.type === 'digital' ? 'Digital Download' : 'Printed & Shipped'}`,
        metadata: { product_id: item.id, type: item.type },
      },
      unit_amount: Math.round(item.price * 100),
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
      items: JSON.stringify(items.map((i: any) => ({ id: i.id, type: i.type, quantity: i.quantity }))),
    },
    shipping_address_collection: items.some((i: any) => i.type === 'physical')
      ? { allowed_countries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'CZ', 'SK'] }
      : undefined,
  });

  return NextResponse.json({ url: session.url });
}