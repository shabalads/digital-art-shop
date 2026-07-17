// app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../lib/stripe';
import { supabaseAdmin } from '../../lib/supabase';
import { createPrintifyOrder } from '../../lib/printify';
import { createGelatoOrder } from '../../lib/gelato';
import { sendDigitalOrderEmail } from '../../lib/resend';

// Printify's "Fine Art Posters" / Print Clever blueprint only covers 5 of
// our 10 site sizes (confirmed via scripts/printify-discover.js real
// catalog data — no 5x7, no portrait 8x10, no ISO sizes at all). Per user
// decision (2026-07-15): US/CA orders route to Printify ONLY when the item
// actually has a printify_variant_id; everything else — non-US/CA
// countries, and any of the 5 sizes Printify doesn't offer regardless of
// country — routes to Gelato, which has real, correctly-dimensioned
// products for all 10 sizes. This is enforced below purely by checking
// whether printify_variant_id is present, since scripts/printify-bulk-create.js
// only ever writes it for the 5 sizes Printify supports.
const PRINTIFY_ELIGIBLE_COUNTRIES = new Set(['US', 'CA']);

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

    // Idempotency guard — Stripe may redeliver this event (retries, manual
    // resend, etc.); never double-insert the same order.
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({ received: true, duplicate: true });
    }

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
              // Never fall back to image_url — that's just the preview
              // thumbnail, not the real deliverable. Emailing it would look
              // like the order succeeded while silently shipping the wrong
              // file. If digital_file_url is missing, leave downloadUrl
              // undefined so resolveDownloadUrl() shows the "shared shortly"
              // message instead, and log it loudly so it gets fixed.
              if (!product?.digital_file_url) {
                console.error(
                  `MISSING DIGITAL FILE: product ${item.id} ("${product?.title || 'unknown'}") has no digital_file_url — order ${order.id} will not include this download`
                );
              }
              return {
                title: product?.title || 'Digital download',
                downloadUrl: product?.digital_file_url || undefined,
              };
            }),
          siteUrl: process.env.NEXT_PUBLIC_URL || 'https://itemssycrafts.com',
        });
      }

      if (hasPhysical) {
        // As of Stripe API version 2025-03-31.basil, `shipping_details` moved
        // from the top-level Checkout Session object into
        // `collected_information.shipping_details`. This account is on
        // 2026-06-24.dahlia (see app/lib/stripe.ts), which is well past that
        // change, so the old top-level field is always undefined here — that
        // silently made `if (hasPhysical && session.shipping_details)` false
        // and skipped the whole fulfillment block with zero error output.
        // Source: https://docs.stripe.com/changelog/basil/2025-03-31/checkout-session-remove-shipping-details
        const shippingDetails = session.collected_information?.shipping_details || session.shipping_details;

        const physicalItems = items.filter((i: any) => i.type === 'physical');
        const customerEmail = session.customer_details?.email || session.customer_email || '';

        try {
          if (!shippingDetails?.address) {
            throw new Error(
              `No shipping_details found on session ${session.id} (checked collected_information.shipping_details ` +
              `and legacy shipping_details). Cannot create a physical order without an address.`
            );
          }

          const countryCode = (shippingDetails.address.country || '').toUpperCase();

          // Route by BOTH country and size availability — see the
          // PRINTIFY_ELIGIBLE_COUNTRIES comment above. printify_variant_id is
          // only ever set on an item when that size exists on Printify's
          // blueprint, so items for the 5 unsupported sizes fall through to
          // Gelato automatically even for US/CA customers.
          const printifyItems = physicalItems.filter(
            (i: any) => PRINTIFY_ELIGIBLE_COUNTRIES.has(countryCode) && i.printify_variant_id
          );
          const gelatoItems = physicalItems.filter((i: any) => !printifyItems.includes(i));

          // Record which provider(s) this order was ROUTED to, independent of
          // whether the attempt succeeded — so a failed order still shows
          // which provider needs attention in the dashboard, instead of
          // requiring a server log lookup to find out.
          const attemptedProviders: string[] = [];
          if (printifyItems.length > 0) attemptedProviders.push('printify');
          if (gelatoItems.length > 0) attemptedProviders.push('gelato');

          const recipient = {
            name: shippingDetails.name,
            email: customerEmail,
            phone: shippingDetails.phone || undefined,
            address1: shippingDetails.address.line1,
            address2: shippingDetails.address.line2 || undefined,
            city: shippingDetails.address.city,
            state_code: shippingDetails.address.state || '',
            country_code: countryCode,
            zip: shippingDetails.address.postal_code,
          };

          const providersUsed: string[] = [];
          const providerErrors: string[] = [];
          let printifyOrderId: string | null = null;
          let gelatoOrderId: string | null = null;

          if (printifyItems.length > 0) {
            try {
              const printifyOrder = await createPrintifyOrder({
                recipient,
                items: printifyItems.map((i: any) => ({
                  printify_variant_id: i.printify_variant_id,
                  quantity: i.quantity,
                })),
                externalId: String(order.id),
              });
              printifyOrderId = String(printifyOrder.id);
              providersUsed.push('printify');
            } catch (e) {
              console.error(`Printify order failed for order ${order.id}:`, e);
              providerErrors.push(`printify: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          if (gelatoItems.length > 0) {
            try {
              // Gelato's v4 order API takes a plain image URL per line item
              // (no pre-upload step, unlike Printify) — fetch each item's
              // image_url from products. Any failure here (missing image,
              // DB error, order creation error) is scoped to Gelato only —
              // it must NOT wipe out a Printify order that already succeeded
              // above, so it's caught in this same try/catch rather than
              // bubbling to the outer one.
              const gelatoProductIds = gelatoItems.map((i: any) => i.id);
              const { data: gelatoProducts = [] } = await supabaseAdmin
                .from('products')
                .select('id,image_url')
                .in('id', gelatoProductIds);
              const imageLookup = new Map((gelatoProducts as any[]).map((p) => [p.id, p.image_url]));

              const missingImages = gelatoItems.filter((i: any) => !imageLookup.get(i.id));
              if (missingImages.length > 0) {
                throw new Error(
                  `Missing image_url for product(s): ${missingImages.map((i: any) => i.id).join(', ')} — cannot submit to Gelato without artwork.`
                );
              }

              const gelatoOrder = await createGelatoOrder({
                recipient,
                items: gelatoItems.map((i: any) => ({
                  gelato_variant_id: i.gelato_variant_id,
                  image_url: imageLookup.get(i.id),
                  quantity: i.quantity,
                  itemReferenceId: `${order.id}-${i.id}`,
                })),
                orderReferenceId: String(order.id),
              });
              gelatoOrderId = String(gelatoOrder.id);
              providersUsed.push('gelato');
            } catch (e) {
              console.error(`Gelato order failed for order ${order.id}:`, e);
              providerErrors.push(`gelato: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          // fulfillment_provider = who was ATTEMPTED (set even on total
          // failure); printify_order_id/gelato_order_id only get a real
          // value from providersUsed, i.e. only if that specific provider
          // actually returned an order — no fake/placeholder IDs on failure.
          const fulfillmentProvider = attemptedProviders.length > 0 ? attemptedProviders.join('+') : null;
          const status =
            providerErrors.length === 0
              ? 'fulfilled'
              : providersUsed.length === 0
                ? 'failed'
                : 'partially_fulfilled';

          await supabaseAdmin
            .from('orders')
            .update({
              printify_order_id: printifyOrderId,
              gelato_order_id: gelatoOrderId,
              fulfillment_provider: fulfillmentProvider,
              status,
            })
            .eq('id', order.id);

          if (providerErrors.length > 0) {
            console.error(`Order ${order.id} had fulfillment errors: ${providerErrors.join(' | ')}`);
          }
        } catch (e) {
          console.error('Physical order routing failed:', e);
          await supabaseAdmin
            .from('orders')
            .update({ status: 'failed' })
            .eq('id', order.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}