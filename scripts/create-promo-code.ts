// scripts/create-promo-code.ts
//
// Creates the reusable THANKYOU15 promo code sent in the Etsy review
// thank-you message (see scripts/data/review-thankyou-message.txt) — 15%
// off, all products, no minimum, no expiry, reusable by anyone who has the
// code. Created via the Stripe API (not the dashboard) so it's
// reproducible across environments (test key / live key) without manual
// clicking.
//
// Idempotent: if a promotion code with this exact code already exists,
// logs that and exits without creating a duplicate coupon — safe to re-run.
//
// ============================================================================
// HOW TO RUN
// ============================================================================
//   1. export $(grep -v '^#' .env.local | grep '=' | xargs)
//   2. npx tsx scripts/create-promo-code.ts
// ============================================================================

import { stripe } from '../app/lib/stripe';

const PROMO_CODE = 'THANKYOU15';
const PERCENT_OFF = 15;

async function main() {
  const existing = await stripe.promotionCodes.list({ code: PROMO_CODE, limit: 1 });

  if (existing.data.length > 0) {
    const code = existing.data[0];
    const couponRef = code.promotion.coupon;
    const couponId = typeof couponRef === 'string' ? couponRef : couponRef?.id ?? 'unknown';
    console.log(
      `Promotion code "${PROMO_CODE}" already exists (id: ${code.id}, active: ${code.active}, coupon: ${couponId}). Nothing to do.`
    );
    return;
  }

  // duration: 'once' is the correct value here even though this code isn't
  // used on a subscription — this site's Stripe integration only ever
  // creates Checkout Sessions in `mode: 'payment'` (see
  // app/api/checkout/route.ts), so `duration` never actually recurs.
  // Leaving out `max_redemptions` and `expires_at` entirely is what makes
  // the CODE permanent and reusable by anyone who has it, independent of
  // this field.
  const coupon = await stripe.coupons.create({
    percent_off: PERCENT_OFF,
    duration: 'once',
    name: 'Thank you for your review — 15% off',
  });

  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: PROMO_CODE,
    active: true,
    // No max_redemptions, no expires_at, no minimum_amount restriction —
    // permanent, unlimited use, no minimum, applies to all products.
  });

  console.log(`Created coupon ${coupon.id} and promotion code "${promotionCode.code}" (id: ${promotionCode.id}).`);
  console.log(`Customers can now enter "${PROMO_CODE}" at checkout for ${PERCENT_OFF}% off, no expiry.`);
}

main().catch((err) => {
  console.error('Failed to create promo code:', err);
  process.exit(1);
});
