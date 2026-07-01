// app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin } from '../../lib/supabase';
import { createPrintfulOrder } from '../../lib/printful';
import { sendDigitalOrderEmail } from '../../lib/resend';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const items = JSON.parse(session.metadata.items || '[]');
    const hasPhysical = items.some((i: any) => i.type === 'physical');
    const hasDigital = items.some((i: any) => i.type === 'digital');

    const { data: order } = await supabaseAdmin
      .from('orders')
      .insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email || session.customer_email || '',
        type: hasPhysical && hasDigital ? 'physical' : hasPhysical ? 'physical' : 'digital',
        status: 'paid',
        total: session.amount_total / 100,
      })
      .select()
      .single();

    if (order) {
      await supabaseAdmin.from('order_items').insert(
        items.map((i: any) => ({
          order_id: order.id,
          product_id: i.id,
          type: i.type,
          price: i.price,
          quantity: i.quantity,
        }))
      );

      if (hasDigital) {
        const productIds = items.filter((item: any) => item.type === 'digital').map((item: any) => item.id);
        const { data: products = [] } = await supabaseAdmin
          .from('products')
          .select('id,title,digital_file_url,image_url')
          .in('id', productIds);

        const lookup = new Map((products as any[]).map((product) => [product.id, product]));

        await sendDigitalOrderEmail({
          customerEmail: session.customer_details?.email || session.customer_email || '',
          orderNumber: String(order.id),
          items: items
            .filter((item: any) => item.type === 'digital')
            .map((item: any) => {
              const product = lookup.get(item.id);
              return {
                title: product?.title || 'Digital download',
                downloadUrl: product?.digital_file_url || product?.image_url,
              };
            }),
          siteUrl: process.env.NEXT_PUBLIC_URL || 'https://itemssycrafts.com',
        });
      }

      if (hasPhysical && session.shipping_details) {
        const physicalItems = items.filter((i: any) => i.type === 'physical');
        try {
          const printfulOrder = await createPrintfulOrder({
            recipient: {
              name: session.shipping_details.name,
              email: session.customer_details?.email || session.customer_email || '',
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