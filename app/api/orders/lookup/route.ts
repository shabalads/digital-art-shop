// app/api/orders/lookup/route.ts
//
// Narrow, customer-facing lookup used only by /success to know whether the
// order that was just placed contains digital items, physical items, or
// both — so that page can show only the "what happens next" steps that
// actually apply instead of always showing both regardless of what was
// bought. Deliberately returns nothing beyond two booleans: no email, no
// address, no line-item detail. The Stripe checkout session_id already in
// the customer's own success URL is the only thing needed to look this up
// (same trust model the success page already uses that id for — clearing
// the cart and showing the order ref).
//
// orders.type collapses "physical-only" and "mixed digital+physical" into
// the same 'physical' value (see app/api/webhook/route.ts), so it can't
// answer "does this order ALSO have digital items" on its own — reading
// order_items directly is what makes both booleans independently correct,
// including for mixed orders.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('type')
    .eq('order_id', order.id);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const hasDigital = (items || []).some((i) => i.type === 'digital');
  const hasPhysical = (items || []).some((i) => i.type === 'physical');

  return NextResponse.json({ hasDigital, hasPhysical });
}
