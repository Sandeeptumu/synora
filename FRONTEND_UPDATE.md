> This describes the earlier visual refresh. The newer login/backend changes and current validation are in [AUTH_SETUP.md](AUTH_SETUP.md).

# Synora frontend refresh

The frontend now uses a shared ivory and forest-green design system with responsive layouts, local landscape illustrations, image-based navigation cards, animated banners, hover interactions, and reduced-motion support.

Updated surfaces include the landing page, counselor overview, personal home, both dashboard layouts, sign-in and registration styling, and shared cards, forms, tables, buttons, and typography across the remaining pages. All original application routes and real API integrations remain available.

## Demo removal

- Removed demo credentials and one-click demo sign-ins from Login.
- Replaced the demo-focused landing page and its hardcoded operational claims.
- Removed the case-detail action that submitted canned distress text, its simulated progress, and its result panels.
- Removed the unused frontend demo-analysis API helper.
- Set `synora.seed.enabled` to `${SYNORA_SEED_ENABLED:false}`. Fresh starts no longer create sample users, cases, or resources by default.
- Existing database records were not deleted. If your database already contains sample accounts or cases, they remain until deliberately removed by an administrator. Do not reset a database containing real records.
- The backend's existing deterministic AI fallback and demo endpoint still exist; this is a frontend refresh, not a replacement of the AI engine. Provider limitations remain visible in administration.

## Run locally

Start your existing PostgreSQL and Java backend using your normal configuration. Then from `frontend`:

```sh
npm ci
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:8080`. Use your real account, or register through the existing registration flow. The frontend no longer offers demo accounts.

For a production frontend build:

```sh
npm run build
```

For hosting separately from the backend, configure `VITE_API_BASE_URL` before building and permit the frontend origin in the backend CORS configuration. Hosting the static frontend alone does not host Java/PostgreSQL or make authenticated dashboards work.

## Verification

- Vite production build passed.
- Checked local image references and demo-control removal.
- The build reports a large JavaScript chunk; route-level lazy loading is a possible later performance improvement.
- Live browser testing and authenticated end-to-end verification were not performed. The environment denied the local preview server permission to listen on its port.
- Java backend tests were not run; the only backend change is the sample-data seeding configuration.

The archive excludes node_modules, Java build output, IDE metadata, and local secrets. Run `npm ci` to install frontend dependencies.
