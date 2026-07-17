// app/lib/currency.ts

// Fixed manual conversion rate — you control this, no Stripe conversion fee passed to customer.
// Update periodically to track real EUR/USD rates.
export const USD_TO_EUR_RATE = 0.92;

export function convert(usdAmount: number, currency: 'usd' | 'eur'): number {
  return currency === 'eur' ? usdAmount * USD_TO_EUR_RATE : usdAmount;
}

export function currencySymbol(currency: 'usd' | 'eur'): string {
  return currency === 'eur' ? '€' : '$';
}