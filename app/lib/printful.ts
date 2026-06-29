// app/lib/printful.ts

const PRINTFUL_API_URL = 'https://api.printful.com';

export async function createPrintfulOrder(order: {
  recipient: {
    name: string;
    email: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  items: {
    sync_variant_id: string;
    quantity: number;
  }[];
}) {
  const res = await fetch(`${PRINTFUL_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient: order.recipient, items: order.items }),
  });

  if (!res.ok) throw new Error('Printful order failed');
  return res.json();
}