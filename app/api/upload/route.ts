// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const productId = (formData.get('productId') as string | null) ?? 'misc';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${productId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from('digital-files')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path });
}
