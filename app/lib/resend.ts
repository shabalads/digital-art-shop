// app/lib/resend.ts

import { Resend } from 'resend';
import { supabaseAdmin } from './supabase';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = process.env.FROM_EMAIL || 'orders@itemssycrafts.com',
}: EmailPayload) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('Resend is not configured; skipping email send.');
    return { ok: false, skipped: true };
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error('Resend send failed:', error);
    return { ok: false, error };
  }
}

async function resolveDownloadUrl(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  // Storage path — generate a 7-day signed URL from the digital-files bucket
  const { data } = await supabaseAdmin.storage
    .from('digital-files')
    .createSignedUrl(raw, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

// Every digital product's files live in this one shared Google Drive
// folder — same delivery method as the old Etsy shop, and the only
// delivery mechanism that's actually reliable today: per-product
// digital_file_url is blank for most of the catalog (see the "MISSING
// DIGITAL FILE" log in app/api/webhook/route.ts), which meant orders were
// shipping with no working download link at all. This folder link is now
// the guaranteed, always-present download method for every digital order;
// any per-item digital_file_url that *is* set still shows as a bonus
// direct link below it, but nothing depends on that being populated
// anymore.
const DIGITAL_DOWNLOAD_FOLDER_URL =
  'https://drive.google.com/drive/folders/1uDOo0Xfosd7vfvXqsag9pxCfqNSh0Rqx?usp=sharing';

export async function sendDigitalOrderEmail({
  customerEmail,
  orderNumber,
  items,
  siteUrl = process.env.NEXT_PUBLIC_URL || 'https://www.itemssyprints.com',
}: {
  customerEmail: string;
  orderNumber: string;
  items: Array<{ title: string; downloadUrl?: string }>;
  siteUrl?: string;
}) {
  if (!customerEmail) return { ok: false, skipped: true };

  const resolvedItems = await Promise.all(
    items.map(async (item) => ({
      title: item.title,
      url: await resolveDownloadUrl(item.downloadUrl),
    }))
  );

  const itemRows = resolvedItems
    .map((item) => {
      // The shared folder link below is the guaranteed way to get every
      // item — this per-item link is purely a bonus when a direct file
      // happens to be on file, never the only way to get the download.
      const extra = item.url
        ? ` — <a href="${item.url}" style="color:#2f6538">direct file link</a>`
        : '';
      return `<li style="margin-bottom:6px"><strong>${item.title}</strong>${extra}</li>`;
    })
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;color:#2f6538">Your digital download is ready</h2>
      <p>Thank you for your order from ItemssyPrints.</p>
      <p><strong>Order:</strong> ${orderNumber}</p>
      <ul style="padding-left:18px;margin:12px 0 20px;">${itemRows}</ul>

      <div style="text-align:center;margin:28px 0;">
        <a
          href="${DIGITAL_DOWNLOAD_FOLDER_URL}"
          style="display:inline-block;background:#2f6538;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;"
        >Download Your Print</a>
      </div>

      <div style="background:#f4f6f4;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-weight:600;">How to download:</p>
        <ul style="padding-left:18px;margin:0;">
          <li>Click the button above to open your files in Google Drive</li>
          <li>All size ratios are included (2x3, 3x4, 4x5, 5x7, 11x14)</li>
          <li>On phone: tap the file thumbnail, then tap the three dots (⋯) to download</li>
          <li>Questions? Email <a href="mailto:itemssy@email.cz" style="color:#2f6538">itemssy@email.cz</a></li>
        </ul>
      </div>

      <p>If you need help, reply to this email or visit <a href="${siteUrl}" style="color:#2f6538">${siteUrl}</a>.</p>
    </div>
  `;

  const text = [
    `Your digital download is ready — Order ${orderNumber}`,
    '',
    'Items:',
    ...resolvedItems.map((item) => `- ${item.title}${item.url ? ` (direct link: ${item.url})` : ''}`),
    '',
    `Download your print: ${DIGITAL_DOWNLOAD_FOLDER_URL}`,
    '',
    'How to download:',
    '- Click the link to open your files in Google Drive',
    '- All size ratios are included (2x3, 3x4, 4x5, 5x7, 11x14)',
    '- On phone: tap the file thumbnail, then tap the three dots (...) to download',
    '- Questions? Email itemssy@email.cz',
    '',
    `Need help? Visit ${siteUrl}`,
  ].join('\n');

  return sendEmail({
    to: customerEmail,
    subject: `Your ItemssyPrints download is ready — Order ${orderNumber}`,
    html,
    text,
  });
}
