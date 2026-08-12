// app/lib/adminAuth.ts
//
// Shared gate for internal-only pages/API routes (not the public site).
// Mirrors the same allowlist used by app/dashboard/layout.tsx — kept as a
// separate helper so it can also be called from Route Handlers (API routes
// don't inherit page/layout-level auth checks in this app; see the "no
// existing API route checks Clerk auth" gap noted while building this).

import { currentUser } from '@clerk/nextjs/server';

const ADMIN_EMAILS = ['pojsli.jirka@gmail.com'];

export async function requireAdmin() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) return null;
  return user;
}
