import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabaseAdmin } from '../../lib/supabase';
import { uploadAssetFromUrl } from '../../lib/storage';

function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('botanical') || t.includes('plant') || t.includes('leaf') || t.includes('floral') || t.includes('flower')) return 'botanical';
  if (t.includes('quote') || t.includes('text') || t.includes('word') || t.includes('saying') || t.includes('typography')) return 'typography';
  if (t.includes('photo') || t.includes('landscape') || t.includes('nature') || t.includes('sky')) return 'photography';
  if (t.includes('vintage') || t.includes('retro') || t.includes('antique')) return 'vintage';
  if (t.includes('minimal') || t.includes('simple') || t.includes('clean') || t.includes('line')) return 'minimal';
  return 'abstract';
}

function randomBg(): string {
  const bgs = ['#E8E2D8', '#D8E4DC', '#F0EBE3', '#E2E0EC', '#EDE8D0', '#E4E8EC', '#DCE8DC', '#EDE8E4', '#E8E4DC', '#DDE4E8'];
  return bgs[Math.floor(Math.random() * bgs.length)];
}

function mapEtsyRow(row: Record<string, string>) {
  const title = row['TITLE'] || row['Title'] || 'Untitled';
  const description = row['DESCRIPTION'] || row['Description'] || '';
  const imageUrl = row['IMAGE1'] || row['Image1'] || row['IMAGE_URL'] || row['Image URL'] || '';
  const extraImages = [
    row['IMAGE2'], row['IMAGE3'], row['IMAGE4'], row['IMAGE5'],
    row['IMAGE6'], row['IMAGE7'], row['IMAGE8'], row['IMAGE9'], row['IMAGE10']
  ].filter(Boolean) as string[];
  const price = parseFloat(row['PRICE'] || row['Price'] || '3.99') || 3.99;
  const active = true; // default all imported listings to activel
  
return {
    title,
    description,
    category: guessCategory(title),
    price_digital: price,
    price_physical: Math.max(price * 6, 24.99),
    badge: '',
    bg_color: randomBg(),
    image_url: imageUrl,
    images: extraImages,
    digital_file_url: imageUrl,
    active,
  };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
  }

  const csvText = await file.text();
  if (!csvText.trim()) {
    return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
  }

  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors);
  }

  const rows = data as Array<Record<string, string>>;
  let imported = 0;
  let skipped = 0;
  const failures: Array<{ title: string; reason: string }> = [];

// Get existing titles to avoid duplicates
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('title');
  const existingTitles = new Set((existing || []).map((p: any) => p.title.toLowerCase().trim()));

  for (const row of rows) {
    try {
      const product = mapEtsyRow(row);

      // Skip if already exists
      if (existingTitles.has(product.title.toLowerCase().trim())) {
        skipped += 1;
        continue;
      }

      let imageUrl = product.image_url || '';

      if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
        const uploaded = await uploadAssetFromUrl({ url: imageUrl });
        imageUrl = uploaded.publicUrl;
      }

      const { error } = await supabaseAdmin.from('products').insert({
        ...product,
        image_url: imageUrl,
        digital_file_url: imageUrl || product.digital_file_url,
      });

      if (error) {
        skipped += 1;
        failures.push({ title: product.title, reason: error.message });
      } else {
        imported += 1;
      }
    } catch (error) {
      skipped += 1;
      failures.push({ title: row['TITLE'] || row['Title'] || 'Untitled', reason: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    total: rows.length,
    failures: failures.slice(0, 10),
  });
}
