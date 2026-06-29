// middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isDashboard = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isDashboard(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};