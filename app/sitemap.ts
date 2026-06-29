// app/sitemap.ts

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://itemssycrafts.com';

  const staticPages = [
    '', '/shop', '/about', '/faq', '/contact', '/refunds', '/privacy', '/terms'
  ].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  return staticPages;
}