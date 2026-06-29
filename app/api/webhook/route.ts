// app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin } from '../../lib/supabase';
import { createPrintfulOrder } from '../../lib/printful';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const items = JSON.parse(session.metadata.items || '[]');
    const hasPhysical = items.some((i: any) => i.type === 'physical');
    const hasDigital = items.some((i: any) => i.type === 'digital');

    // Save order to Supabase
    const { data: order } = await supabaseAdmin
      .from('orders')
      .insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details.email,
        type: hasPhysical && hasDigital ? 'physical' : hasPhysical ? 'physical' : 'digital',
        status: 'paid',
        total: session.amount_total / 100,
      })
      .select()
      .single();

    if (order) {
      // Save order items
      await supabaseAdmin.from('order_items').insert(
        items.map((i: any) => ({
          order_id: order.id,
          product_id: i.id,
          type: i.type,
          price: i.price,
          quantity: i.quantity,
        }))
      );

      // If physical items — create Printful order
      if (hasPhysical && session.shipping_details) {
        const physicalItems = items.filter((i: any) => i.type === 'physical');
        try {
          const printfulOrder = await createPrintfulOrder({
            recipient: {
              name: session.shipping_details.name,
              email: session.customer_details.email,
              address1: session.shipping_details.address.line1,
              city: session.shipping_details.address.city,
              state_code: session.shipping_details.address.state || '',
              country_code: session.shipping_details.address.country,
              zip: session.shipping_details.address.postal_code,
            },
            items: physicalItems.map((i: any) => ({
              sync_variant_id: i.printful_variant_id,
              quantity: i.quantity,
            })),
          });

          await supabaseAdmin
            .from('orders')
            .update({ printful_order_id: printfulOrder.result.id, status: 'fulfilled' })
            .eq('id', order.id);
        } catch (e) {
          console.error('Printful order failed:', e);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}