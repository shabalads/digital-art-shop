// app/api/favorites/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../lib/supabase';

// The user id always comes from the Clerk session, never from the request —
// otherwise anyone could read or toggle another customer's favorites.

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ favorites: [] });

  const { data } = await supabaseAdmin
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);

  return NextResponse.json({ favorites: (data || []).map((f: any) => f.product_id) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

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