// app/lib/gelato.ts

const GELATO_ORDER_API_URL = 'https://order.gelatoapis.com/v4';

export async function createGelatoOrder(order: {
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
    gelato_variant_id: string; // productUid, e.g. "flat_a4-8x12-inch_250-gsm-...-ver"
    image_url: string;
    quantity: number;
    itemReferenceId: string;
  }[];
  orderReferenceId: string;
}) {
  const nameParts = order.recipient.name.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
  const firstName = nameParts.join(' ') || order.recipient.name;

  const body = {
    orderType: 'order',
    orderReferenceId: order.orderReferenceId,
    customerReferenceId: order.recipient.email,
    currency: 'USD',
    items: order.items.map((i) => ({
      itemReferenceId: i.itemReferenceId,
      productUid: i.gelato_variant_id,
      files: [{ type: 'default', url: i.image_url }],
      quantity: i.quantity,
    })),
    shippingAddress: {
      firstName,
      lastName,
      addressLine1: order.recipient.address1,
      addressLine2: order.recipient.address2 || '',
      city: order.recipient.city,
      state: order.recipient.state_code || '',
      postCode: order.recipient.zip,
      country: order.recipient.country_code,
      email: order.recipient.email,
      phone: order.recipient.phone || '',
    },
  };

  const res = await fetch(`${GELATO_ORDER_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.GELATO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Gelato order creation failed: ${res.status} ${JSON.stringify(json)}`);
  }

  if (!json?.id) {
    throw new Error(`Gelato order creation returned no id: ${JSON.stringify(json)}`);
  }

  return json;
}
