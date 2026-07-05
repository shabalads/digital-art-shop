// app/api/favorites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ favorites: [] });

  const { data } = await supabaseAdmin
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);

  return NextResponse.json({ favorites: (data || []).map((f: any) => f.product_id) });
}

export async function POST(req: NextRequest) {
  const { userId, productId } = await req.json();
  if (!userId || !productId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (existing) {
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId).eq('product_id', productId);
    return NextResponse.json({ favorited: false });
  } else {
    await supabaseAdmin.from('favorites').insert({ user_id: userId, product_id: productId });
    return NextResponse.json({ favorited: true });
  }
}