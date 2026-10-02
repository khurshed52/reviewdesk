# Reviewdesk

A multi-merchant review platform built with **Next.js 16.3.6 App Router**, strict TypeScript, Ant Design 6, Tailwind CSS 4, PostgreSQL, Prisma 7, Auth.js Credentials, Zod and bcrypt. No React Hook Form, OpenAI or payment integration.

## Prerequisites

- Node.js **22.12+** (Node 24 is supported)
- npm
- PostgreSQL 17+ locally or a hosted PostgreSQL database
- Optional: Docker Compose for the supplied local database configuration

## Installation and local development

```bash
npm install
cp .env.example .env
```

Edit `.env` before continuing. Generate a strong authentication secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Create the database using an existing PostgreSQL installation:

```bash
createuser --pwprompt reviewdesk
createdb --owner=reviewdesk reviewdesk
```

Alternatively, set `POSTGRES_PASSWORD` in your shell or `.env`, then:

```bash
docker compose up -d
```

Set `DATABASE_URL` to the corresponding `postgresql://USER:PASSWORD@HOST:5432/reviewdesk` URL. URL-encode special characters in credentials. Use your provider's required TLS parameters for remote databases.

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open http://localhost:3000. If another app occupies that address, use `npm run dev -- --port 3001` and set `AUTH_URL=http://localhost:3001`. A public QR code uses `AUTH_URL`, so set it to a reachable HTTPS domain before printing or distributing codes.

The seed is optional; registration creates a new merchant workspace without demo data. For an existing production database, use `npx prisma migrate deploy` instead of `migrate dev`.

## Checking registration database connections

Registration uses a Prisma nested write: the MERCHANT user and linked Merchant are committed together. Temporary registration diagnostic logs have been removed.

Run the app and Prisma Studio from the same project folder and compare the database host **and port**, not just its name. A second project copy can use another PostgreSQL server with the same database name. Refresh Studio after registering.

During local troubleshooting, this checkout runs at `http://localhost:3002` (`npm run dev -- --port 3002`), with `AUTH_URL` set to that origin. An older ReviewDesk copy was running at `http://127.0.0.1:3000` against PostgreSQL port `55432`; this checkout and its Studio use PostgreSQL port `5432`. Use the correct app URL and restart the dev server after changing environment variables. These are local development settings, not production defaults.

## Environment variables

| Variable                 | Purpose                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`           | Private PostgreSQL connection string.                                                                                    |
| `AUTH_SECRET`            | Random secret of at least 32 bytes for Auth.js and signed visitor cookies.                                               |
| `AUTH_URL`               | Canonical application origin, e.g. `https://reviews.example.com`.                                                        |
| `SEED_ADMIN_EMAIL`       | Email of the initial administrator.                                                                                      |
| `SEED_ADMIN_PASSWORD`    | Administrator password, 12+ characters and at most 72 UTF-8 bytes.                                                       |
| `SEED_MERCHANT_EMAIL`    | Email of the example merchant. Must differ from the admin email.                                                         |
| `SEED_MERCHANT_PASSWORD` | Example merchant password with the same constraints.                                                                     |
| `TRUST_PROXY`            | Default `false`. Set `true` only when your reverse proxy overwrites `X-Forwarded-For` with a trustworthy client address. |
| `SUPPORT_EMAIL`          | Optional contact address on the password-help page.                                                                      |
| `POSTGRES_PASSWORD`      | Only used by the optional local Docker Compose database. Match it in `DATABASE_URL`.                                     |

Secrets are server-only and must not use the `NEXT_PUBLIC_` prefix. `.env` is gitignored and is not included in the source archive.

## Seeded users and data

Seeding creates one ADMIN user and one MERCHANT user from the environment variables. The merchant owns **Sunday Hospitality → Sunday Coffee → Downtown → Front Counter QR**. Passwords use bcrypt cost 12. Re-running the seed does not overwrite existing passwords, change roles, or duplicate the sample business.

The sample location has a generic Google Maps URL. **Replace it with your actual branch's Google Review URL before sharing the QR.** No production password is hardcoded or printed.

## Project structure

```text
prisma/
  schema.prisma
  migrations/                 # Committed PostgreSQL migrations
  seed.ts
src/
  app/
    layout.tsx                # Root HTML, SSR styles and providers
    (auth)/                   # Primary auth layout
      login/ register/ forgot-password/
    (dashboard)/              # Primary dashboard layout
      dashboard/ businesses/[id]/ locations/[id]/
      qr-codes/ analytics/ settings/
      admin/merchants/ admin/businesses/ admin/usage/
    api/auth/[...nextauth]/
    r/[slug]/                 # Public, anonymous review flow
    unauthorized/
    error.tsx global-error.tsx not-found.tsx loading.tsx
  actions/                    # Validated server mutations and notifications' results
  components/
    auth/ layout/ common/ dashboard/ businesses/ locations/
    qr/ review/ admin/ settings/
  lib/
    auth.ts permissions.ts prisma.ts rate-limit.ts
    errors.ts utils.ts validations/
  providers/app-provider.tsx
  services/
    merchant.service.ts business.service.ts location.service.ts
    qr.service.ts qr-scan.service.ts review-session.service.ts analytics.service.ts
  generated/prisma/           # Generated, gitignored
tests/
  validation.test.ts
  integration/tenant.test.ts
  e2e/platform.spec.ts
```

There are exactly two primary application layouts, plus the required root layout. The public review page does not inherit dashboard navigation. Server Components load data; client components handle interactive Ant Design forms, tables and dialogs.

## Prisma schema

```text
User (ADMIN or MERCHANT)
  → Merchant (unique owner)
    → Business
      → Location (its own Google Review URL)
        → QRCode (unique random slug, source, active flag)
          → QRScan (one record per active review page opening)
          → ReviewSession (rating, tags, text, Google-click flag)
```

Deletion cascades down this hierarchy. Delete dialogs explain the cascading effect. Foreign-key indexes support ownership queries. `ReviewSession` adds a private hashed `visitorKey` and a composite unique constraint on `(qrCodeId, visitorKey)` for idempotent interactions. `RateLimit` stores shared, atomic abuse counters in PostgreSQL; no Auth.js adapter tables are needed for Credentials with JWT sessions.

## Authentication

- Ant Design Form validates basic input; reusable Zod schemas validate again on the server.
- Registration normalizes email, validates password confirmation and bcrypt's byte limit, hashes with bcrypt, and creates User + Merchant atomically using a nested Prisma write. The role is always MERCHANT; client-provided roles are ignored.
- Login uses Auth.js Credentials and bcrypt comparison. Credentials never enter the JWT. JWTs contain the user identity, with a 24-hour session lifetime.
- `requireUser()` reloads the user and role from PostgreSQL, so deleted users and role changes take effect without trusting stale role claims.
- Next.js Server Function argument logging is disabled so development logs do not expose credentials.
- Auth.js handles CSRF, session cookies and logout. Authenticated auth-page visitors redirect to `/dashboard`; protected routes redirect anonymous visitors to `/login`.
- Auth.js v5 is installed at the exact `5.0.0-beta.32` release for its App Router API. Its beta status is explicit; review future upgrades before deployment.
- `/forgot-password` is an honest support/help page. Automated reset emails and token recovery are **not implemented** because an email delivery provider was not specified; it does not pretend to send email.

## Authorization

Every protected service authenticates before querying. `businessScope`, `locationScope` and `qrScope` filter through the ownership hierarchy. `assertBusinessOwnership`, `assertLocationOwnership` and `assertQRCodeOwnership` reject foreign resources with a non-disclosing not-found state. Writes include tenant predicates as well as ownership checks. Location and QR creation validate the selected parent on the server. A location cannot be reassigned to a different business.

Merchant IDs are always derived from the signed-in account. ADMIN users can inspect and manage existing records globally. Merchant creation remains self-service registration; administrators without their own merchant workspace do not create tenant-owned businesses from an ambiguous global form. Every admin page independently calls `requireAdmin()`; menu visibility is not a security boundary.

## QR and public review architecture

- `crypto.randomBytes(12)` produces a 96-bit, 16-character URL-safe slug, backed by a unique database constraint.
- The `qrcode` package renders a 1024px PNG containing `${AUTH_URL}/r/${slug}`. Merchants can preview, download, copy, deactivate and reactivate codes.
- Public resolution loads the QR, its location, business and merchant. Inactive links show an unavailable Result; invalid links show a 404 Result.
- Opening or refreshing a valid, active `/r/[slug]` page records a `QRScan`. Invalid and inactive links do not record scans. Repeated openings count separately, not as unique visitors.
- Selecting 1–5 stars creates or updates the anonymous session. Simply loading or refreshing the page does not create a session.
- An HMAC-signed, HttpOnly, SameSite=Lax visitor cookie expires after 24 hours. Only its keyed hash is stored in the database. Repeated interactions with the same QR and cookie update one session. Clearing cookies or using another browser creates a new session; this is not a unique-person metric.
- The current customer flow stops at selecting a generated review. Google redirection is not enabled; historical Google-click analytics remain available.
- No customer email, phone number or name is requested. `selectedTags` stores up to three active category tag IDs; `generatedReviews` stores validated suggestions and `reviewText` stores the chosen suggestion.

## Dashboard and UI

Six live KPI cards show business count, location count, QR count, QR scans, Google clicks and conversion (`clicks / sessions`, zero-safe). Top locations are ranked by scan count. Recent review activity, scan counts and recent businesses use tenant-scoped data. Administrators see global aggregates.

Ant Design provides all controls, tables, forms, notifications, dialogs and primary layout components. SSR styles use `@ant-design/nextjs-registry`; contextual messages use `App.useApp()`. Tailwind supplies layout utilities only, with no preflight reset competing with Ant Design. Mobile navigation uses a Drawer and wide tables scroll within their cards. Dates render consistently in UTC to avoid hydration mismatches.

## Verification

```bash
npx prisma format
npx prisma validate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:integration
npm run build
```

Integration tests require a **dedicated test database** through `DATABASE_URL`. They create uniquely named records and remove them afterward. Never point test scripts at a production database.

For browser tests, seed that test database and start the application in another terminal:

```bash
npx playwright install chromium
npm run build
npm start
# In another terminal:
npm run test:e2e
```

`E2E_BASE_URL` overrides the default local test address. Set `AUTH_URL` to the same origin before starting the app. `PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an existing Chromium executable.

The browser suite covers registration, login/logout, auth redirects, forbidden admin access, foreign business IDs, business/location create/update/delete, QR generation/preview/download/copy, inactive and invalid links, session deduplication, Google-click recording, conversion and mobile navigation. Google navigation is intercepted in tests, so no external review is submitted. The integration suite checks all three ownership helpers, tenant-filtered analytics and the review-session uniqueness constraint.

Webpack is selected explicitly for development/build portability; Turbopack's compiler worker port is restricted in some desktop sandboxes. This is a supported Next.js build mode.

## Production operation

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Provide PostgreSQL and server environment variables, terminate HTTPS at a trusted reverse proxy, and set `AUTH_URL` to the public HTTPS origin. Run one migration job per deployment, back up the database, and restrict database access to the application. No deployment or paid service is provisioned by this project.

Login, registration and review interactions use atomic PostgreSQL rate limits. Without a trusted proxy, IP-based limits share one fallback bucket; configure `TRUST_PROXY` appropriately before a multi-user public launch. Rate limits are abuse mitigation, not bot-proof identity verification. Expired counters can be periodically removed with:

```sql
DELETE FROM "RateLimit" WHERE "expiresAt" < NOW() - INTERVAL '1 day';
```

Keep the lockfile. The two dependency overrides pin patched `deepmerge-ts` and `mysql2` ranges used by Prisma tooling; the audited install has no known npm advisories at verification time. The app itself uses PostgreSQL only.

Tables currently paginate the loaded tenant dataset in the browser. Large tenants will benefit from database-backed pagination and aggregate query optimization in a later scaling pass. Set your review-session retention policy according to your deployment needs.

## Intentionally postponed

Google review redirection, review editing, translation, Stripe, subscriptions, billing, WhatsApp API, Google Business Profile API and automated password-recovery email delivery. Settings displays account/workspace details; it does not introduce unrequested account-edit or billing features.


## Groq review suggestions

Set server-only `GROQ_API_KEY` and restart the app after changing `.env`. The official `groq-sdk` SDK uses `openai/gpt-oss-20b`; no public API key or client SDK is used. The existing `add_generated_reviews` migration must be applied before running this flow.

After choosing a rating and up to three tags, the customer clicks Generate review suggestions. Successful generation replaces the rating step with selectable suggestions; failures leave the rating saved and offer Retry. The server verifies the signed visitor cookie and active QR, loads the existing rated session and sends only the rating, selected active tag names from the business category, business name, category and location name to Groq. The rating and selected tags are saved before generation; Category and ReviewTag tables remain available. A 30-second timeout, visitor/IP rate limits, and validation enforce 3–4 distinct, short plain strings. The prompt maps all five ratings to their corresponding sentiment and prohibits invented specifics.

Successful results are saved as `generatedReviews` with status `REVIEW_GENERATED`. Repeating a request reuses valid saved suggestions; only Regenerate replaces them. Failed regeneration keeps the previous results. Changing the rating invalidates suggestions for the old input; re-saving an unchanged rating preserves them. Concurrent changes prevent a stale generation response from overwriting the session. Choosing a supplied suggestion saves its exact text in `reviewText`; arbitrary text is rejected. No Google redirect, editing or translation is included.


Groq retries 503/429 at most three total attempts, waiting 1s then 2s. SDK automatic retries are disabled; permanent errors are not retried. The model is configured in GROQ_MODEL in src/lib/groq.ts. JSON mode provides an object envelope; the helper extracts and validates 3–4 plain review strings before saving anything. Failed generation leaves existing suggestions untouched. The public rating → tags → Generate → suggestions flow keeps its compact neutral transient message and Try again button, preserving the chosen rating and tags. Permanent failures retain normal error handling.
# reviewdesk
