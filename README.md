This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend setup

The app now supports:

- Resend email delivery for digital-download order confirmations.
- CSV imports from Etsy that upload artwork images into Supabase Storage and insert products into Supabase.
- Stripe checkout and webhook handling that are ready for live keys.

Copy [.env.example](.env.example) to `.env.local` and fill in your real credentials.

### Required services

- Supabase project with a public storage bucket named `artwork`.
- Stripe live secret and webhook secret.
- Resend API key and verified sender address.

### Importing Etsy listings

1. Open the dashboard import page.
2. Upload your Etsy CSV export.
3. The server will parse rows, upload each image into Supabase Storage, and insert products into the `products` table.

## Deploy on Vercel

1. Connect the GitHub repository to Vercel.
2. Set the environment variables from `.env.local` in Vercel.
3. Configure the custom domain in the Vercel Project Settings.
4. Point your DNS to the Vercel nameservers or CNAME target.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
