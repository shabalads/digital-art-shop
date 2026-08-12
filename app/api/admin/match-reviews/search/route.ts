// app/api/admin/match-reviews/search/route.ts
//
// Fallback keyword search across all live products for /admin/match-reviews,
// used when none of the top-3 fuzzy candidates are right (near-zero scores
// usually mean the real product isn't in the top 3 at all — the review's
// old Etsy title shares almost no words with the current retitled listing).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ results: [] });

  let query = supabaseAdmin
    .from('products')
    .select('id, title, image_url, price_digital')
    .is('deleted_at', null)
    .limit(24);

  // Every word must appear in the title (chained .ilike() on the same
  // column ANDs together, same convention as app/api/products/route.ts).
  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const escaped = word.replace(/[%_]/g, '\\$&');
    query = query.ilike('title', `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data || [] });
}
