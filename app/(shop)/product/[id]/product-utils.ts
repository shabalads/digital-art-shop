// app/(shop)/product/[id]/product-utils.ts
//
// Shared between the server page.tsx (generateMetadata needs the exact same
// cleaned title/description Google will also see rendered on the page) and
// ProductPageClient.tsx (on-page display). Kept in one place so the two
// never drift apart — previously this logic lived only inline in the old
// fully-client page.tsx.

// Clean title — truncate at first pipe, dash or comma after ~20 chars,
// strip trailing filler words, cap at 60 chars on a word boundary.
export function cleanTitle(raw: string): string {
  if (!raw) return '';
  const separators = [' | ', ' – ', ' - ', ', '];
  let cleaned = raw;
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
  }
  // Strip whole trailing filler phrases, longest first, so "Fish Wall Art
  // Print" becomes "Fish" — not "Fish Wall" (which is what stripping just
  // "Art Print" used to leave behind).
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned
      .replace(/\s*(Wall Art Prints?|Art Prints?|Wall Art|Printable|Posters?|Prints?|Digital Download|Download|Digital)$/i, '')
      .trim();
  } while (cleaned !== prev && cleaned.length > 0);
  if (!cleaned) cleaned = raw.split(' | ')[0].trim();
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 60).split(' ').slice(0, -1).join(' ');
  }
  return cleaned;
}

// Title for <title>/og:title — the full first segment of the listing title
// ("Sardines Fish Wall Art Print"), keeping the "wall art print" keywords
// people actually search for that cleanTitle() strips for on-page display.
export function seoTitle(raw: string): string {
  if (!raw) return '';
  let first = raw.split(/ \| | – | - /)[0].trim();
  const comma = first.indexOf(', ');
  if (first.length > 60 && comma > 20) first = first.substring(0, comma);
  if (first.length > 60) first = first.substring(0, 60).split(' ').slice(0, -1).join(' ');
  return first;
}

// Meta description: the real listing copy when there is some, otherwise a
// sentence built from the listing title's own keyword segments — unique per
// product either way, never empty.
export function metaDescription(rawTitle: string, rawDescription: string): string {
  const desc = cleanDescription(rawDescription).replace(/\s+/g, ' ');
  const text = desc || `${rawTitle.split(/ \| | – /).map((s) => s.trim()).filter(Boolean).join('. ')}. Instant digital download or printed and shipped.`;
  if (text.length <= 160) return text;
  return text.substring(0, 157).split(' ').slice(0, -1).join(' ') + '…';
}

// Clean description — strip Etsy template boilerplate ("WHAT YOU'LL
// RECEIVE", file-size lists, etc.) so only the real descriptive copy is
// left. Returns '' if nothing meaningful remains.
export function cleanDescription(raw: string): string {
  if (!raw) return '';
  const cutMarkers = [
    '𝗗𝗜𝗚𝗜𝗧𝗔𝗟', 'DIGITAL WALL ART', 'DIGITAL DOWNLOAD', '⬇︎', '** WHAT YOU',
    '•• WHAT YOU', 'WHAT YOU\'LL RECEIVE', 'FILE SIZES', '300dpi',
    'HOW TO DOWNLOAD', 'IMPORTANT NOTES', 'PERSONAL USE ONLY',
    '𝐅𝐈𝐋𝐄', '𝐖𝐇𝐀𝐓', '- ••', '••', '**', '| ⬇'
  ];
  // Etsy listings open with a header line ("𝗗𝗜𝗚𝗜𝗧𝗔𝗟 𝗪𝗔𝗟𝗟 𝗔𝗥𝗧 | ⬇︎ 𝗣𝗟𝗘𝗔𝗦𝗘 𝗥𝗘𝗔𝗗
  // 𝗗𝗘𝗧𝗔𝗜𝗟𝗦 ⬇︎") that itself contains cut markers — drop it first, or the
  // cut below lands at position 0 and throws away the real copy after it.
  const lines = raw.split('\n');
  while (lines.length > 0 && (!lines[0].trim() || /⬇|𝗗𝗜𝗚𝗜𝗧𝗔𝗟|PLEASE READ/i.test(lines[0]))) lines.shift();
  let cleaned = lines.join('\n');
  // Cut at the earliest boilerplate marker, wherever it is in the text.
  const cutAt = Math.min(...cutMarkers.map((m) => cleaned.indexOf(m)).filter((i) => i >= 0), cleaned.length);
  cleaned = cleaned.substring(0, cutAt).trim();
  cleaned = cleaned.replace(/^[\s\-|•·▪►]+/, '').replace(/[\s\-|•·▪►]+$/, '').trim();
  if (cleaned.length < 20) return '';
  return cleaned;
}
