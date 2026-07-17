// app/(info)/contact/page.tsx

import type { Metadata } from 'next';
import ContactContent from '../../components/ContactContent';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with ItemssyPrints. Questions about orders, downloads, or anything else.',
};

export default function ContactPage() {
  return <ContactContent />;
}