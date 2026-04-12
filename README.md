# Inventory Web

Next.js inventory manager backed by Supabase.

## Setup

1. Create a Supabase project.
2. Open `supabase/schema.sql` in the Supabase SQL editor and run it.
3. Copy `.env.example` to `.env.local` and fill the values below.
4. Run the app with `npm run dev`.

## Environment Variables

Required Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Find both in the Supabase dashboard under `Project Settings > API`.
Use the project URL as `NEXT_PUBLIC_SUPABASE_URL` and the publishable key as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Prisma connection strings are no longer required.
The app uses Supabase JS plus RLS, so there is no `DATABASE_URL` or `DIRECT_URL` in the example file.

Optional shipping integration values:

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `COUPANG_ACCESS_KEY`
- `COUPANG_SECRET_KEY`
- `COUPANG_VENDOR_ID`

These are only needed if you use the Naver or Coupang shipping actions.

## Schema Notes

The schema is Supabase-first:

- every inventory table carries a `user_id`
- row level security restricts each user to their own data
- foreign keys are composite so rows cannot point at another user's models, sizes, or colors
- RPC functions are provided for bulk inventory transactions and direct inventory adjustments
