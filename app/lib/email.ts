// app/lib/email.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

interface DownloadItem {
  title: string;
  url: string | null;
}

export async function sendOrderEmail({
  to,
  orderRef,
  downloadLinks,
  hasPhysical,
}: {
  to: string;
  orderRef: string;
  downloadLinks: DownloadItem[];
  hasPhysical: boolean;
}) {
  const hasDigital = downloadLinks.some(d => d.url);

  const downloadSection = hasDigital
    ? `
      <h2 style="font-size:15px;font-weight:600;margin:28px 0 12px;color:#222;">Your digital files</h2>
      ${downloadLinks
        .filter(d => d.url)
        .map(
          d => `
        <div style="margin-bottom:10px;padding:14px 18px;background:#f8f6f2;border-radius:8px;">
          <div style="font-size:14px;font-weight:500;margin-bottom:10px;color:#333;">${d.title}</div>
          <a href="${d.url}" style="display:inline-block;background:#5c7a52;color:white;text-decoration:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:500;">
            Download →
          </a>
        </div>
      `
        )
        .join('')}
      <p style="font-size:12px;color:#999;margin-top:10px;">Links expire in 7 days. Re-download anytime by replying to this email.</p>
    `
    : '';

  const physicalSection = hasPhysical
    ? `<p style="font-size:14px;color:#555;line-height:1.6;margin:20px 0;">Your print will be produced and shipped within 3–5 business days. You'll receive a tracking number by email when it dispatches.</p>`
    : '';

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to,
    subject: `Your ItemssyPrints order — #${orderRef}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:40px 24px;color:#222;background:#fff;">
  <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin:0 0 24px;">ItemssyPrints</p>

  <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.5px;margin:0 0 6px;">Order confirmed</h1>
  <p style="font-size:13px;color:#999;margin:0 0 24px;">Order #${orderRef}</p>

  <p style="font-size:15px;line-height:1.7;color:#444;margin:0 0 8px;">
    Thank you for your purchase!${hasDigital ? ' Your files are ready to download below.' : ''}
  </p>

  ${downloadSection}
  ${physicalSection}

  <hr style="border:none;border-top:0.5px solid #e8e8e8;margin:32px 0;" />

  <p style="font-size:13px;color:#999;line-height:1.6;margin:0;">
    Questions? Email us at
    <a href="mailto:itemssy@email.cz" style="color:#5c7a52;text-decoration:none;">itemssy@email.cz</a>
    — we reply within 24 hours.
  </p>
</body>
</html>`,
  });
}
