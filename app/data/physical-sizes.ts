// app/data/physical-sizes.ts
//
// Printed-and-shipped sizes and their prices (USD). Shared by the product
// page (what the customer sees and picks) and app/api/checkout/route.ts
// (what Stripe actually charges) so the two can never disagree — checkout
// must never trust a price sent by the browser.
//
// `key` here MUST match the size keys used in products.printful_variants /
// printify_variants / gelato_variants (written by scripts/*-bulk-create.js)
// — this is how we look up the right variant id for whatever size the
// customer picks.
export const PHYSICAL_SIZES = [
  { label: '5×7"', key: '5x7', price: 19.99, popular: false },
  { label: '8×10"', key: '8x10', price: 24.99, popular: true },
  { label: '8×12"', key: '8x12', price: 26.99, popular: false },
  { label: '11×14"', key: '11x14', price: 34.99, popular: true },
  { label: 'A4', key: 'a4', price: 22.99, popular: false },
  { label: 'A3', key: 'a3', price: 32.99, popular: false },
  { label: '16×20"', key: '16x20', price: 44.99, popular: false },
  { label: '18×24"', key: '18x24', price: 54.99, popular: false },
  { label: 'A2', key: 'a2', price: 49.99, popular: false },
  { label: '24×36"', key: '24x36', price: 69.99, popular: false },
];
