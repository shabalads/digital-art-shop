// app/lib/reviewMatch.ts
//
// Fuzzy word-overlap matcher used to suggest candidate products for a
// customer review whose productName doesn't exist verbatim in the live
// catalog — Etsy listings get retitled over time (see the "Sardine
// Painting" bestseller, confirmed 2026-07-27: now lives under a completely
// different title with zero literal text overlap with the old one).
//
// Ported 1:1 from the one-off Python script used to build the original
// needs_review.csv, so scores are directly comparable to that file's
// candidate1/2/3_score columns.

const STOPWORDS = new Set(
  `wall art print painting decor digital download printable poster illustration
   for and the a of in on with room bedroom living gallery home style set prints
   your inspired classic modern soft bold vintage`
    .split(/\s+/)
    .filter(Boolean)
);

function normalizeWords(s: string): string[] {
  let t = s.toLowerCase();
  t = t.replace(/\(.*?\)/g, ' '); // strip parentheticals
  t = t.replace(/[|–—,/]/g, ' ');
  t = t.replace(/[^a-z0-9 ]/g, ' ');
  return t.split(/\s+/).filter((w) => w && !STOPWORDS.has(w) && w.length > 2);
}

// Some review productName values reference multiple items from one order,
// e.g. "Wildflower Field Landscape / Spring Landscape Print / Pink
// Wildflower Field (3 items, one order)" — match against the first segment.
export function primaryReviewName(productName: string): string {
  const cleaned = productName.replace(/\(\d+ items?, one order\)/i, '').trim();
  const segments = cleaned.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  return segments[0] || cleaned;
}

export function scoreMatch(reviewName: string, productTitle: string): number {
  const rwords = new Set(normalizeWords(reviewName));
  const pwords = new Set(normalizeWords(productTitle));
  if (rwords.size === 0) return 0;

  let overlap = 0;
  rwords.forEach((w) => {
    if (pwords.has(w)) overlap++;
  });

  const union = new Set([...rwords, ...pwords]);
  const jaccard = union.size ? overlap / union.size : 0;
  const coverage = overlap / rwords.size;

  const rn = reviewName.toLowerCase().trim();
  const pt = productTitle.toLowerCase();
  const mainClause = rn.split(/[|/]/)[0].trim();
  const substrBonus = mainClause.length > 6 && pt.includes(mainClause) ? 0.5 : 0;

  return coverage * 0.7 + jaccard * 0.3 + substrBonus;
}

export type ProductLite = {
  id: string;
  title: string;
  image_url: string | null;
  price_digital: number | null;
};

export function topCandidates(reviewProductName: string, products: ProductLite[], n = 3) {
  const primary = primaryReviewName(reviewProductName);
  return products
    .map((p) => ({ product: p, score: scoreMatch(primary, p.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((r) => ({ ...r.product, score: Math.round(r.score * 1000) / 1000 }));
}
