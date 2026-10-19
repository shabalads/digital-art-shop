// app/data/categories.ts
//
// The category pages that exist: /shop/<slug>, one per curated "section".
// Kept to just slug + name on purpose — the footer (a client component)
// imports this list, so the long per-category copy lives in
// category-copy.ts and stays out of every page's JS bundle.
//
// A category page is only published when ALL of these hold: it is listed
// here, it has copy in category-copy.ts, and a section with the same slug
// exists in Supabase with at least one active product (see
// getPublicCategories in app/lib/categories.ts). That way a section made in
// the dashboard can never produce a thin, copy-less page that Google indexes.
//
// - slug / name must match the `sections` row. The sections API regenerates
//   the slug from the name on rename, so renaming a section in the dashboard
//   moves its URL: update the entry here (and the copy key) to match.
// - Order here is the order shown in the footer and on the homepage.
// - After adding or editing a category, run
//     npx tsx --env-file=.env.local scripts/check-category-content.ts
//   It checks word counts, meta lengths, uniqueness and drift against the DB.

export type CategoryLink = { slug: string; name: string };

export const CATEGORY_LINKS: CategoryLink[] = [
  { slug: 'coastal-seaside', name: 'Coastal & Seaside' },
  { slug: 'wildflower-botanical', name: 'Wildflower & Botanical' },
  { slug: 'moody-dark-academia', name: 'Moody & Dark Academia' },
  { slug: 'dopamine-colorful', name: 'Dopamine & Colorful' },
  { slug: 'animal-wall-art', name: 'Animal Wall Art' },
  { slug: 'feminine-coquette', name: 'Feminine & Coquette' },
  { slug: 'celestial-dreamy', name: 'Celestial & Dreamy' },
  { slug: 'vintage-countryside', name: 'Vintage & Countryside' },
  { slug: 'western-cowboy', name: 'Western & Cowboy' },
  { slug: 'quirky-funny', name: 'Quirky & Funny' },
  { slug: 'spooky-cozy-ghosts', name: 'Spooky & Cozy Ghosts' },
];
