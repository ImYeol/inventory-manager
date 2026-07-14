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

Prisma connection strings are not required for the app runtime.
The app uses Supabase JS plus RLS, so there is no `DATABASE_URL` or `DIRECT_URL` in the example file by default.
If you use Prisma tooling directly, set `DATABASE_URL` to your Supabase Postgres connection string.

Optional shipping integration values:

- `SHIPPING_CREDENTIALS_ENCRYPTION_KEY`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `COUPANG_ACCESS_KEY`
- `COUPANG_SECRET_KEY`
- `COUPANG_VENDOR_ID`

These are only needed if you use the Naver or Coupang shipping actions.

`SHIPPING_CREDENTIALS_ENCRYPTION_KEY` is required to save Naver or Coupang credentials from Settings. It is a server-only at-rest encryption master key, not a Naver/Coupang API credential: generate a long random value (for example, `openssl rand -base64 32`), keep it only in the deployment secret store, and never use a `NEXT_PUBLIC_` variable for it.

For rotation, keep the previous key available until every existing encrypted credential row has been re-encrypted with the new key. Do not replace the key first or use a plaintext fallback: rows encrypted by the old key must remain decryptable during the migration.

Optional Prisma seed values:

- `SEED_USER_ID`
- `SEED_USER_EMAIL`

`npm run seed` now targets Supabase Postgres and expects `SEED_USER_ID` to already exist in `auth.users`.

## Schema Notes

The schema is Supabase-first:

- every inventory table carries a `user_id`
- row level security restricts each user to their own data
- foreign keys are composite so rows cannot point at another user's models, sizes, or colors
- RPC functions are provided for bulk inventory transactions and direct inventory adjustments
