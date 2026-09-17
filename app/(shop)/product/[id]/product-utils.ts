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
  cleaned = cleaned
    .replace(/\s*(Print|Poster|Wall Art|Printable|Digital|Download|Art Print)$/i, '')
    .trim();
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 60).split(' ').slice(0, -1).join(' ');
  }
  return cleaned;
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
  let cleaned = raw;
  for (const marker of cutMarkers) {
    const idx = cleaned.indexOf(marker);
    if (idx >= 0) {
      cleaned = cleaned.substring(0, idx).trim();
      break;
    }
  }
  cleaned = cleaned.replace(/^[\s\-|•·▪►]+/, '').replace(/[\s\-|•·▪►]+$/, '').trim();
  if (cleaned.length < 20) return '';
  return cleaned;
}
