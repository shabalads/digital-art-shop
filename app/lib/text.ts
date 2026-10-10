// app/lib/text.ts
//
// Shared text-cleanup helpers. cleanProductTitle() started life inside
// ProductCard.tsx (shortening long raw Etsy titles like "Blue Heron Marsh
// Fine Art Print | Abstract Bird Oil Painting | Grandmillennial Coastal
// Decor | Elegant Wall Art | Gift for Nature Lovers" down to "Blue Heron
// Marsh Fine Art") — moved here so ReviewCard can reuse the exact same
// logic for review product_name display, instead of showing the raw
// multi-clause title some reviews were imported with.

export function cleanProductTitle(raw: string): string {
  if (!raw) return '';
  const separators = [' | ', ' – ', ' - ', ', '];
  let cleaned = raw;
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
  }
  cleaned = cleaned.replace(/\s*(Print|Poster|Wall Art|Printable|Digital|Download|Art Print)$/i, '').trim();
  if (cleaned.length > 50) cleaned = cleaned.substring(0, 50).split(' ').slice(0, -1).join(' ');
  return cleaned;
}


// How a reviewer is shown publicly: first name only, "Verified Buyer" when
// the name is missing/anonymous. Lives here (not in ReviewCard, a client
// component) so server code — the product page's JSON-LD — can use the exact
// same rule and the markup always matches what's visible on the page.
export function displayFirstName(reviewerName: string | null | undefined): string {
  const cleaned = (reviewerName || '').replace(/[()]/g, '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'anonymous') return 'Verified Buyer';
  return cleaned.split(/\s+/)[0];
}
