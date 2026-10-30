# ETS-Directory

An independent South African business directory by Eva-Tech-Studio. **Find Local. Connect Direct.**

## Application status

The app now includes a responsive public directory, searchable business profiles, and connected account, listing, trust, moderation, and promotion workflows. Database-backed functionality requires the Supabase migrations below. Paystack and Resend integrations remain disabled until their server-only credentials and provider configuration are supplied.

## Stack

- Next.js App Router, React 19, and strict TypeScript
- Tailwind CSS 4 and Lucide icons
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- Zod validation for server actions and API inputs

## Run locally

Requirements: Node.js 20.9 or later and npm.

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase URL and publishable key.
3. Install dependencies with `npm install`.
4. Apply the database migrations to a development Supabase project.
5. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before deploying.

## Supabase setup

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
2. Install the Supabase CLI, authenticate, and link the project.
3. Apply migrations with `supabase db push`.
4. Load categories and initial ZAR plan prices with `supabase/seed.sql` in a disposable development project or through the SQL editor.
5. In Supabase Auth, enable email confirmation and add `http://localhost:3000/auth/callback` (plus the production callback URL) to the allowed redirect URLs. Enable the Google provider there to offer Google sign-in.
6. Grant the `moderator` or `admin` profile role only through a trusted administrative process. Never expose role changes through signup or user profile forms.

Migrations:

- `20261020000000_initial_schema.sql`: core directory, accounts, enquiries, listing events, verification, payments, moderation, and initial RLS.
- `20261021000000_directory_features.sql`: reviews, saved businesses, filtered and ranked search, ratings, and the listing-submission RPC.
- `20261022000000_business_claims.sql`: ownership claims, staff review RPCs, service updates, and the public business-media Storage bucket.
- `20261023000000_saved_searches_and_billing.sql`: saved searches, owner analytics, and guarded Paystack checkout/payment RPCs.
- `20261024000000_data_subject_requests.sql`: account-scoped access, correction, deletion, and listing-removal requests with a staff queue.
- `20261025000000_site_activity_analytics.sql`: opt-in site-wide activity analytics, staff reporting, and 30-day event cleanup through `pg_cron`.
- `20261029000000_grant_profile_select.sql`: grants authenticated users the table privileges needed for staff role checks and moderation queues; row-level security still controls accessible rows.
- `20261029193400_grant_listing_events_select.sql`: grants authenticated users the table privilege required by the staff analytics RPC; row-level security still limits event rows to listing owners and staff.
- `20261030162300_grant_listing_submission.sql`: grants category reads and listing-submission inserts to the appropriate roles; row-level security still limits which rows users can access or create.

Apply all migrations before deploying the app code. Do not run destructive development seed/reset commands against production.

## Features

- Responsive homepage and shared mobile-friendly navigation.
- Business-name and city autocomplete, category/location filters, verified/open-now filters, relevance/rating/newest sorting, pagination, and shareable search URLs.
- Public profiles with verified badges, contact links, directions, opening hours, services, images, reviews, and enquiry forms.
- Email-confirmed registration, sign-in/out, owner dashboards, listing submission/editing, photo management, and one-month sponsored placement.
- Saved businesses and saved search filters.
- Enquiry inbox and 30-day listing performance metrics. Opt-in site analytics show page views, temporary visitor sessions, searches, popular pages, referrer domains, device categories, and listing interactions. Analytics does not store IP addresses, account identities, search terms, or full user-agent strings; raw events are deleted after 30 days.
- Manual review queues for listings, user reviews, reports, ownership claims, and verification requests.
- Resend email notifications for enquiries when configured.
- Paystack one-month Featured and Premium placement, activated only from a signed webhook; the payment redirect is not treated as proof of payment.

## Optional server-only integrations

Keep every secret server-side; never prefix these credentials with `NEXT_PUBLIC_`.

- `PAYSTACK_SECRET_KEY`: initialize promotion checkout.
- `PAYSTACK_WEBHOOK_SECRET`: verify `POST /api/payments/paystack/webhook`; configure this exact route with Paystack and retain its HTTPS production URL.
- `SUPABASE_SERVICE_ROLE_KEY`: update payment state from the verified Paystack webhook only. Never use this key in browser code.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: send enquiry notifications from a verified Resend sender.

Without provider credentials, core listings and enquiries still work, but payment/email notifications are unavailable. Promotion checkout requires a published listing owned by the signed-in user. Promotions are prepaid for one month and do not automatically renew.

## Security, privacy, and launch requirements

- Public business queries are limited by database RLS to published listings. User-owned records and staff-only queues are protected by policies and server-side checks.
- Signup creates a consumer account. Moderation roles and business verification are controlled by staff; payment activation depends on the signed provider webhook.
- The business-media bucket is public because its contents are listing images. Do not upload identity, verification, payment, or other sensitive documents to it.
- Enquiries are shared with the selected business only after the visitor consents. If Resend is configured, the business receives a notification containing the enquiry and reply address.
- Optional site-wide analytics require explicit consent and use a temporary session ID; they do not capture IP addresses, account identities, search terms, or full user-agent strings. Profile-view events are deduplicated per browser tab session.
- Configure edge/WAF rate limits and abuse controls for registration, public reports, reviews, enquiries, autocomplete, and event collection before public launch. The repository does not include a distributed rate-limiter or CAPTCHA provider.
- Define review and claim evidence standards, customer-support contact details, moderation response times, image-retention rules, and backup/restore procedures before launch.
- Privacy and terms pages are draft templates. Have qualified South African counsel review POPIA obligations, consent/retention, consumer disclosures, one-month promotion terms, refunds, and sponsored-placement labeling before accepting real users or payments.

## Deployment

The project can be deployed to Vercel or another Next.js host. Configure environment variables in the deployment environment, set production Supabase Auth redirect URLs, register the production Paystack webhook, apply migrations in a controlled workflow, and run `npm run build`. Configure monitoring, backups, and tested restoration. Do not run `supabase db reset` against production.

## Remaining operational work

- Connect a real Supabase project and test the full Auth/RLS/Storage/payment workflows against it; this repository does not include project credentials.
- Configure provider credentials, verified email sender, Paystack merchant/webhook settings, and production support contacts.
- Add a distributed abuse-control service, image resizing/optimization, and a documented data-retention/deletion process.
- Complete legal review and accessibility/visual testing with real users and business data.
