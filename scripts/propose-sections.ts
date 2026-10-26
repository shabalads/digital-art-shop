// scripts/propose-sections.ts
//
// READ-ONLY. Proposes a section for each live product that is in no section, for a
// human to approve. It only SELECTs from Supabase and writes a CSV; it never
// updates a product or a section.
//
//   npx tsx --env-file=.env.local scripts/propose-sections.ts
//
// Writes docs/proposed-section-assignments.csv (one row per unsectioned product).
//
// Method. Two independent signals, both from the product TITLE (weight 3 per word) and
// the product-specific part of its DESCRIPTION (weight 1; ~90% of a description is
// shared Etsy boilerplate, which is dropped):
//   1. a Naive Bayes model trained on the products that ALREADY have sections, i.e. it
//      imitates the assignments you made;
//   2. a hand-written cue-word list per section (scripts/lib/section-cues.ts).
// The proposal is the model's top section. How far to trust it is read off a 10-fold
// cross-validation on the sectioned products (each scored by a model that never saw
// it), computed on every run and printed:
//   agree     the cue list picks the same section
//   disagree  it does not (the cue list's pick and the model's second choice are listed)
// Tested and not used: the style tag (slightly hurt accuracy) and the merchandising tags
// Bestseller/Trending/... (no topical meaning, +0.3 points = noise).

import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CATEGORY_LINKS } from '../app/data/categories';
import { SECTION_CUES } from './lib/section-cues';

type Product = { id: string; title: string; description: string | null; category: string | null; section_ids: string[] | null; active: boolean; deleted_at: string | null };
type Section = { id: string; name: string; slug: string };
type Feat = Map<string, number>;
type Example = { p: Product; f: Feat; labels: Set<string> };

const SLUGS = CATEGORY_LINKS.map((c) => c.slug);
const NAME = new Map(CATEGORY_LINKS.map((c) => [c.slug, c.name]));
const fold = (s: string | null | undefined) => (s ?? '').normalize('NFKC').toLowerCase();
const headline = (t: string) => t.normalize('NFKC').split(/\s[|–—-]\s|\s*\|\s*/, 1)[0].replace(/\(.*?\)/g, ' ').trim();
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const STOP = new Set('the and for with from this that these those your you our are was were has have into onto about wall art print prints printable digital download decor poster one two its their than then them they what when where which while will would can could not but all any each more most other some such only own same too very just also like'.split(' '));

async function fetchAll<T>(supabase: SupabaseClient, table: string, cols: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from(table).select(cols).order('id').range(from, from + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 500) break;
  }
  return rows;
}

const words = (s: string) => (fold(s).match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w));

function makeSpecific(products: Product[]) {
  const lines = (p: Product) => [...new Set(fold(p.description).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  const count = new Map<string, number>();
  for (const p of products) for (const l of lines(p)) count.set(l, (count.get(l) || 0) + 1);
  return (p: Product) => lines(p).filter((l) => (count.get(l) || 0) < 30).join(' ');
}

// ---- Naive Bayes (multinomial, Laplace-smoothed) ----
type Model = { cnt: Map<string, Map<string, number>>; total: Map<string, number>; n: Map<string, number>; vocab: Set<string>; docs: number };
function train(rows: Example[]): Model {
  const m: Model = { cnt: new Map(SLUGS.map((s) => [s, new Map()])), total: new Map(SLUGS.map((s) => [s, 0])), n: new Map(SLUGS.map((s) => [s, 0])), vocab: new Set(), docs: 0 };
  for (const { f, labels } of rows) for (const s of labels) {
    m.n.set(s, m.n.get(s)! + 1); m.docs++;
    for (const [w, c] of f) { m.cnt.get(s)!.set(w, (m.cnt.get(s)!.get(w) || 0) + c); m.total.set(s, m.total.get(s)! + c); m.vocab.add(w); }
  }
  return m;
}
function rank(m: Model, f: Feat, alpha = 0.5): Array<[string, number]> {
  const V = m.vocab.size;
  const out: Array<[string, number]> = [];
  for (const s of SLUGS) {
    if (!m.n.get(s)) continue;
    let lp = Math.log(m.n.get(s)! / m.docs);
    for (const [w, c] of f) if (m.vocab.has(w)) lp += c * Math.log(((m.cnt.get(s)!.get(w) || 0) + alpha) / (m.total.get(s)! + alpha * V));
    out.push([s, lp]);
  }
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

// ---- cue list ----
function cuePick(p: Product, specific: (p: Product) => string) {
  const title = fold(p.title), desc = specific(p);
  let best: { slug: string; score: number; title: string[]; desc: string[] } | null = null;
  for (const slug of SLUGS) {
    const re = new RegExp(SECTION_CUES[slug].source, 'g');
    const t = [...new Set(title.match(re) || [])];
    const d = [...new Set(desc.match(re) || [])].filter((w) => !t.includes(w));
    const score = 3 * t.length + Math.min(d.length, 3);
    if (score > 0 && (!best || score > best.score)) best = { slug, score, title: t, desc: d };
  }
  return best;
}
const cuesFor = (slug: string, p: Product, specific: (p: Product) => string) => {
  const re = new RegExp(SECTION_CUES[slug].source, 'g');
  const t = [...new Set(fold(p.title).match(re) || [])], d = [...new Set(specific(p).match(re) || [])].filter((w) => !t.includes(w));
  return [t.length ? `title: ${t.join(', ')}` : '', d.length ? `description: ${d.join(', ')}` : ''].filter(Boolean).join(' | ');
};

function mulberry32(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars not set. Run: npx tsx --env-file=.env.local scripts/propose-sections.ts');
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [all, sections] = await Promise.all([
    fetchAll<Product>(supabase, 'products', 'id,title,description,category,section_ids,active,deleted_at'),
    fetchAll<Section>(supabase, 'sections', 'id,name,slug'),
  ]);
  const live = all.filter((p) => p.active && !p.deleted_at);
  const specific = makeSpecific(live);
  const slugById = new Map(sections.map((s) => [s.id, s.slug]));
  const feat = (p: Product): Feat => { const f: Feat = new Map(); for (const w of words(p.title)) f.set(w, (f.get(w) || 0) + 3); for (const w of words(specific(p))) f.set(w, (f.get(w) || 0) + 1); return f; };
  const ex = (p: Product): Example => ({ p, f: feat(p), labels: new Set((p.section_ids || []).map((id) => slugById.get(id)).filter((s): s is string => Boolean(s) && SLUGS.includes(s as string))) });

  const labelled = live.map(ex).filter((e) => e.labels.size > 0);
  const todo = live.filter((p) => !(p.section_ids || []).length).map(ex);

  // 10-fold cross-validation on the sectioned products: how much to trust the model, by agreement tier.
  const rand = mulberry32(1);
  const order = labelled.map((_, i) => i).sort(() => rand() - 0.5);
  const K = 10;
  const stat = { agree: { n: 0, ok: 0 }, disagree: { n: 0, ok: 0, top2: 0 }, all: { n: 0, ok: 0 } };
  for (let k = 0; k < K; k++) {
    const test = order.filter((_, i) => i % K === k), testSet = new Set(test);
    const model = train(order.filter((i) => !testSet.has(i)).map((i) => labelled[i]));
    for (const i of test) {
      const { p, f, labels } = labelled[i];
      const r = rank(model, f), top = r[0][0], cue = cuePick(p, specific);
      const ok = labels.has(top);
      stat.all.n++; if (ok) stat.all.ok++;
      if (cue && cue.slug === top) { stat.agree.n++; if (ok) stat.agree.ok++; }
      else { stat.disagree.n++; if (ok) stat.disagree.ok++; if (ok || labels.has(r[1][0])) stat.disagree.top2++; }
    }
  }
  const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))}%`;
  console.log(`Cross-validation on the ${labelled.length} products that already have sections (each scored by a model that never saw it):`);
  console.log(`  model's top pick is one of the real sections: ${pct(stat.all.ok, stat.all.n)}`);
  console.log(`  model and cue list AGREE:    ${stat.agree.n} products (${pct(stat.agree.n, stat.all.n)}), shared pick correct ${pct(stat.agree.ok, stat.agree.n)}`);
  console.log(`  model and cue list DISAGREE: ${stat.disagree.n} products (${pct(stat.disagree.n, stat.all.n)}), model's pick correct ${pct(stat.disagree.ok, stat.disagree.n)}, model's top-2 contains a real section ${pct(stat.disagree.top2, stat.disagree.n)}`);

  // Propose for the unsectioned products with a model trained on ALL sectioned ones.
  const model = train(labelled);
  const agreeLabel = `agree (~${pct(stat.agree.ok, stat.agree.n)} right in cross-validation)`;
  const disagreeLabel = `disagree (~${pct(stat.disagree.ok, stat.disagree.n)} right in cross-validation; check the alternatives)`;
  const rows = [['product_id', 'url', 'title', 'style_tag', 'confidence', 'proposed_section', 'proposed_section_name', 'evidence_for_proposed (cue words)', 'cue_list_pick', 'model_second_choice', 'approve (y / n / other slug)'].map(csvCell).join(',')];
  const joins: Record<string, number> = {};
  const tiers = { agree: 0, disagree: 0 };
  for (const { p, f } of todo.sort((a, b) => a.p.title.localeCompare(b.p.title))) {
    const r = rank(model, f), pick = r[0][0], second = r[1][0], cue = cuePick(p, specific);
    const agree = !!cue && cue.slug === pick;
    tiers[agree ? 'agree' : 'disagree']++;
    joins[pick] = (joins[pick] || 0) + 1;
    rows.push([p.id, `https://www.itemssyprints.com/product/${p.id}`, headline(p.title), p.category ?? '', agree ? agreeLabel : disagreeLabel, pick, NAME.get(pick) ?? '',
      cuesFor(pick, p, specific) || 'none: from the model only', cue ? `${cue.slug}` : 'none', second, ''].map(csvCell).join(','));
  }
  const out = path.join(process.cwd(), 'docs', 'proposed-section-assignments.csv');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, rows.join('\n') + '\n');

  console.log(`\nProposals for the ${todo.length} live products in no section -> docs/proposed-section-assignments.csv`);
  console.log(`  model and cue list agree: ${tiers.agree} | disagree: ${tiers.disagree}`);
  console.log('  products that would join each category page (current size -> proposed):');
  for (const slug of SLUGS) {
    const now = labelled.filter((e) => e.labels.has(slug)).length;
    console.log(`    ${(NAME.get(slug) ?? slug).padEnd(26)} ${String(now).padStart(3)} -> ${String(now + (joins[slug] || 0)).padStart(3)}  (+${joins[slug] || 0})`);
  }
  console.log('Nothing was written to the database.');
}

main().catch((e) => { console.error(e); process.exit(1); });
