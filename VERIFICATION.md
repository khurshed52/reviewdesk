# Verification report

Verified on 27 September 2026 using Node.js 24, Chromium, and a temporary PostgreSQL database. No external Google review was submitted; the browser test intercepted that navigation.

| Check                                   | Result                                               |
| --------------------------------------- | ---------------------------------------------------- |
| Prisma format and schema validation     | Passed                                               |
| Initial migration applied to PostgreSQL | Passed                                               |
| Migration status                        | Database up to date                                  |
| Seed and repeat seed                    | Passed; existing credentials preserved               |
| Strict TypeScript                       | Passed                                               |
| ESLint                                  | Passed, no warnings                                  |
| Prettier                                | Passed                                               |
| Production build                        | Passed, Next.js 16.3.6 with Webpack                  |
| Validation unit tests                   | 5 passed                                             |
| PostgreSQL ownership integration test   | 1 passed                                             |
| Chromium end-to-end suites              | 2 passed against the production server               |
| Dependency audit                        | 0 known vulnerabilities at installation verification |

The end-to-end suite verifies registration, login, logout, authentication redirects, merchant rejection from admin pages, foreign business rejection, business and location CRUD, QR generation and PNG download, actual clipboard copying, public location resolution, no session on refresh alone, one session across repeated ratings, Google-click persistence, 100% conversion for the test interaction, QR deactivation/reactivation, invalid links and responsive mobile navigation. The administrator suite opens all admin pages.

The database test separately verifies business, location and QR ownership rejection, administrator access, tenant-scoped session counts and session uniqueness. Test records are removed afterward. The browser suite resets only its local rate-limit buckets in the dedicated test database so it remains repeatable.

## Limits

- Not deployed to a public domain. Configure production PostgreSQL, HTTPS and `AUTH_URL` before sharing printed QR codes.
- Auth.js uses the explicitly pinned v5 beta release noted in the README.
- Password recovery is a support page; automated recovery emails are not configured.
- QR scans mean engaged sessions, not raw page views or verified published Google reviews.
- Tables paginate loaded data in the browser. Large tenants need database-backed pagination as described in the README.
- AI, payments, translation and external platform API integrations are intentionally postponed.

Screenshots in `docs/` show the local seeded workspace. The source archive excludes `.env`, database files, dependency folders, build output and browser traces.
