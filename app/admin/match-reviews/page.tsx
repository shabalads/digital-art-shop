// app/admin/match-reviews/page.tsx
//
// Internal, single-purpose tool — not linked from any nav, not for
// customers. Gated to the site owner via requireAdmin() (same allowlist as
// /dashboard). Live data only: the client component queries Supabase fresh
// on every load via /api/admin/match-reviews/queue, never the static
// needs_review.csv.

import { redirect } from 'next/navigation';
import { requireAdmin } from '../../lib/adminAuth';
import MatchReviewsClient from './MatchReviewsClient';

export const metadata = {
  title: 'Match reviews',
  robots: { index: false, follow: false },
};

export default async function MatchReviewsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');

  return <MatchReviewsClient />;
}
