# Google, phone, and email authentication

The sign-in and registration pages now have animated backgrounds, floating leaves, entrance motion, focus effects, password visibility controls, and reduced-motion support. The public role selector is removed. The backend assigns every public registration the `VICTIM` role (the personal dashboard), even if a client sends `ADMIN`, `COUNSELOR`, or `CASE_OFFICER`.

## What works without provider configuration

Email/password registration and login use the existing Synora backend. Existing staff accounts retain their roles. Google and phone controls remain disabled with a clear email fallback until both frontend Firebase settings and the backend project ID are configured.

## Enable Google and SMS sign-in

1. Create or select a Firebase project and register a web application. Enable Google and Phone in Authentication → Sign-in method.
2. Add your deployed frontend domain to Authentication → Settings → Authorized domains. Configure the allowed SMS regions. Firebase documents that `localhost` is not a supported hosted domain for phone authentication, so verify real SMS sign-in on an authorized HTTPS deployment. Check your Firebase project's billing and SMS quota before testing real messages. Follow the [official phone authentication setup](https://firebase.google.com/docs/auth/web/phone-auth).
3. Copy `frontend/.env.example` to `frontend/.env.local`. Fill all four `VITE_FIREBASE_*` values using the web app configuration from Firebase Project settings. These are web configuration values, not Admin credentials. Restart Vite or rebuild after changes. Follow the [Google provider setup](https://firebase.google.com/docs/auth/web/google-signin).
4. Configure the Java process with `FIREBASE_PROJECT_ID` for that same project. For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to an absolute path to your Admin service-account JSON stored outside this project. On Render, set `FIREBASE_SERVICE_ACCOUNT_BASE64` to the one-line base64 encoding of that JSON. Do not put the Admin JSON in frontend files, public assets, variables prefixed with `VITE_`, or the repository. See [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).
5. Apply the SQL below if upgrading an existing PostgreSQL database, then restart the Java backend. A fresh database uses the project's existing Hibernate schema creation settings.
6. If the frontend and backend use separate origins, set `VITE_API_BASE_URL` to the HTTPS backend origin and add the frontend origin to `CORS_ORIGINS`. Vite's `/api` development proxy is not part of a static production deployment.

### Vercel + Render required variables

Vercel must build the `frontend` directory with `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com`. Render must have `FIREBASE_PROJECT_ID=synora-b6774`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, the PostgreSQL variables, a production `JWT_SECRET`, and `CORS_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app`. Redeploy both services after changing build-time variables.

A root `.env` is a template only; Java does not automatically load it. Set backend variables in your IDE's run configuration, process environment, or hosting secrets/settings.

## Database upgrade

Apply `backend/migrations/20260909_external_auth.sql` to your existing PostgreSQL database before running this release. It adds the unique `firebase_uid` column and allows phone-only accounts to have no email or password hash. It preserves existing users, roles, passwords, and related records. Take your normal database backup before applying schema changes.

The SQL is provided as an explicit migration; this project has no automatic migration runner. It has not been applied to your database by this update.

## Sign-in behavior

- Email: existing email/password login and JWT sessions continue to work.
- Google: Firebase handles the popup; the Java Admin SDK verifies the ID token, including revocation/disabled-provider-user checks, and requires a verified Google email.
- Phone: Firebase handles reCAPTCHA, SMS delivery, and code verification. The UI supports six-digit codes, resend cooldown, number correction, and readable failures. The backend requires the verified phone claim.
- New provider identities create personal accounts without generated sample data or fabricated email addresses.
- Existing provider identities reuse the same Synora account and keep its database role.
- Existing email/password accounts are not silently merged with a Google identity. If the email already exists, use its existing password login. Account linking is not included in this update. Signing in by phone does not grant access to an existing account merely because its editable contact phone matches; it uses the verified Firebase UID.
- New provider members without a display name are named “Synora member.”
- The local user ID is the JWT subject. Each authenticated request checks the user's active status and current role in the database, so deactivation or a role change takes effect for existing sessions. Older Synora JWTs with their `uid` claim still resolve correctly.
- The frontend stores phone-only sessions correctly and shows the phone number in the personal profile when no email exists.

## Endpoints

- `POST /api/auth/register`: `{ "fullName": "Your name", "email": "you@example.com", "password": "..." }`
- `POST /api/auth/login`: `{ "email": "you@example.com", "password": "..." }`
- `GET /api/auth/providers`: Firebase configuration availability. A configured project ID is not a provider connectivity/credential health check.
- `POST /api/auth/firebase`: `{ "idToken": "Firebase client ID token", "fullName": "Optional name" }`

The server validates tokens using the [Firebase Admin verification flow](https://firebase.google.com/docs/auth/admin/verify-id-tokens). It issues the existing Synora response shape with an additional `phone` field. Provider tokens and SMS codes are not stored in Synora's database.

## Verification and remaining setup

- Frontend production build passed.
- All 35 backend unit tests passed, including 18 new auth tests for role enforcement, provider claims, duplicate-account handling, phone-only identities, inactive accounts, and JWT role/status checks.
- No real SMS was sent and no live Google account was used. Firebase credentials and an authorized phone-auth domain were not supplied.
- The database migration and full sign-in-to-dashboard flows still need verification against your configured PostgreSQL/backend/Firebase environment.

Run locally with `npm ci` then `npm run dev` from `frontend`; run `./mvnw test` and `./mvnw spring-boot:run` from `backend` after configuring PostgreSQL. The zip excludes dependencies, build output from Java, and credentials.
