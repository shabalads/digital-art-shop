// app/(info)/faq/page.tsx

import type { Metadata } from 'next';
import FAQContent from '../../components/FAQContent';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about ItemssyCrafts digital prints, file formats, shipping, and refunds.',
};

export default function FAQPage() {
  return <FAQContent />;
}