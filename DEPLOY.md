# ItemssyCrafts — Deploy Checklist

## 1. Supabase — run schema

1. Open https://supabase.com/dashboard → your project → SQL Editor
2. Paste and run the SQL below (or the separate `supabase_schema.sql` file)
3. In Storage → Buckets, confirm `artwork` (public) and `digital-files` (private) exist

<details>
<summary>SQL schema</summary>

```sql
-- Products
create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text default '',
  category            text default 'abstract',
  price_digital       numeric(10,2) not null default 3.99,
  price_physical      numeric(10,2) not null default 29.99,
  badge               text default '',
  bg_color            text default '#F0EBE3',
  image_url           text default '',
  digital_file_url    text default '',
  printful_product_id text default '',
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

-- Orders
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email    text not null,
  type              text not null default 'digital',
  status            text not null default 'paid',
  total             numeric(10,2) not null,
  printful_order_id text,
  created_at        timestamptz not null default now()
);

-- Order items
create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  type       text not null,
  price      numeric(10,2),
  quantity   int not null default 1,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists products_active_idx   on products(active, created_at desc);
create index if not exists products_category_idx on products(category) where active = true;
create index if not exists order_items_order_idx on order_items(order_id);

-- RLS
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

create policy "public read active products"
  on products for select using (active = true);

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit)
  values ('artwork', 'artwork', true, 52428800)
  on conflict (id) do nothing;

create policy "artwork public read"
  on storage.objects for select using (bucket_id = 'artwork');

create policy "artwork service write"
  on storage.objects for insert with check (bucket_id = 'artwork');

insert into storage.buckets (id, name, public, file_size_limit)
  values ('digital-files', 'digital-files', false, 104857600)
  on conflict (id) do nothing;
```

</details>

---

## 2. Resend — verify sender domain

1. https://resend.com/domains → Add domain → add your sending domain
2. Add the DNS TXT/MX records to your registrar
3. Once verified, update `.env.local` (and Vercel env vars):
   ```
   RESEND_API_KEY=re_live_xxxxxxxxxxxxxxxxxxxx   ← already set in .env.local
   FROM_EMAIL=orders@itemssycrafts.com           ← change from onboarding@resend.dev
   ```

> **Note:** `onboarding@resend.dev` works for test sends only. You must verify your own domain before going live.

---

## 3. Stripe — switch to live mode

1. https://dashboard.stripe.com → toggle to **Live mode** (top-right)
2. Developers → API keys → copy the live `sk_live_...` key → update `STRIPE_SECRET_KEY`
3. Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhook`
   - Events: `checkout.session.completed`
   - Copy the signing secret → update `STRIPE_WEBHOOK_SECRET`

---

## 4. Deploy to Vercel

```bash
npm i -g vercel   # if not installed
vercel            # from project root — follow prompts
```

---

## 5. Set environment variables on Vercel

Settings → Environment Variables — add everything from `.env.local`:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | |
| `STRIPE_SECRET_KEY` | `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | from live webhook endpoint |
| `RESEND_API_KEY` | |
| `FROM_EMAIL` | `orders@itemssycrafts.com` |
| `NEXT_PUBLIC_URL` | `https://yourdomain.com` |
| `DASHBOARD_PASSWORD` | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | |
| `CLERK_SECRET_KEY` | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |

Redeploy after adding vars.

---

## 6. Custom domain

1. Vercel → Settings → Domains → Add → enter your domain
2. Add the A record + CNAME Vercel shows you
3. Update `NEXT_PUBLIC_URL` to `https://itemssycrafts.com` and redeploy

---

## 7. Import 600 Etsy listings

1. Etsy: Shop Manager → Settings → Options → Download Data → CSV
2. Go to `/dashboard/import` on your deployed site
3. Upload the CSV — the import route re-uploads all product images into Supabase Storage and bulk-inserts every listing
4. Check `/dashboard/products`

---

## 8. Upload art files for digital download

For each product with a digital file:
1. `/dashboard/products` → edit the product
2. Click **↑ Upload file** under "Digital file"
3. Select the `.jpg`, `.png`, `.pdf`, or `.zip` file
4. The path is stored in `digital_file_url` in Supabase
5. On purchase, the webhook generates a 7-day signed URL and emails it to the customer

---

## Post-launch smoke test

- [ ] Place a test order (Stripe card `4242 4242 4242 4242`)
- [ ] Webhook fires (Stripe → Webhooks → event log)
- [ ] Confirmation email arrives with working download link
- [ ] Download link opens the file
- [ ] Order appears in `/dashboard/orders`
