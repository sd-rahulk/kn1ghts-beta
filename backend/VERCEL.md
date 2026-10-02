# Deploy KN1GHTS on Vercel

Create **two Vercel projects using the same Git repository**. Keep the `backend/` directory in the repository: the public app imports `backend/lib/schema.ts` and `backend/content/default.json`. Deploying separately does not require separate repositories.

## 1. Prepare the repository

Push the source files and both `package-lock.json` files to GitHub. Exclude `.env.local` files, service-account JSON downloads, `node_modules`, `.next`, and local emulator data. The repository's `.gitignore` covers the environment files and usual Firebase Admin SDK download filenames; check for any credential file you renamed yourself.

## 2. Create both projects

Import the same GitHub repository twice in Vercel → Add New → Project.

| Setting | Public project | Management project |
| --- | --- | --- |
| Example project name | `kn1ghts-site` | `kn1ghts-admin` |
| Root Directory | `.` (repository root) | `backend` |
| Framework | Next.js | Next.js |
| Install Command | `npm ci` | `npm ci` |
| Build Command | `npm run build` | `npm run build` |
| Output Directory | Default | Default |
| Node.js | 22.x or a supported newer version | 22.x or a supported newer version |

Use Vercel's Next.js deployment; do not select a static export or a custom `npm start` command. For the management project, enable **Include source files outside of the Root Directory in the Build Step** to match its tracing-root configuration. Enable Fluid compute in the backend project so the live-refresh stream can run for its configured lifetime. `/api/admin/events` declares a 180-second maximum and closes itself after 120 seconds, then the browser reconnects.

Create the projects and determine their stable **Production domains**, or assign your custom domains. The first deployment may show a setup screen until environment variables are configured. A successful initial public build with no variables uses bundled content, so configure both apps and redeploy before launch.

The example URLs below are illustrative. Replace them with the actual production domains Vercel assigned to your projects:

- Public: `https://kn1ghts-site.vercel.app`
- Management: `https://kn1ghts-admin.vercel.app`

Use these exact origins without a trailing slash. Avoid temporary per-deployment or branch-preview URLs. Keep production backend API access reachable by the public app's server; Vercel Authentication/Deployment Protection must not intercept its production contact or preview requests. The app's Firebase login protects management screens and endpoints. Preview deployment protection can remain enabled.

## 3. Configure backend Production variables

In **the management project's** Settings → Environment Variables, copy the real Firebase values and secrets from `backend/.env.local`. These are:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
FIREBASE_DATABASE_URL
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
CONTACT_API_SECRET
PREVIEW_SECRET
```

Set the two origin values to your deployed domains:

```env
ADMIN_ORIGIN=https://kn1ghts-admin.vercel.app
PUBLIC_SITE_ORIGIN=https://kn1ghts-site.vercel.app
```

For `FIREBASE_PRIVATE_KEY`, paste the entire private key **value**, with `-----BEGIN PRIVATE KEY-----`, the contents, and `-----END PRIVATE KEY-----`. Do not paste the JSON object or include the surrounding JSON quote characters. The backend accepts actual newlines or literal `\n` separators. Do not prefix the private key, service-account email, contact secret, or preview secret with `NEXT_PUBLIC_`.

**Do not add** `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_DATABASE_EMULATOR_HOST`, or `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL` to production.

## 4. Configure frontend Production variables

In **the public project's** Settings → Environment Variables:

```env
FIREBASE_DATABASE_URL=https://YOUR_FIREBASE_DATABASE_HOST
BACKEND_URL=https://kn1ghts-admin.vercel.app
PUBLIC_SITE_ORIGIN=https://kn1ghts-site.vercel.app
CONTACT_API_SECRET=THE_EXACT_SAME_SECRET_AS_THE_BACKEND
```

Copy the exact real database URL and contact secret from your existing configuration. The frontend does not need the Firebase service-account private key or `PREVIEW_SECRET`. Leave `FIREBASE_DATABASE_NAMESPACE` unset. Leave `CONTACT_TRUSTED_IP_HEADER` unset unless you have verified that your deployment proxy overwrites the chosen header.

Select the **Production** environment. If you later create staging/preview environments, use separate origins and preferably a separate Firebase project; do not point arbitrary preview deployments at production data.

## 5. Firebase and content setup

In Firebase Authentication → Settings → Authorized domains, add the deployed management hostname (without `https://`). Add the public hostname as well if you use it in authentication email action/continue URLs. Configure password-reset and verification email templates for the team.

Use the same Firebase project/database so your existing owner, messages, and published content remain available. You do not need to seed defaults or bootstrap an owner again when moving these two apps to Vercel.

Deploy the repository's database rules before public launch:

```powershell
Set-Location backend
npx.cmd firebase login
npx.cmd firebase deploy --only database --project YOUR_FIREBASE_PROJECT_ID
```

The rules expose only `cms/published`, protect private messages/drafts/access, deny direct client writes, and include the inbox's `createdAt` index. Deploying rules does not reset stored content or accounts.

After both apps are deployed, log in to the management app and change **Settings → Public URL** from localhost to the actual public HTTPS address. Save/publish that setting, preserving the current content. Any content links that explicitly use localhost should also be updated; internal section anchors continue to work.

## 6. Redeploy and verify

After setting/changing environment variables, redeploy **both projects**. Variables apply to new deployments; Firebase client settings are included during the backend build.

Check the production URLs:

1. The frontend reads your current published content.
2. Management login works with the existing approved, verified account.
3. Editing and saving a draft leaves the public content unchanged.
4. A saved draft preview opens; publishing then updates the public website on refresh.
5. One test contact submission appears in the backend Inbox.
6. A signed-out request to `/api/admin/messages` returns 401; unauthenticated reads of database `/messages.json` and `/cms/draft.json` return permission denied.

If login reports an origin/CSRF problem, check `ADMIN_ORIGIN` against the URL actually in the browser. If contact fails, check matching `CONTACT_API_SECRET`, `PUBLIC_SITE_ORIGIN`, `BACKEND_URL`, and whether the production backend API is intercepted by Vercel Deployment Protection. Read the failing project's Vercel function logs for server errors. Keep credentials and message contents out of copied logs.

## References

- [Vercel monorepo projects](https://vercel.com/docs/monorepos)
- [Root Directory and external source files](https://vercel.com/docs/monorepos/monorepo-faq)
- [Environment variables and redeployment](https://vercel.com/docs/environment-variables)
- [Function durations with Fluid compute](https://vercel.com/docs/functions/limitations)
- [Deployment Protection](https://vercel.com/docs/deployment-protection)
