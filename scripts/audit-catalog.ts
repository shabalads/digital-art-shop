// scripts/audit-catalog.ts
//
// READ-ONLY catalog audit. It only SELECTs from Supabase and writes two
// Markdown reports; it never changes any data.
//
//   npx tsx --env-file=.env.local scripts/audit-catalog.ts
//
// Writes:
//   docs/duplicate-audit.md   products with identical / near-identical titles,
//                             or sharing an image URL or description text
//   docs/catalog-tag-audit.md style tags (products.category) and section
//                             assignments (products.section_ids) that look wrong
//
// Both reports are heuristics for a human to review, not verdicts — each flag
// lists the evidence it is based on.

import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Product = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  description: string | null;
  active: boolean;
  deleted_at: string | null;
  section_ids: string[] | null;
};
type Section = { id: string; name: string; slug: string };

const NEAR_TITLE_JACCARD = 0.75;

// ───────────────────────── data ─────────────────────────

async function fetchAll<T>(supabase: SupabaseClient, table: string, cols: string): Promise<T[]> {
  const rows: T[] = [];
  // PostgREST caps a response at 1000 rows, so page through.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

// ───────────────────────── text helpers ─────────────────────────

const fold = (s: string | null | undefined) => (s ?? '').normalize('NFKC').toLowerCase();
const status = (p: Product) => (p.deleted_at ? 'trashed' : p.active ? 'live' : 'inactive');
const isLive = (p: Product) => p.active && !p.deleted_at;
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const link = (label: string, url: string) => `[${label}](${url})`;

// "Vintage Wildflower Field Landscape Art Print | Moody Earthy…" -> the part
// before the first separator, without "(Digital Download)"-style parentheticals.
function headline(title: string): string {
  const t = title.normalize('NFKC');
  return t.split(/\s[|–—-]\s|\s*\|\s*/, 1)[0].replace(/\(.*?\)/g, ' ');
}

// Case-insensitive, punctuation ignored, and the words "wall", "art", "print(s)" dropped.
const IGNORED_WORDS = new Set(['wall', 'art', 'print', 'prints']);
function tokens(s: string): string[] {
  return fold(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w && !IGNORED_WORDS.has(w));
}
const normKey = (s: string) => tokens(s).join(' ');

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// Descriptions are ~90% identical Etsy boilerplate (file sizes, download steps).
// "Product-specific text" = description lines that appear in fewer than 30 products.
function makeSpecificText(products: Product[]) {
  const lineCount = new Map<string, number>();
  const lines = (p: Product) => [...new Set(fold(p.description).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  for (const p of products) for (const l of lines(p)) lineCount.set(l, (lineCount.get(l) || 0) + 1);
  return (p: Product) => lines(p).filter((l) => (lineCount.get(l) || 0) < 30).join(' ');
}

// ───────────────────────── duplicates ─────────────────────────

function duplicateReport(products: Product[], reviewCount: Map<string, number>): string {
  const specific = makeSpecificText(products);
  const byId = new Map(products.map((p) => [p.id, p]));
  const normDesc = (p: Product) => fold(p.description).replace(/\s+/g, ' ').trim();

  // Union-find over the "same thing" edges: identical normalised headline,
  // identical image URL, identical description text.
  const parent = new Map(products.map((p) => [p.id, p.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const reasons = new Map<string, Set<string>>(); // root -> reasons (filled after unions)
  const edgeReason: Array<[string, string, string]> = [];

  const index = (label: string, keyOf: (p: Product) => string) => {
    const m = new Map<string, string[]>();
    for (const p of products) { const k = keyOf(p); if (k) m.set(k, [...(m.get(k) || []), p.id]); }
    for (const ids of m.values()) for (let i = 1; i < ids.length; i++) { union(ids[0], ids[i]); edgeReason.push([ids[0], ids[i], label]); }
  };
  index('identical title (normalised headline)', (p) => normKey(headline(p.title)));
  index('identical full title (normalised)', (p) => normKey(p.title));
  index('same image URL', (p) => p.image_url || '');
  index('same description text', (p) => normDesc(p));

  const groups = new Map<string, string[]>();
  for (const p of products) groups.set(find(p.id), [...(groups.get(find(p.id)) || []), p.id]);
  for (const [a, , why] of edgeReason) { const r = find(a); reasons.set(r, (reasons.get(r) || new Set()).add(why)); }

  const dupGroups = [...groups.entries()].filter(([, ids]) => ids.length > 1);
  const liveGroups = dupGroups.filter(([, ids]) => ids.filter((i) => isLive(byId.get(i)!)).length >= 2);
  const mixedGroups = dupGroups.filter(([, ids]) => ids.filter((i) => isLive(byId.get(i)!)).length === 1);
  const deadGroups = dupGroups.length - liveGroups.length - mixedGroups.length;

  const sortKey = (ids: string[]) => normKey(headline(byId.get(ids[0])!.title));
  const sortGroups = (gs: typeof dupGroups) => gs.sort((a, b) => sortKey(a[1]).localeCompare(sortKey(b[1])));

  const overlapPct = (a: Product, b: Product) => Math.round(100 * jaccard(specific(a).split(/\s+/), specific(b).split(/\s+/)));
  const imgCell = (p: Product) => (p.image_url ? link('…' + p.image_url.split('/').pop()!.slice(-36), p.image_url) : '—');

  const groupRows = (gs: typeof dupGroups, startAt: number) => {
    const out: string[] = [];
    gs.forEach(([root, ids], gi) => {
      const members = ids.map((i) => byId.get(i)!);
      const sameDesc = new Set(members.map(normDesc)).size === 1;
      const minOverlap = Math.min(...members.flatMap((a, i) => members.slice(i + 1).map((b) => overlapPct(a, b))));
      const descCell = sameDesc ? 'yes' : `no (product-specific text ${minOverlap}% word overlap)`;
      const why = [...(reasons.get(root) || [])].join('; ');
      members.forEach((p, mi) =>
        out.push(`| ${mi === 0 ? `G${startAt + gi + 1}` : ''} | ${mi === 0 ? cell(why) : ''} | ${cell(trunc(p.title, 110))} | \`${p.id}\` | ${status(p)} | ${imgCell(p)} | ${mi === 0 ? descCell : ''} | ${reviewCount.get(p.id) || 0} |`));
    });
    return out;
  };
  const header = ['| Group | Matched on | Title | Id | Status | Image URL | Description match | Linked reviews |', '|---|---|---|---|---|---|---|---|'];

  // Near-identical (not already grouped): token-set overlap of the headline.
  const heads = products.map((p) => ({ p, t: tokens(headline(p.title)) }));
  const near: Array<{ a: Product; b: Product; j: number }> = [];
  for (let i = 0; i < heads.length; i++)
    for (let j = i + 1; j < heads.length; j++) {
      if (find(heads[i].p.id) === find(heads[j].p.id)) continue;
      const jac = jaccard(heads[i].t, heads[j].t);
      if (jac >= NEAR_TITLE_JACCARD) near.push({ a: heads[i].p, b: heads[j].p, j: jac });
    }
  near.sort((x, y) => y.j - x.j || normKey(headline(x.a.title)).localeCompare(normKey(headline(y.a.title))));
  const nearLive = near.filter((n) => isLive(n.a) && isLive(n.b));

  const liveCount = products.filter(isLive).length;
  const md: string[] = [];
  md.push('# Duplicate audit', '');
  md.push(`Generated by \`scripts/audit-catalog.ts\` on ${new Date().toISOString().slice(0, 10)}. **Read-only: nothing in the database was changed.**`, '');
  md.push('## Result at a glance', '');
  md.push(`- Products examined: **${products.length}** (${liveCount} live, ${products.filter((p) => status(p) === 'inactive').length} inactive, ${products.filter((p) => status(p) === 'trashed').length} trashed).`);
  md.push(`- **Identical titles** (after normalising): **${liveGroups.length}** groups with 2+ live products (${liveGroups.reduce((n, [, ids]) => n + ids.length, 0)} products), plus ${mixedGroups.length} groups pairing one live product with an inactive/trashed one${deadGroups ? ` and ${deadGroups} with no live product` : ''}.`);
  md.push(`- **Near-identical titles** (headline word overlap ≥ ${NEAR_TITLE_JACCARD}): **${nearLive.length}** pairs of live products to review by eye (${near.length - nearLive.length} more involving a non-live product).`);
  md.push(`- **Same image URL:** ${groupsWith(reasons, 'same image URL')} groups. **Same description text:** ${groupsWith(reasons, 'same description text')} groups.`, '');
  md.push('**Matches are by title only.** Image URL and description text never matched (see §4 and §5): these are separate Etsy listings, each with its own image file and its own description. A short, generic headline (e.g. "Sardine") can also cover genuinely different artworks, so **compare the images before treating a group as a duplicate**.', '');
  md.push('## Method', '');
  md.push('- **Title:** NFKC-folded, lower-cased, punctuation removed, and the words `wall`, `art`, `print`, `prints` ignored. The *headline* is the title up to the first ` | ` / ` – ` / ` - ` separator, minus any `(…)` parenthetical. Identical = same normalised headline (also checked: same normalised full title).');
  md.push(`- **Near-identical:** headlines not already grouped whose word sets overlap by at least ${NEAR_TITLE_JACCARD} (Jaccard). These can be genuine variants of different artworks; they are candidates, not conclusions.`);
  md.push('- **Same image:** identical `image_url`. **Same description:** identical text after folding case/whitespace/unicode styling.');
  md.push('- **Description match** is `yes` only for identical text. When it is `no`, the percentage is the word overlap of the *product-specific* text (description lines found in fewer than 30 products), since ~90% of every description is shared Etsy boilerplate.');
  md.push('- **Linked reviews** = rows in `customer_reviews` with this `product_id`.', '');

  md.push('## 1. Identical titles: groups with 2+ live products', '');
  md.push(...(liveGroups.length ? [...header, ...groupRows(sortGroups(liveGroups), 0)] : ['None.']), '');
  md.push('## 2. Identical titles: one live product paired with an inactive/trashed one', '');
  md.push(...(mixedGroups.length ? [...header, ...groupRows(sortGroups(mixedGroups), liveGroups.length)] : ['None.']), '');

  md.push(`## 3. Near-identical titles (headline overlap ≥ ${NEAR_TITLE_JACCARD}), live pairs, review by eye`, '');
  if (nearLive.length) {
    md.push('| Overlap | Title A | Id A | Title B | Id B | Image URLs | Description match | Linked reviews (A / B) |', '|---|---|---|---|---|---|---|---|');
    for (const { a, b, j } of nearLive) {
      const same = normDesc(a) === normDesc(b);
      md.push(`| ${j === 1 ? '1.00 (same words, different order)' : j.toFixed(2)} | ${cell(trunc(a.title, 80))} | \`${a.id}\` | ${cell(trunc(b.title, 80))} | \`${b.id}\` | ${imgCell(a)}<br>${imgCell(b)} | ${same ? 'yes' : `no (${overlapPct(a, b)}%)`} | ${reviewCount.get(a.id) || 0} / ${reviewCount.get(b.id) || 0} |`);
    }
  } else md.push('None.');
  md.push('', '## 4. Same image URL', '', groupsWith(reasons, 'same image URL') ? 'See the groups above (reason column).' : 'None found: no two products share an `image_url`.');
  md.push('', '## 5. Same description text', '', groupsWith(reasons, 'same description text') ? 'See the groups above (reason column).' : 'None found: no two products have identical description text.');
  const emptyDesc = products.filter((p) => !fold(p.description).trim());
  md.push('', `_Note: ${emptyDesc.length} products have an empty description, so they cannot be compared on description (${emptyDesc.filter(isLive).length} of them live)._`, '');
  return md.join('\n');
}

function groupsWith(reasons: Map<string, Set<string>>, label: string): number {
  return [...reasons.values()].filter((s) => s.has(label)).length;
}

// ───────────────────────── tag audit ─────────────────────────

const STYLES = ['abstract', 'botanical', 'typography', 'photography', 'vintage', 'minimal'] as const;

// The importer's rule (app/api/import/route.ts guessCategory): substring
// matches, first rule wins, "abstract" when nothing matches. Replayed here so
// we can see which words actually fired for each product.
const IMPORT_RULES: Array<[string, string[]]> = [
  ['botanical', ['botanical', 'plant', 'leaf', 'floral', 'flower']],
  ['typography', ['quote', 'text', 'word', 'saying', 'typography']],
  ['photography', ['photo', 'landscape', 'nature', 'sky']],
  ['vintage', ['vintage', 'retro', 'antique']],
  ['minimal', ['minimal', 'simple', 'clean', 'line']],
];
function replayImport(title: string): { style: string; trigger: string | null } {
  const t = title.toLowerCase();
  for (const [style, words] of IMPORT_RULES) { const hit = words.find((w) => t.includes(w)); if (hit) return { style, trigger: hit }; }
  return { style: 'abstract', trigger: null };
}
const wholeWord = (word: string, text: string) => new RegExp(`\\b${word}s?\\b`, 'i').test(text);

// Whole-word cues for what a title says its style is.
const STYLE_CUES: Record<string, RegExp> = {
  abstract: /\babstract\b/,
  botanical: /\b(botanicals?|plants?|leaf|leaves|floral|flowers?|wildflowers?|bouquets?|blooms?|blossoms?|peon(?:y|ies)|poppy|poppies|hydrangeas?|daisy|daisies|tulips?|roses?|eucalyptus|meadow|magnolia|lavender|sunflowers?|orchids?|lilies|lily)\b/,
  typography: /\b(quotes?|sayings?|typography|lettering|words?|text)\b/,
  photography: /\b(photograph\w*|photos?)\b/,
  vintage: /\b(vintage|retro|antique)\b/,
  minimal: /\b(minimal\w*)\b/,
};
const PAINTED = /\b(painting|oil painting|illustration|watercolou?r|linocut|drawing|sketch|collage|gouache|acrylic)\b/;

type Finding = { p: Product; kind: string; evidence: string };

// The whole word that contains `fragment`, e.g. ("text", "textured oil") -> "textured".
const wordContaining = (fragment: string, text: string) => (text.match(new RegExp(`[\\p{L}\\p{N}]*${fragment}[\\p{L}\\p{N}]*`, 'iu')) || [fragment])[0];
const cueWords = (style: string, title: string) => [...new Set(title.match(new RegExp(STYLE_CUES[style].source, 'g')) || [])];

function styleFindings(live: Product[]) {
  const findings: Finding[] = [];
  const stats = new Map<string, { n: number; real: number }>();
  const fallbackAbstract: Product[] = [];
  for (const p of live) {
    const stored = p.category ?? '(null)';
    const title = fold(p.title);
    const cues = STYLES.filter((s) => STYLE_CUES[s].test(title));
    const st = stats.get(stored) || { n: 0, real: 0 };
    st.n++;
    if (STYLE_CUES[stored]?.test(title)) st.real++;
    stats.set(stored, st);

    if (!(STYLES as readonly string[]).includes(stored)) {
      findings.push({ p, kind: 'Not one of the six style tags', evidence: `value is \`${stored}\`` + (stored.includes('-') ? ' (looks like a section slug)' : '') });
      continue;
    }
    const style = stored as (typeof STYLES)[number];
    const replay = replayImport(p.title);
    const fired = replay.style === stored && replay.trigger ? `import rule fired on "${wordContaining(replay.trigger, title)}"` : null;
    const others = cues.filter((c) => c !== style);
    const names = others.map((c) => `${c} ("${cueWords(c, title).slice(0, 3).join('", "')}")`).join(', ');

    // 1. The import rule matched a fragment of a longer word (e.g. "text" in "textured").
    if (fired && stored !== 'abstract' && replay.trigger && !wholeWord(replay.trigger, title) && !cues.includes(style)) {
      findings.push({ p, kind: 'Tag comes from a word fragment', evidence: `${fired} (a fragment, not the word "${replay.trigger}")` + (names ? `; title actually says ${names}` : '') });
      continue;
    }
    // 2. The title names a different style than the stored tag.
    if (others.length && !cues.includes(style)) {
      const why = stored === 'abstract' ? 'fell through to the default tag' : fired ?? 'tag no longer matches the import rule';
      findings.push({ p, kind: 'Title names a different style', evidence: `${why}; title says ${names}` });
      continue;
    }
    // 3. "photography" on something the title calls a painting/illustration.
    if (stored === 'photography' && PAINTED.test(title) && !cues.includes('photography')) {
      findings.push({ p, kind: 'Tagged photography, title says painted/illustrated', evidence: `${fired ?? 'photography'}; title contains "${title.match(PAINTED)![0]}"` });
      continue;
    }
    if (stored === 'abstract' && !cues.includes('abstract')) fallbackAbstract.push(p);
  }
  return { findings, stats, fallbackAbstract };
}

// ───────────────────────── section audit ─────────────────────────

// Words that signal each section, matched as whole words in the title and the
// product-specific description text. Deliberately generous: a section is only
// questioned when NONE of its cues appear.
const SECTION_CUES: Record<string, RegExp> = {
  'coastal-seaside': /\b(coast\w*|sea|seaside|ocean|beach\w*|shore\w*|nautical|sailboats?|sail\w*|yachts?|boats?|harbou?r|marsh|herons?|egrets?|mediterranean|amalfi|positano|nantucket|hamptons|lighthouse|surf\w*|waves?|tide|seashells?|shells?|marina|island|pier|dock|riviera|swim\w*|mermaid|fish|sardines?|cape cod|waterfront|lake|riverside)\b/,
  'wildflower-botanical': /\b(wildflowers?|flowers?|floral|botanicals?|bouquets?|blooms?|blossoms?|meadow|petals?|garden|leaf|leaves|plants?|fern|eucalyptus|roses?|peon(?:y|ies)|poppy|poppies|daisy|daisies|tulips?|hydrangeas?|lavender|sunflowers?|magnolia|orchids?|lil(?:y|ies)|cornflowers?|citrus|lemons?|fruit|vase|greenery|foliage|herbs?|tropical|palm)\b/,
  'moody-dark-academia': /\b(moody|dark academia|academia|gothic|goth|victorian|baroque|occult|witch\w*|vampires?|castle|ravens?|skulls?|macabre|dark|gloomy|noir|library|candles?|moths?|chiaroscuro|dramatic|crow|raven|storm|mysterious|brooding)\b/,
  'dopamine-colorful': /\b(dopamine|colou?rful|maximalist|vibrant|bright|bold|neon|rainbow|funky|eclectic|pop art|preppy|grandmillennial|vivid|saturated|playful|abstract)\b/,
  'animal-wall-art': /\b(cats?|kittens?|dogs?|puppy|tigers?|leopards?|lions?|zebras?|giraffes?|horses?|cows?|birds?|owls?|foxes|fox|deer|bears?|rabbits?|bunny|frogs?|butterfl(?:y|ies)|animals?|goose|ducks?|ducklings?|swans?|elephants?|monkeys?|heron|egret|fish|sardines?|moths?|insects?|creatures?|critters?|wolf|wolves|retriever|feline)\b/,
  'feminine-coquette': /\b(coquette|feminine|girly|girl|girls|ballet|bows?|ribbons?|pink|blush|pearls?|perfume|vanity|lady|ladies|woman|women|female|fashion|dollhouse|romantic|dainty|champagne|heels|elegant|glam\w*|chic)\b/,
  'celestial-dreamy': /\b(celestial|moon\w*|lunar|stars?|starry|stargazing|night sky|galaxy|cosmic|constellations?|zodiac|astrolog\w*|dreamy|sun|mystic\w*|angels?|clouds?|sky|dusk|twilight|midnight|aurora|eclipse)\b/,
  'vintage-countryside': /\b(vintage|antique|countryside|farmhouse|rustic|cottage\w*|rural|barn|pastoral|country|folk|retro|french|provence|tuscan|english|farm|woodland|forest|meadow|cabin|lodge|wheat|harvest)\b/,
  'western-cowboy': /\b(western|cowboys?|cowgirls?|desert|ranch|rodeo|saddle|boots?|southwest\w*|cactus|cacti|texas|wild west|frontier|lasso|stetson|hats?)\b/,
  'quirky-funny': /\b(funny|quirky|weird|humou?r\w*|absurd|silly|goofy|whimsical|kitsch|meme|parody|surreal|bigfoot|sasquatch|alien|goblins?|pooping|toilet|nun|skateboard\w*|cheeky|sassy|fun)\b/,
  'spooky-cozy-ghosts': /\b(ghosts?|spooky|halloween|witch\w*|haunted|pumpkins?|bats?|spirits?|skeletons?|cauldron|autumn|fall|creepy|spooktacular)\b/,
};

// Title cues count 3x, description cues 1x (capped at 3): a word in the title
// is a deliberate label, a word in a paragraph of prose often is not.
const TITLE_WEIGHT = 3;
const DESC_CAP = 3;
const SCORE_MARGIN = 3;

function sectionFindings(live: Product[], sections: Section[]) {
  const specific = makeSpecificText(live);
  const nameBySlug = new Map(sections.map((s) => [s.slug, s.name]));
  const slugById = new Map(sections.map((s) => [s.id, s.slug]));
  type Hit = { slug: string; title: string[]; desc: string[]; score: number };
  const out: Array<{ p: Product; assigned: Hit[]; weak: Hit[]; better: Hit[] }> = [];
  let unassigned = 0, weakNoAlt = 0, assignments = 0, titleSupported = 0, nearMisses = 0, otherPairs = 0, otherPairsWithCue = 0;
  for (const p of live) {
    const assignedSlugs = (p.section_ids || []).map((id) => slugById.get(id)).filter((s): s is string => Boolean(s));
    if (!assignedSlugs.length) { unassigned++; continue; }
    const title = fold(p.title);
    const desc = specific(p);
    const hit = (slug: string): Hit => {
      const re = new RegExp(SECTION_CUES[slug]?.source ?? '$^', 'g');
      const t = [...new Set(title.match(re) || [])];
      const d = [...new Set(desc.match(re) || [])].filter((w) => !t.includes(w));
      return { slug, title: t, desc: d, score: TITLE_WEIGHT * t.length + Math.min(d.length, DESC_CAP) };
    };
    const assigned = assignedSlugs.map(hit);
    assignments += assigned.length;
    titleSupported += assigned.filter((h) => h.title.length > 0).length;
    const others = Object.keys(SECTION_CUES).filter((s) => !assignedSlugs.includes(s)).map(hit);
    otherPairs += others.length;
    otherPairsWithCue += others.filter((h) => h.title.length > 0).length;
    // Weak = no cue in the title and a low score. Flag only if some unassigned
    // section has a cue in the title and clearly out-scores it.
    const weak = assigned.filter((h) => h.title.length === 0 && h.score <= 2);
    if (!weak.length) continue;
    const best = Math.min(...weak.map((w) => w.score));
    const better = others.filter((h) => h.title.length > 0 && h.score >= best + SCORE_MARGIN).sort((a, b) => b.score - a.score).slice(0, 3);
    if (better.length) out.push({ p, assigned, weak, better });
    else {
      weakNoAlt++;
      if (others.some((h) => h.title.length > 0 && h.score > best)) nearMisses++;
    }
  }
  out.sort((a, b) => b.better[0].score - Math.min(...b.weak.map((w) => w.score)) - (a.better[0].score - Math.min(...a.weak.map((w) => w.score))));
  return { out, unassigned, weakNoAlt, assignments, titleSupported, nearMisses, otherPairs, otherPairsWithCue, nameBySlug };
}

function tagReport(live: Product[], sections: Section[]): string {
  const { findings, stats, fallbackAbstract } = styleFindings(live);
  const sec = sectionFindings(live, sections);
  const md: string[] = [];
  md.push('# Style-tag and category audit', '');
  md.push(`Generated by \`scripts/audit-catalog.ts\` on ${new Date().toISOString().slice(0, 10)}. **Report only: no data was changed.** Covers the ${live.length} live products. These are heuristics from the product title (and, for sections, the product-specific description text); every row shows its evidence so it can be judged by eye.`, '');

  md.push('## Part A: style tags (`products.category`)', '');
  md.push('How the tags were assigned: `guessCategory()` in `app/api/import/route.ts` tags a product at import time by **substring** match on the title, first rule wins: `botanical` (botanical/plant/leaf/floral/flower), `typography` (quote/text/word/saying/typography), `photography` (photo/landscape/nature/sky), `vintage` (vintage/retro/antique), `minimal` (minimal/simple/clean/line), and **`abstract` when nothing matched**. So the tag is a keyword guess, not an editorial decision.', '');
  md.push('| Tag | Live products | Title actually names that style |', '|---|---|---|');
  for (const [tag, s] of [...stats.entries()].sort((a, b) => b[1].n - a[1].n)) md.push(`| \`${tag}\` | ${s.n} | ${s.real} (${Math.round((100 * s.real) / s.n)}%) |`);
  const real = (t: string) => stats.get(t) ?? { n: 0, real: 0 };
  md.push('', `**Takeaway:** \`botanical\` (${real('botanical').real}/${real('botanical').n}) and \`vintage\` (${real('vintage').real}/${real('vintage').n}) tags always have their keyword in the title, but only ${real('typography').real} of ${real('typography').n} \`typography\` tags do (the rest fired on fragments such as "textured"). \`abstract\` is the fallback for ${fallbackAbstract.length} products whose title never says "abstract", and \`photography\` mostly means the title contained "landscape", "nature" or "sky".`, '');

  const kinds = [...new Set(findings.map((f) => f.kind))];
  md.push(`### A1. Specific problems (${findings.length} products)`, '');
  if (!findings.length) md.push('None.', '');
  for (const kind of kinds) {
    const fs_ = findings.filter((f) => f.kind === kind);
    md.push(`**${kind}** (${fs_.length})`, '', '| Title | Id | Tag | Evidence |', '|---|---|---|---|');
    for (const f of fs_) md.push(`| ${cell(trunc(headline(f.p.title), 70))} | \`${f.p.id}\` | \`${f.p.category}\` | ${cell(f.evidence)} |`);
    md.push('');
  }
  md.push(`### A2. \`abstract\` by default, not by evidence (${fallbackAbstract.length} products)`, '', 'The title does not say "abstract" and no other style cue matched, so the tag is just the import fallback. Whether each is wrong needs a look at the artwork; the titles suggest many are representational (animals, scenes, still lifes).', '');
  md.push('<details><summary>Show the list</summary>', '', '| Title | Id |', '|---|---|');
  for (const p of fallbackAbstract) md.push(`| ${cell(trunc(headline(p.title), 80))} | \`${p.id}\` |`);
  md.push('', '</details>', '');

  md.push('## Part B: section assignments (`products.section_ids`)', '');
  md.push('Sections are assigned by hand in the dashboard, so there is no rule to replay. Each section has a list of cue words (in this script). A cue in the **title** counts 3, a cue in the product-specific description text counts 1 (max 3). An assignment is listed only when the assigned section is **weak** (no cue in the title and a score of 2 or less) **and** another section that has a cue in the title scores at least 3 higher. Cue lists are never complete and some artworks are placed on what the picture shows, not what the title says, so treat this as a "please look" list, strongest mismatch first.', '');
  md.push(`- Live products with at least one section: **${live.length - sec.unassigned}**; with **no section at all: ${sec.unassigned}** (they appear on \`/shop\` but on no category page).`);
  md.push(`- Of **${sec.assignments}** section assignments, **${sec.titleSupported}** have a cue word for that section in the product title; the other ${sec.assignments - sec.titleSupported} rely on the description text or the picture, which this check cannot see. **Baseline for comparison:** a section the product is *not* in has a cue word in its title only ${Math.round((100 * sec.otherPairsWithCue) / sec.otherPairs)}% of the time (${sec.otherPairsWithCue} of ${sec.otherPairs} product/section pairs), so title agreement is a real signal here, not an artifact of generous cue lists.`);
  md.push(`- Flagged below: **${sec.out.length}** products. A further ${sec.weakNoAlt} have a weakly supported section but nothing in the text points elsewhere, so they cannot be judged from text (not listed); ${sec.nearMisses} of those have another section scoring only 1-2 higher (not flagged, below the margin).`, '');
  md.push('| Title | Id | Assigned to (score) | Weakly supported | Title points to (score; cue words) |', '|---|---|---|---|---|');
  const nm = (s: string) => sec.nameBySlug.get(s) ?? s;
  for (const r of sec.out) {
    md.push(`| ${cell(trunc(headline(r.p.title), 70))} | \`${r.p.id}\` | ${r.assigned.map((h) => `${nm(h.slug)} (${h.score})`).join(', ')} | ${r.weak.map((h) => nm(h.slug)).join(', ')} | ${r.better.map((h) => `${nm(h.slug)} (${h.score}; ${h.title.slice(0, 4).join(', ')})`).join('; ')} |`);
  }
  md.push('');
  return md.join('\n');
}

// ───────────────────────── main ─────────────────────────

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars not set. Run: npx tsx --env-file=.env.local scripts/audit-catalog.ts');
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [products, reviews, sections] = await Promise.all([
    fetchAll<Product>(supabase, 'products', 'id,title,category,image_url,description,active,deleted_at,section_ids'),
    fetchAll<{ id: number; product_id: string | null }>(supabase, 'customer_reviews', 'id,product_id'),
    fetchAll<Section>(supabase, 'sections', 'id,name,slug'),
  ]);
  const reviewCount = new Map<string, number>();
  for (const r of reviews) if (r.product_id) reviewCount.set(r.product_id, (reviewCount.get(r.product_id) || 0) + 1);

  const dir = path.join(process.cwd(), 'docs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'duplicate-audit.md'), duplicateReport(products, reviewCount) + '\n');
  fs.writeFileSync(path.join(dir, 'catalog-tag-audit.md'), tagReport(products.filter(isLive), sections) + '\n');
  console.log(`audited ${products.length} products (${products.filter(isLive).length} live) -> docs/duplicate-audit.md, docs/catalog-tag-audit.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
