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

// 512 -> "512", 1234 -> "1,234". Fixed locale so server and client render the
// same text. Used to show the live print count (see app/lib/catalog.ts, which
// is server-only — this lives here so client components can import it).
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

// "512 prints" when the live count is known, otherwise just "prints" — so copy
// degrades to wording without a number if the count couldn't be loaded, never
// to a made-up one.
export function countPhrase(count: number | null | undefined, noun: string): string {
  return count == null ? noun : `${formatCount(count)} ${noun}`;
}
