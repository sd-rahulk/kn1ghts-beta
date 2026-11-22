# KN1GHTS coming-soon and private beta

The public `/` is intentionally a tiny, friendly under-construction page. The **Team** and **Blog** routes remain public and fully functional. No route is globally redirected.

## Public and private routes

| URL | Behavior |
| --- | --- |
| `https://kn1ghts.org/` | Minimal coming-soon page, linked to Team and Blog |
| `https://kn1ghts.org/team` | Existing public Team page |
| `https://kn1ghts.org/blog` | Existing public Blog and article routes |
| `https://kn1ghts.org/beta` | Password-gated **original cinematic homepage**, unchanged once signed in |
| `https://kn1ghts.org/?preview=...` | Existing time-limited CMS draft previews, still verified by the backend |
| `/contact`, `/events`, `/inhouse-weekly`, `/sign-in` | Preserve existing functionality and URLs |

The beta route is intentionally **not linked** from the public coming-soon page or sitemap. It sends noindex headers and metadata. It returns a password screen unless a valid signed session cookie is present. A preview token alone cannot bypass `/beta` authentication.

## Production configuration — friend who owns Vercel project

In **Vercel → public frontend project (`kn1ghts-beta`) → Settings → Environment Variables**, add a server-only environment variable:

```text
BETA_ACCESS_PASSWORD=<a fresh random secret of at least 24 characters>
```

Generate it yourself, for example:

```bash
openssl rand -hex 24
```

**Never put the actual secret into Git, a public issue, a screenshot, a client-side `NEXT_PUBLIC_` value, or this chat.** Do not reuse a real personal password. Setting the variable requires a new Vercel deployment. The password is only needed by the **public frontend Vercel project**, not the separately deployed management backend.

If `BETA_ACCESS_PASSWORD` is absent or shorter than 24 characters, access fails closed: `/beta` displays a configuration notice and refuses login. A successful login creates a scoped, HttpOnly, SameSite=Strict session cookie; its signed expiry is 12 hours. Rotating the password invalidates all previous sessions. Requests to `/beta` are never publicly cached.

## Validation

1. Open `/` in an incognito browser. You should see only the cute construction page, not the cinematic WebGL loader.
2. Follow the two links to `/team` and `/blog`. Neither should require a password.
3. Open `/beta` without a cookie. It should show the password gate.
4. Enter a wrong code. The original homepage must stay hidden.
5. Enter the configured secret over HTTPS. The original cinematic homepage must appear at `/beta`.
6. Verify that `/beta?preview=anything` does not bypass the gate, and that the public homepage's existing real CMS preview links still work for authorized editors.
7. Verify `/contact`, account creation, and weekly challenge pages still render normally.
8. Check `/robots.txt` and `/sitemap.xml` as before. Beta must not be listed.
9. CI runs `node scripts/seo-smoke.mjs` against the built production server, testing the construction screen, public routes, private beta gating, cookie expiry mechanics, and old experience behind the gate.

## Before publishing a community challenge

The codebase already has an admin-managed weekly CTF system, verified-user flag submissions, rate limiting, and leaderboard support. It is **not appropriate to publish an unreviewed puzzle into production** while the website is under construction.

To prepare a reproducible beginner challenge without exposing a real flag:

```bash
node scripts/prepare-weekly-ctf.mjs
```

This creates `.private/weekly-challenge-draft.json` with a fresh secret, an encoded Base64 transmission, and `status: "draft"`. The file must remain private; `.private/` is ignored by Git. Copy only the challenge fields into the management app's **Challenges** editor, run an authorized local emulator test (`npm run test:integration --prefix backend` after configuring emulators), and schedule publication when ready. Do not announce an event or challenge before admins have verified the full login and flag submission flow.

**Recruitment:** the Join form and application inbox already exist. Backend integration tests include submission, private inbox persistence, verified accounts, flag submission, leaderboard, and moderation. A production end-to-end test of email delivery and admin review requires the site's authorized owner and test accounts; do not submit fake applications to production just to improve an apparent QA score.
