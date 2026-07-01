// app/dashboard/layout.tsx

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const ADMIN_EMAILS = ['pojsli.jirka@gmail.com'];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!email || !ADMIN_EMAILS.includes(email)) {
    redirect('/');
  }

  return <>{children}</>;
}