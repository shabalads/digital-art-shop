// scripts/check-category-content.ts
//
// Sanity check for the category pages (/shop/<slug>). The copy lives in code
// (app/data/category-copy.ts) but the sections it describes are edited in the
// dashboard, so the two can drift apart. This script catches that, and holds
// the copy to the rules it was written under.
//
// Read-only — it only SELECTs from Supabase.
//
//   npx tsx --env-file=.env.local scripts/check-category-content.ts
//
// Exits 1 if any ERROR is found (safe to wire into CI later); warnings don't fail.

import { createClient } from '@supabase/supabase-js';
import { CATEGORY_LINKS } from '../app/data/categories';
import { CATEGORY_COPY } from '../app/data/category-copy';

const INTRO_MIN_WORDS = 100;
const INTRO_MAX_WORDS = 150;
const DESCRIPTION_MAX_CHARS = 160;
const DESCRIPTION_MIN_CHARS = 70;
// Root layout appends " | ItemssyPrints" (16 chars) to every <title>; Google
// shows roughly the first 60 characters.
const TITLE_MAX_CHARS = 44;

const errors: string[] = [];
const warnings: string[] = [];
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function checkCopy() {
  const seen = { title: new Map<string, string>(), description: new Map<string, string>(), intro: new Map<string, string>() };

  for (const { slug } of CATEGORY_LINKS) {
    const copy = CATEGORY_COPY[slug];
    if (!copy) { errors.push(`${slug}: listed in CATEGORY_LINKS but has no entry in CATEGORY_COPY`); continue; }

    const words = wordCount(copy.intro);
    if (words < INTRO_MIN_WORDS || words > INTRO_MAX_WORDS) errors.push(`${slug}: intro is ${words} words (need ${INTRO_MIN_WORDS}-${INTRO_MAX_WORDS})`);
    if (copy.description.length > DESCRIPTION_MAX_CHARS) errors.push(`${slug}: description is ${copy.description.length} chars (max ${DESCRIPTION_MAX_CHARS})`);
    if (copy.description.length < DESCRIPTION_MIN_CHARS) errors.push(`${slug}: description is only ${copy.description.length} chars (min ${DESCRIPTION_MIN_CHARS})`);
    if (copy.title.length > TITLE_MAX_CHARS) errors.push(`${slug}: title is ${copy.title.length} chars (max ${TITLE_MAX_CHARS} so the full <title> fits ~60)`);

    for (const field of ['title', 'description', 'intro'] as const) {
      const key = copy[field].trim().toLowerCase();
      const other = seen[field].get(key);
      if (other) errors.push(`${slug}: ${field} is identical to ${other}'s`);
      else seen[field].set(key, slug);
    }
    console.log(`  ${slug.padEnd(22)} intro ${String(words).padStart(3)} words · description ${String(copy.description.length).padStart(3)} chars · title ${String(copy.title.length).padStart(2)} chars`);
  }

  for (const slug of Object.keys(CATEGORY_COPY)) {
    if (!CATEGORY_LINKS.some((l) => l.slug === slug)) errors.push(`${slug}: has copy in CATEGORY_COPY but is not listed in CATEGORY_LINKS (page would never be published)`);
  }
}

async function checkAgainstDatabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    warnings.push('Supabase env vars not set — skipped the database comparison. Run with --env-file=.env.local');
    return;
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: sections, error } = await supabase.from('sections').select('id, name, slug');
  if (error) { errors.push(`could not read sections: ${error.message}`); return; }

  // PostgREST caps a response at 1000 rows, so page through (same as sitemap.ts).
  const counts = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error: e } = await supabase.from('products').select('section_ids').eq('active', true).is('deleted_at', null).range(from, from + 999);
    if (e) { errors.push(`could not read products: ${e.message}`); return; }
    for (const p of data || []) for (const id of p.section_ids || []) counts.set(id, (counts.get(id) || 0) + 1);
    if (!data || data.length < 1000) break;
  }

  for (const link of CATEGORY_LINKS) {
    const section = (sections || []).find((s) => s.slug === link.slug);
    if (!section) { errors.push(`${link.slug}: no section with this slug in the database — the page will 404 (was the section renamed?)`); continue; }
    if (section.name !== link.name) warnings.push(`${link.slug}: name is "${link.name}" here but "${section.name}" in the database`);
    if (!counts.get(section.id)) errors.push(`${link.slug}: section has no active products — the page will 404 and is left out of the sitemap`);
  }

  for (const s of sections || []) {
    if (!CATEGORY_LINKS.some((l) => l.slug === s.slug)) warnings.push(`section "${s.name}" (slug ${s.slug}, ${counts.get(s.id) || 0} products) has no category page — add it to CATEGORY_LINKS and CATEGORY_COPY`);
  }
}

async function main() {
  console.log('Category copy:');
  checkCopy();
  await checkAgainstDatabase();

  for (const w of warnings) console.warn(`WARN   ${w}`);
  for (const e of errors) console.error(`ERROR  ${e}`);
  console.log(errors.length ? `\n${errors.length} error(s).` : '\nOK — copy and database agree.');
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
