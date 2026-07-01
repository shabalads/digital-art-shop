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

export async function sendDigitalOrderEmail({
  customerEmail,
  orderNumber,
  items,
  siteUrl = process.env.NEXT_PUBLIC_URL || 'https://itemssycrafts.com',
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
      const href = item.url
        ? `<a href="${item.url}" style="color:#2f6538">Download file</a>`
        : 'Your download link will be shared shortly.';
      return `<li style="margin-bottom:10px"><strong>${item.title}</strong><br />${href}</li>`;
    })
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;color:#2f6538">Your digital download is ready</h2>
      <p>Thank you for your order from ItemssyCrafts.</p>
      <p><strong>Order:</strong> ${orderNumber}</p>
      <ul style="padding-left:18px;margin:12px 0 20px;">${itemRows}</ul>
      <p>If you need help, reply to this email or visit <a href="${siteUrl}" style="color:#2f6538">${siteUrl}</a>.</p>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Your ItemssyCrafts download is ready — Order ${orderNumber}`,
    html,
    text: `Your download is ready. Order ${orderNumber}. Visit ${siteUrl} for support.`,
  });
}
