import { supabaseAdmin } from './supabase';

const DEFAULT_BUCKET = 'artwork';

function slugifyFilename(url: string, fallback = 'artwork') {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').filter(Boolean).pop() || fallback;
    return `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  } catch {
    return `${Date.now()}-${fallback.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  }
}

async function ensureBucket(bucket = DEFAULT_BUCKET) {
  const { error } = await supabaseAdmin.storage.getBucket(bucket);
  if (error?.message?.includes('not found')) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: '50MB',
    });

    if (createError) throw createError;
  } else if (error) {
    throw error;
  }
}

export async function uploadAssetFromUrl({
  url,
  bucket = DEFAULT_BUCKET,
  folder = 'artworks',
}: {
  url: string;
  bucket?: string;
  folder?: string;
}) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to fetch asset: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = response.headers.get('content-type')?.split('/').pop() || 'jpg';
  const fileName = `${slugifyFilename(url)}.${extension}`;
  const path = `${folder}/${fileName}`;

  await ensureBucket(bucket);

  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    upsert: true,
  });

  if (error) throw error;

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return {
    path: data?.path || path,
    publicUrl: publicData.publicUrl,
  };
}

export async function uploadAssetFile({
  file,
  bucket = DEFAULT_BUCKET,
  folder = 'artworks',
}: {
  file: File | Blob;
  bucket?: string;
  folder?: string;
}) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${(file as File).name || 'asset'}`.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder}/${fileName}`;

  await ensureBucket(bucket);

  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
    contentType: (file as File).type || 'application/octet-stream',
    upsert: true,
  });

  if (error) throw error;

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return {
    path: data?.path || path,
    publicUrl: publicData.publicUrl,
  };
}
