// app/robots.ts

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin added alongside the existing /dashboard block — it's the same
    // kind of internal, owner-only tool (currently /admin/match-reviews,
    // which surfaces real customer names/order data) and has no reason to
    // be crawled or indexed.
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api'] },
    sitemap: 'https://www.itemssyprints.com/sitemap.xml',
  };
}