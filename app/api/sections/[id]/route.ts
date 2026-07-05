// app/api/sections/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

// PATCH — add or remove products from a section
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sectionId } = await params;
  const { productIds, action } = await req.json();
  // action: 'add' | 'remove'

  if (!productIds?.length || !action) {
    return NextResponse.json({ error: 'Missing productIds or action' }, { status: 400 });
  }

  // Fetch current section_ids for all affected products
  const { data: products, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, section_ids')
    .in('id', productIds);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  await Promise.all((products || []).map((p: any) => {
    const current: string[] = p.section_ids || [];
    let updated: string[];
    if (action === 'add') {
      updated = current.includes(sectionId) ? current : [...current, sectionId];
    } else {
      updated = current.filter((sid: string) => sid !== sectionId);
    }
    return supabaseAdmin.from('products').update({ section_ids: updated }).eq('id', p.id);
  }));

  return NextResponse.json({ ok: true });
}