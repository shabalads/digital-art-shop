// app/lib/printify.ts

const PRINTIFY_API_URL = 'https://api.printify.com/v1';

async function printifyRequest(method: 'GET' | 'POST', pathSuffix: string, body?: unknown) {
  const res = await fetch(`${PRINTIFY_API_URL}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'User-Agent': 'digital-art-shop-webhook',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Printify ${method} ${pathSuffix} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Confirmed via real testing (2026-07-15): calling send_to_production
// immediately after order creation can fail with a 400 (code 8502,
// "not allowed to sent order to production with status pending") even with
// a fully valid address — Printify's backend needs a short, variable amount
// of time after creation to finish internal processing before the order
// leaves "pending". There's no documented fixed delay for this, so instead
// of guessing a sleep duration, poll the order's real status and only
// proceed once it has actually left "pending".
const ORDER_READY_POLL_MAX_ATTEMPTS = 5;
const ORDER_READY_POLL_INTERVAL_MS = 1500;

async function waitForOrderReady(shopId: string, orderId: string): Promise<void> {
  let lastStatus: string | undefined;

  for (let attempt = 1; attempt <= ORDER_READY_POLL_MAX_ATTEMPTS; attempt++) {
    const order = await printifyRequest('GET', `/shops/${shopId}/orders/${orderId}.json`);
    lastStatus = order?.status;

    if (lastStatus && lastStatus !== 'pending') {
      return;
    }

    if (attempt < ORDER_READY_POLL_MAX_ATTEMPTS) {
      await sleep(ORDER_READY_POLL_INTERVAL_MS);
    }
  }

  throw new Error(
    `Printify order ${orderId} never left "pending" status after ${ORDER_READY_POLL_MAX_ATTEMPTS} ` +
    `poll attempts (~${(ORDER_READY_POLL_MAX_ATTEMPTS * ORDER_READY_POLL_INTERVAL_MS) / 1000}s). ` +
    `Last observed status: ${lastStatus ?? 'unknown'}. Not calling send_to_production — order ` +
    `${orderId} exists in Printify but was left in "pending"; check it manually in the Printify dashboard.`
  );
}

let cachedShopId: string | null = null;
async function getShopId(): Promise<string> {
  if (process.env.PRINTIFY_SHOP_ID) return process.env.PRINTIFY_SHOP_ID;
  if (cachedShopId) return cachedShopId;
  const shops = await printifyRequest('GET', '/shops.json');
  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error('No Printify shops connected to this API key.');
  }
  cachedShopId = shops[0].id;
  return cachedShopId as string;
}

// A printify_variants[sizeKey] value is stored as "productId:variantId"
// (see scripts/printify-bulk-create.js — Printify variant_ids are constant
// catalog IDs shared across all our products, so the product_id half is the
// part that's actually product-specific).
function parseVariantRef(ref: string): { productId: string; variantId: number } {
  const [productId, variantIdStr] = ref.split(':');
  const variantId = parseInt(variantIdStr, 10);
  if (!productId || Number.isNaN(variantId)) {
    throw new Error(`Malformed printify_variant_id "${ref}" — expected "productId:variantId".`);
  }
  return { productId, variantId };
}

export async function createPrintifyOrder(order: {
  recipient: {
    name: string;
    email: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  items: {
    printify_variant_id: string; // "productId:variantId"
    quantity: number;
  }[];
  externalId: string;
}) {
  const shopId = await getShopId();

  // Printify orders can mix line items from different products — each line
  // item specifies its own product_id + variant_id independently.
  const lineItems = order.items.map((i) => {
    const { productId, variantId } = parseVariantRef(i.printify_variant_id);
    return { product_id: productId, variant_id: variantId, quantity: i.quantity };
  });

  // Split recipient name into first/last — Printify's address_to requires
  // both separately, unlike Printful/Stripe which give us one combined
  // "name" string. Heuristic: everything but the last word is the first
  // name. Not perfect for all name formats, but there's no better signal
  // available from Stripe's shipping_details.
  const nameParts = order.recipient.name.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
  const firstName = nameParts.join(' ') || order.recipient.name;

  const createBody = {
    external_id: order.externalId,
    label: order.externalId,
    line_items: lineItems,
    shipping_method: 1, // standard shipping
    send_shipping_notification: false,
    address_to: {
      first_name: firstName,
      last_name: lastName,
      email: order.recipient.email,
      phone: order.recipient.phone || '',
      country: order.recipient.country_code,
      region: order.recipient.state_code,
      address1: order.recipient.address1,
      address2: order.recipient.address2 || '',
      city: order.recipient.city,
      zip: order.recipient.zip,
    },
  };

  const draftOrder = await printifyRequest('POST', `/shops/${shopId}/orders.json`, createBody);

  if (!draftOrder?.id) {
    throw new Error(`Printify order creation returned no id: ${JSON.stringify(draftOrder)}`);
  }

  // Wait for the order to actually leave "pending" before attempting to send
  // it to production — see waitForOrderReady() comment above for why this is
  // necessary (confirmed via real 8502 errors during testing, not a guess).
  await waitForOrderReady(shopId, draftOrder.id);

  // CRITICAL — confirmed via scripts/printify-discover.js research: creating
  // an order only creates a DRAFT. It will NOT enter production until this
  // separate call is made. Do not remove this step.
  await printifyRequest('POST', `/shops/${shopId}/orders/${draftOrder.id}/send_to_production.json`);

  return draftOrder;
}
