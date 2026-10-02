# KN1GHTS management

A separate Next.js app in `backend/`, connected to the existing public website through Firebase Realtime Database. Email/password accounts authenticate through Firebase Auth; the server creates a five-day HttpOnly session. The public website keeps its cinematic theme and animations.

## What you can manage

- Add, remove, reorder, hide, and change section layouts. Edit headings, descriptions, buttons, links, images, dates, categories, and items for the existing sections or a new Text & cards section.
- Edit site identity, search metadata, navigation, footer links, UI labels, contact labels, and CSS theme colors. Section IDs stay stable so existing links continue to work. Animation/model settings stay in the public site's source code.
- Save drafts, create a ten-minute preview link, and publish separately. Preview links show the saved draft and disable message submission. Anyone holding the link can see that draft until expiration; disabling its creator's access invalidates it.
- See revision notes, field changes, editor identity, and timestamps. Download full snapshots or restore a revision into a new draft before publishing it.
- Receive contact messages in a private inbox with live updates, status, internal notes, and activity records.
- Grant owner, editor, or viewer access. Owners manage accounts; editors manage content and messages; viewers can read content, history, and messages. The last active owner cannot be disabled or demoted.
- Export/import the current draft as JSON. Concurrent edits use a version check; a stale save never silently overwrites another editor's work. Unsaved drafts remain while switching management screens.

History here records **CMS content revisions**, rather than Git commits or arbitrary source-code deployments. Application code, layout implementations, Firebase configuration, and deployment secrets require source-code/deployment changes. This checkout does not contain a Git repository.

## Local demo

Requirements: Node.js 22 or newer, npm, and Java 21 or newer for Firebase emulators. Commands below run from the repository root; on Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.

```powershell
npm.cmd install
npm.cmd install --prefix backend
Copy-Item .env.emulator.example .env.local
Copy-Item backend/.env.emulator.example backend/.env.local
```

Copy the examples only when you want local emulator configuration; keep any existing production environment files separately.

Start the emulators in one terminal:

```powershell
$env:FIREBASE_EMULATORS_PATH = Join-Path (Get-Location) '.firebase-emulators'
npm.cmd run emulators --prefix backend
```

In a second terminal, seed the accounts, then start the management app:

```powershell
npm.cmd run seed:emulator --prefix backend
npm.cmd run backend:dev
```

In a third terminal, start the public website:

```powershell
npm.cmd run dev
```

| App | URL |
| --- | --- |
| Management | http://localhost:3001 |
| Public website | http://localhost:3000 |
| Emulator inspection UI | http://127.0.0.1:4000 |

Demo owner: `owner@kn1ghts.test`; password: `Kn1ghts-local-only-2026!`. The same password works for `editor@kn1ghts.test` and `viewer@kn1ghts.test`. These accounts exist only in the local emulators. The seed script is deliberately restricted to `demo-kn1ghts` on the configured loopback ports. Emulator data is temporary unless you use Firebase CLI import/export. Emulator hosts are rejected when `NODE_ENV=production`.

The seed contains the current public content. Change a field, save a draft with a note, preview it, then publish. Refresh the public website to see published content. A public page load reads the published snapshot; it does not subscribe every visitor to private admin events.

## Connect a real Firebase project

1. Create a Firebase project on the Spark plan and register a web app. Enable **Email/Password**, not passwordless email links, in Authentication → Sign-in method. Configure a password policy and email enumeration protection. Set the public-facing email templates and authorized domains for your management hostname and development localhost when needed.
2. Create **Realtime Database** in locked mode. Copy its exact URL, including its regional hostname if applicable.
3. Copy `backend/.env.example` into `backend/.env.local`. Fill the web app API key, auth domain, and project ID. These `NEXT_PUBLIC_` web configuration values are public identifiers. Add the database URL and canonical management/public origins without trailing slashes.
4. Generate a service-account credential through Firebase project settings. Put its client email and private key in the **backend's server environment only**. `FIREBASE_PRIVATE_KEY` accepts escaped `\n` newlines. Never expose a private key or either application secret through a `NEXT_PUBLIC_` variable, the public app, a commit, or an image URL.
5. Generate two independent random secrets, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Use one as `CONTACT_API_SECRET` on both apps, and the other as `PREVIEW_SECRET` on the backend only.
6. Deploy the included database rules to your actual project:

   ```powershell
   Set-Location backend
   npx.cmd firebase login
   npx.cmd firebase deploy --only database --project YOUR_FIREBASE_PROJECT_ID
   Set-Location ..
   ```

   Rules allow unauthenticated reads only at `cms/published`, deny all direct client writes, and deny reads of drafts, revisions, messages, access, and throttling records. Privileged operations run through the server, which independently authenticates and authorizes every request. Never replace these with test-mode rules.

7. Bootstrap the first owner using server credentials:

   ```powershell
   npm.cmd run bootstrap --prefix backend -- your-owner@email.com
   ```

   It creates an account if needed and refuses to replace an existing owner. It does not assign a hardcoded password or send email. On the login screen, enter the owner email and choose **Set up or reset your password**. Open Firebase's password reset email, set a password, and sign in. If the email is unverified, choose **Send verification email**, verify it, then sign in again.

8. On the public app, fill the root `.env.local` using `.env.example`: the same database URL, backend URL, public origin, and matching contact secret. Remove `FIREBASE_DATABASE_NAMESPACE` outside emulators. On both apps remove all emulator environment variables.
9. Start the backend, sign in, set **Settings → Public URL** to your actual public website, review the seeded sections, and publish the first snapshot. Use **Team access** to grant additional emails. New accounts use the same password-reset and verification setup; there is no public registration screen.

## Deploy

For Vercel, follow the step-by-step [two-project deployment guide](VERCEL.md).

Deploy the root public app and `backend/` as two Next.js Node deployments with Node.js 22+. Both must serve HTTPS in production. Set `ADMIN_ORIGIN` to the exact backend origin and `PUBLIC_SITE_ORIGIN` to the exact public origin. The public deployment needs a reachable `BACKEND_URL`; its server calls the backend for contact submissions and signed preview requests. No browser CORS connection between the two apps is required.

```powershell
npm.cmd run build
npm.cmd run backend:build
# Each deployment then runs its own npm start.
```

Build Firebase web configuration into the backend deployment; `NEXT_PUBLIC_` values are build-time variables. Provide server secrets to the runtime. The service account is never needed in the public deployment. Session cookies use `Secure`, `HttpOnly`, `SameSite=Strict`, a host-only `__Host-` name, and `/` scope in production. Requests that change admin state require the exact origin and a CSRF cookie/token. Every protected request checks token revocation and current database membership. Disabling access takes effect on subsequent requests.

The backend provides server-sent events for inbox/content refresh. A Node server must support streaming responses; disable reverse-proxy buffering for `/api/admin/events`. Streams close after two minutes and reconnect automatically, with heartbeat and periodic session rechecks. Serverless platforms with shorter connection limits need compatible streaming support; otherwise refresh the screen to fetch current data.

Set `CONTACT_TRUSTED_IP_HEADER` on the public deployment only if your reverse proxy **overwrites** that header with a trustworthy client IP. Leaving it empty uses a normalized email-based throttle plus a global throttle. Contact accepts three messages per hour per key and twenty per minute globally, uses a hidden honeypot, bounded payloads, and validates input on both servers. Origin checking alone is not bot protection; add your hosting provider's rate limiting/challenge at the edge if public abuse requires it. Never forward arbitrary client-supplied IP headers as trusted identity.

The frontend retains the bundled initial content if the published database cannot be read. Admin writes and contact submission fail closed when credentials or services are unavailable. Preview failures display an explicit unavailable screen.

## Costs and operations

The app uses Firebase email/password Auth and Realtime Database; it requires no Firebase Functions, Firestore, Storage, or App Hosting. Images use URLs, rather than file uploads. Firebase Spark has usage limits: Realtime Database currently includes 100 simultaneous connections, 1 GB stored, and 10 GB/month downloaded. Hosting these two Next.js servers is a separate provider decision; this code cannot guarantee free hosting or unlimited traffic. Check [Firebase pricing](https://firebase.google.com/pricing) and [Realtime Database billing](https://firebase.google.com/docs/database/usage/billing) before deployment.

Each revision preserves a full content snapshot and diff. The transaction atomically commits the draft/published version and its audit record. History is append-only through the app, but anyone with Firebase Admin credentials can modify database records; this is not a cryptographic or regulatory audit ledger. Back up the database regularly using an owner-controlled export, retain copies outside the project, and monitor database storage/downloads. Snapshots and contact/rate-limit records are retained; prune or archive them through an intentional server/admin maintenance process as the project grows. Large revision collections increase transaction payloads and must be monitored under Spark quotas. Do not delete the active owner or `cms` accidentally.

Preview URLs are bearer credentials; avoid sharing them publicly or retaining their query strings in access/analytics logs. Rotate secrets and Firebase service-account keys through the deployment platform if exposed. Password resets and disabled membership revoke access; **Sign out all sessions** also revokes Firebase refresh/session tokens for that user.

Firebase's [session cookie documentation](https://firebase.google.com/docs/auth/admin/manage-cookies) describes the underlying authentication flow.

## Validation

If the inbox reports a missing database index, deploy `database.rules.json`. To add just the inbox index to an existing ruleset while preserving its permissions, run `node scripts/check-firebase.mjs --repair-index` from `backend/`. The script backs up the previous rules in the ignored `.firebase/` folder, adds `messages/.indexOn: ["createdAt"]`, and verifies the inbox query without displaying messages. Without the flag it only checks the query.

```powershell
npm.cmd run lint
npm.cmd run lint --prefix backend
npm.cmd run backend:test
npm.cmd run build
npm.cmd run backend:build
npm.cmd audit --omit=dev --prefix backend
# Requires both apps and the seeded local emulators running:
npm.cmd run test:integration --prefix backend
```

The integration suite uses fixed localhost URLs and local emulator accounts; it verifies session and role enforcement, verified email, CSRF/origin, stale version rejection, draft/publish separation, public section ordering/visibility, restore/history, identity attribution, private database reads, preview signing, contact delivery/throttling, inbox updates, last-owner protection, and revocation across sessions. It restores the bundled initial content after a successful run and leaves real test revisions/messages in the **local** database.

`node backend/scripts/browser-qa.mjs` additionally checks the actual Firebase login, every management screen, the public hero/contact section at desktop/mobile sizes, and long-copy expansion through a local Chrome debug session on port 9222, saving screenshots to `responsive_screenshots/`.

Real Firebase credentials, rules deployment, production email delivery, and hosting configuration still need to be supplied and validated for your project before going live.
