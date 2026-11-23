# KN1GHTS — redesign: "The Scoreboard Broadsheet"

## The wow idea (one sentence)

The homepage is the front page of a newspaper printed the morning after the
season: a giant serif headline that is a fact — "Four first places in 2026." —
set over a scoreboard of the real results, with a single red flag marking
every first place.

Why it makes people say wow in the first 2 seconds: the first thing you read
is the team's whole case in one huge, confident line — black ink on warm
paper, one red accent, a composition no other CTF site has — and the proof is
the headline itself, not a slogan. A visitor understands the team before
scrolling, and remembers the page because it looks like a front page, not a
website template. The memorable mark is typographic, not decorative: the red
`1` inside the wordmark — `kn` + red `1` + `ghts` — which is both the team's
name and the thing it keeps finishing as.

## 1. What the current look is trying to be

A cinematic, scroll-jacked "tactical dossier": a fixed WebGL canvas behind
sticky 100dvh chapters, an 18-second locked intro, giant Barlow Condensed
headlines, 8–9px IBM Plex Mono micro-labels, near-black `#050706` with mint
`#2ef2c4`, a custom cursor, animated grain, telemetry and code-rail
decoration. A film-trailer version of a CTF team, where the *feeling* of
being elite is supposed to persuade before any fact is read.

An independent design critique (2 subagents: design critique +
accessibility/performance review, run 2026-11-23 on the first remake's
audit notes) confirmed the same read and added specifics the
redesign answers directly — see §2.

## 2. Flaws in the old look (the ones that decided the redesign)

1. **The 18s scroll-locked intro eats the first impression.**
   `SiteExperience.tsx` adds `intro-lock`, stops Lenis, and advances the
   intro in real time; only then is the lock released. Anchor clicks before
   the intro ends don't navigate — they just end the intro. A recruiter with
   10 seconds sees a loading animation and nothing else.
   *Redesign: no intro at all. No splash, no gate, no skip button — there is
   nothing to skip. The homepage is server-rendered content on first paint.*
2. **The hero's giant wordmark is invisible.** `Story.tsx` renders the `h1`
   as `sr-only`; the `clamp(6rem, 18.8vw, 20rem)` hero type styles a heading
   nobody sees. Visitors get slogans ("MORE THAN A CTF / IT'S A MINDSET.")
   instead of the name or a fact.
   *Redesign: the `h1` is visible, huge, and a fact — "Four first places
   in 2026." The wordmark is visible in the masthead at real size.*
3. **Scroll-jacking turns ~15 sections into an endurance test.**
   Chapters are 140–330dvh tall, each a sticky 100dvh panel holding one
   heading and a 340px paragraph. Results sit thousands of pixels of empty
   scroll below the hero.
   *Redesign: a normal document. Sections are as tall as their content.
   Results are on the first screen.*
4. **Body copy is set to be decoration, not read.** `--soft: #8a918c` on
   `#050706` for all explanatory text; labels at 8–9px tracked-out mono;
   prose at 13px mono in a 340px column.
   *Redesign: body copy is 17px serif at 1.65 line-height, max ~62ch;
   labels are 11px mono, bold, uppercase — labels label, prose reads.*
5. **No visible navigation — only a hamburger.** Six nav links exist only
   inside a full-screen overlay; the header shows a wordmark, a coordinate
   (hidden on mobile), and a hamburger.
   *Redesign: visible nav on desktop (Results, Team, Writeups, About,
   Blog, Contact); a simple menu button only below 860px, with focus
   management and Esc.*
6. **The team is seven identical fake-looking placeholders.** All with
   empty `imageUrl`, six with identical body/meta, rendered as 65vh cards
   with a "KN1" grey box where a photo should be. It reads as invented
   people — worse than a plain list.
   *Redesign: a roster table. Handle, verified link, one verifiable line.
   No portrait cards, no placeholders. Initials monogram (from the real
   handle) only as a small square mark.*
7. **The proof is buried, duplicated, undated, never totalled.** The
   strongest facts live inside paragraph bodies; every result has
   `"date": ""`; the `.stats` big-numbers CSS exists but nothing renders
   it; the same three wins repeat in "updates" and "results".
   *Redesign: one results table, all 7 rows, Rank / Event / Detail /
   Source. The headline total (4× 1st, rating 457, 175.732 pts) is the
   hero. The duplicated "updates" section is deleted; its items are the
   results.*
8. **Two writeups get a desktop-only horizontal-scroll track.** A GSAP
   scrubbed horizontal tween for a total of two links; mobile silently
   gets a different interaction model; the second writeup hides off-canvas.
   *Redesign: two large editorial rows in a ruled list. Same on every
   screen.*
9. **Five of fifteen chapters are empty states.** Projects, journal,
   events, weekly, blog render full chapters announcing nothing is there.
   *Redesign: a section that has no content does not exist on the
   homepage. Events / weekly / blog teasers render only when platform
   data is non-empty.*
10. **Custom cursor, grain, fixed WebGL, blur-reveals: fragile and hostile
    to phones.** `cursor: none` on body (if cursor JS stalls there is no
    pointer); a permanently animating full-screen grain layer; content
    invisible by default (`opacity: 0, filter: blur(14px)`) until GSAP
    reveals it — any failure leaves headings invisible.
    *Redesign: no custom cursor, no grain, no WebGL, no Lenis, no GSAP on
    the homepage. Content is visible by default; the only motion is
    150ms hover transitions. Homepage JS is React + one small menu
    toggle. Fonts are self-hosted via `next/font` (no render-blocking
    Google Fonts `@import`).*
11. **The old homepage didn't match its own claims** (audit snapshot still
    rendered `ComingSoon` for non-preview). The first remake fixed that by
    unlocking the cinematic site; this redesign supersedes it — see §6.

## 3. Three directions considered

### A — "The Scoreboard" (data-first terminal ledger)
Dark `#050706` + mint, Plex Mono as primary text, results table as the
design, no WebGL/grain/cursor, count-up on three headline numbers.
*Pros:* a recruiter gets the case in 10 seconds; identical on phone;
near-zero JS; density flatters small real data. *Cons:* deliberately
un-spectacular — no wow moment; risks reading as a spreadsheet; keeps the
old dark/mint identity, so it would look like a tidier version of the same
site rather than a redesign. The independent critique recommended this
direction as the safe choice.

### B — "The Broadsheet" (editorial / print magazine)
Light paper `#f4f1ea`, near-black ink, serif display (Fraunces) with Plex
Mono only for captions/datelines; masthead, headlines, datelines, rules.
*Pros:* instantly distinct from every dark-terminal CTF site; far more
legible on phones in daylight; makes two writeups feel like articles;
more credible to recruiters and organisers. *Cons:* abandons the dark/mint
identity; a broadsheet with only two articles can feel empty; serif +
light may read as "not a security team" to CTF peers.

### C — "The Arena" (playable terminal)
Homepage as a terminal the visitor runs commands in (`kn1ghts --results`),
plus a tiny safe challenge.
*Pros:* most memorable, most on-brand for a team that organises CTFs.
*Cons:* highest cost; the game is a new failure mode and repeats the old
site's core sin — a gimmick between the visitor and the facts; the static
fallback would have to carry the whole message anyway. Rejected.

### Chosen: A + B — "The Scoreboard Broadsheet"
Direction B's editorial frame and light theme (the wow, the distinction,
the legibility) carrying Direction A's data-first discipline (the results
table is the design, nothing decorative). The broadsheet's risk — "not a
security team" — is answered by keeping Plex Mono for all data/labels,
keeping the precise ruled-table language, and letting the *numbers* do the
intimidating: the page is a record, printed like a newspaper.

## 4. The new theme (changed freely — see user direction 2026-11-23 21:30)

Not bound to the old palette, fonts, or dark-only look. New system:

| Token | Value | Used for |
| --- | --- | --- |
| `--paper` | `#F7F3EA` | Page background (warm paper) |
| `--ink` | `#161513` | Text, rules, masthead, solid buttons |
| `--soft` | `#6B6659` | Secondary text (5.17:1 on paper — passes AA) |
| `--panel` | `#EFE9DB` | Panel / table-header background |
| `--hairline` | `rgba(22,21,19,.16)` | Rules and borders |
| `--flag` | `#B3261E` | **Only** #1 marks, the red `1`, flag glyph, focus ring, link hover underline |
| `--deep` | `#E7DFCC` | Deep surface (form fields) |
| `--tactical` | `#DDD5BF` | Scrollbar / minor surfaces |

Typography — two families only:
- **Fraunces** (Google, via `next/font`, optical sizing, 600/900) —
  display headlines and standfirst/body serif. Headline: 900, tight
  tracking, `clamp(3.4rem, 9.5vw, 8.5rem)`, line-height .95.
- **IBM Plex Mono** (400/500, retained from the old system — it is the
  team's data voice) — labels, nav, tables, numbers, datelines, buttons.
  Labels: 11px, 500, uppercase, letter-spacing .14em. Body: Fraunces 400,
  17px/1.65, max-width 62ch.

Rules of the theme: one accent, used sparingly; no gradients anywhere; no
glass/blur panels; no glow; no purple/blue; no gradient text; solid
1px/3px black rules do the structuring. Buttons are solid ink with paper
text. Focus: 2px solid flag-red, offset 3px, everywhere. Dark mode: none
— the paper theme *is* the identity, on every page. OG image, community
pages, beta gate and footer all use the same paper/ink/red system; the
old mint `#2ef2c4` appears nowhere in the new public UI (the beta gate's
`coming-soon.module.css` was already a light green paper theme and is
left as-is — it harmonises; its green is a gate, not the brand).

Consistency: `settings.theme` in `default.json` is updated to the new
tokens (ink `#161513`, deep `#E7DFCC`, tactical `#DDD5BF`, paper
`#F7F3EA`, soft `#6B6659`, accent `#B3261E`) so `CommunityShell` — which
sets the same CSS variables inline from the CMS — renders community
pages in the new theme automatically. `app/community.css` hard-coded
dark leftovers (`#c7cbc6` article copy, `rgba(5,7,6,.94)` header) are
updated to the paper system. `app/layout.tsx` loads Fraunces + Plex Mono
via `next/font` and drops the `knights-home.css` import; the Google Fonts
`@import` in the old `globals.css` is gone.

## 5. How this avoids AI slop (specific choices)

- **No purple/blue gradient blobs** — flat warm paper, no gradients at
  all, anywhere. The only "background" is paper and one panel tint.
- **No neon cyber grid** — no grid background, no scanlines, no glow.
  Structure comes from 1px and 3px black rules, like a newspaper.
- **No glassmorphism card soup** — there are no cards. Results are a
  table, team is a roster list, writeups are ruled rows, disciplines are
  a ruled list. Information sits directly on the page.
- **No generic "Welcome to Kn1ghts" hero** — the hero is a fact with a
  dateline, not a greeting. No vague tagline as the headline; the tagline
  ("Competitive cybersecurity. Offensive research. CTFs.") is a kicker
  line in mono, small, above the headline where a dateline belongs.
- **No emoji** — none. The only mark is the red `1` and a CSS-drawn
  flag (a 1px pole + red triangle, no image, no emoji).
- **No lorem-style filler** — every line on the page is a verified fact
  or a real link. Empty sections are omitted, not filled with "coming
  soon" copy.
- **No fake stats** — the only numbers are the CTFtime rating (457),
  points (175.732), places, and points per event, each linked to its
  source. No "100+ challenges solved" style invention.
- **No stock-photo operators** — no photos at all. Team members are
  handles in a roster; initials are the only mark, and they come from
  the real handle.
- **No overused gradient text** — headline is solid ink; only the `1`
  in the wordmark and the #1 marks are red, flat.
- **No centred hero + 3 feature cards + testimonial template** — the
  hero is left-aligned, the "features" (disciplines) are a ruled list,
  there are no testimonials, no logos strip, no "trusted by" row.
- **Every section earns its place by information**: masthead (who/where),
  headline + scoreboard (the proof), about (what they do), results table
  (the record), team roster (who), writeups (the work), contact (how to
  reach them), footer (where to verify). If a section carried no real
  information, it was cut — see §2.9.

## 6. What changed vs the first remake (and vs upstream HEAD)

The first remake (never pushed) kept the
cinematic design and only swapped content. This redesign supersedes it:
the 18s WebGL intro, `SiteExperience`, `Story`, the WebGL canvas, Lenis,
GSAP, custom cursor and grain are all removed from the public site. The
`/beta` password gate itself is untouched, but what sits behind it is
now the new homepage, not the old cinematic site — the gate is a
preview door, not a second design. Carried over from the first remake:
the real content in `default.json` (7 members, 7 results, 2 writeups,
LinkedIn About, `publicUrl` → `https://kn1ghts.org`), the `/security`
page, robots/sitemap/SEO fixes, and the on-brand OG image (redrawn in
the new theme).

New files (in `site/`, mirroring repo paths):
- `app/globals.css` — rewritten: new tokens, base, masthead, hero,
  scoreboard table, roster, writeups, contact form, footer, focus,
  reduced-motion. Old chapter/canvas/loader/cursor rules deleted.
- `app/layout.tsx` — Fraunces + Plex Mono via `next/font`, light
  `themeColor`, drops `knights-home.css`.
- `app/page.tsx` — renders the new `HomePage`; keeps preview handling
  (draft previews render with empty platform data, no contact form,
  noindex) and the preview-error state (restyled in the new system).
- `app/beta/page.tsx` — gate unchanged; behind it, the new homepage.
- `app/opengraph-image.tsx` — light broadsheet OG card (paper, ink,
  red `1`, "FOUR FIRST PLACES IN 2026").
- `app/community.css` — hard-coded dark leftovers updated to paper.
- `app/(community)/team/page.tsx` — meta "OPERATORS" → "THE ROSTER".
- `components/home/HomePage.tsx` — the new homepage (server).
- `components/home/HomeHeader.tsx` — masthead + mobile menu (client,
  minimal).
- `backend/content/default.json` — restructured to the new sections
  (hero, results, team, writeups, about, contact…), same real items;
  `updates` section removed (it duplicated results); empty
  projects/journal sections removed; navigation now points at real
  anchors (`#results`, `#team`, `#writeups`, `#about`, `#contact`) and
  real pages; theme updated to §4; labels `skipIntro`/`entering`
  emptied (no intro exists).
- `README.md` — new identity, tokens, routes, data sources.

Deleted (listed in PR_BODY.md; delete via connector):
`components/SiteExperience.tsx`, `components/sections/Story.tsx`,
`components/experience/CyberWorld.tsx`,
`components/experience/ExperienceCanvas.tsx`,
`components/experience/knightModel.ts`,
`components/experience/logoModel.ts`, `components/ui/Cursor.tsx`,
`components/ui/Header.tsx`, `components/ui/SystemLoader.tsx`,
`app/knights-home.css`, `app/image-only.module.css`
(`mascot-home.module.css` is unimported in the audited files — verify
before deleting; `coming-soon.module.css` is kept for the beta gate).
Kept and reused: `components/ui/ContactForm.tsx`,
`components/ui/MemberPortrait.tsx` (used by `/team`),
`components/community/*`, `backend/*`, auth/weekly/events flows,
`app/api/*`.

Untouched on purpose: the Firebase admin app, auth, weekly challenge,
events, and the `/beta` gate all work exactly as before. `package.json`
dependencies are left in place (three/gsap/lenis are now unused on the
homepage; removing them would stale `package-lock.json` — prune in a
follow-up with a lockfile regen, noted in PR_BODY.md). No secrets, keys,
or `.env` values anywhere.

## 7. Self-critique (sceptical visitor on a phone, before shipping)

1. *Weakest thing — the headline could read as bragging without the
   source in view.* Fix: the kicker line directly above the headline
   carries the source ("CTFTIME :!KN^GHTS — 2026 SEASON"), the stat
   strip below the scoreboard carries the rating (457 · 175.732 pts),
   and every scoreboard row links out. The claim and its
   evidence are one glance apart.
2. *Weakest thing — a light paper theme on a phone in a dark room, and
   the red accent on small text.* Fix: red is used only for large/bold
   marks (#1 numerals, the wordmark `1`, flag) and 11px bold labels —
   never for body copy. Soft text `#6B6659` on paper passes AA (5.17:1);
   ink on paper is ~15:1. No dark-mode toggle is offered; the paper
   theme is the identity.
3. *Weakest thing — the scoreboard table on a 360px phone.* Fix: real
   `<table>` with `<th scope>` on desktop; below 720px rows become
   stacked blocks with `td::before { content: attr(data-label) }`, so
   each result reads as a labelled card without losing table semantics.
   The hero scoreboard strip shows the 4 first places; the full 7-row
   table is one short scroll down.

## 8. Validation

- New `default.json` **passes the repo's real Zod `siteSchema`**
  (`backend/lib/schema.ts`, validated 2026-11-23 with zod + esbuild):
  `VALID: true`, 9,174 JSON bytes (limit 250,000). Validation caught
  one real bug during the build — the nav anchor `#about` had no
  matching section id (`approach`); fixed by renaming the section id
  to `about`.
- All 12 TSX/TS files in the package **parse clean** (esbuild).
  Grep confirms zero old-theme leftovers (`#2ef2c4`, `#b7ff3c`,
  `#050706`, `SiteExperience`, `Story`, `knights-home`,
  `image-only`, Barlow) in any new file.
- Full `npm run build` could not be run — no local repo checkout exists
  via the connector (same limitation as the first remake). Validated by
  schema parse + TSX parse + manual re-read instead; the PR's Vercel
  preview is the build check (see PR_BODY.md).

## 9. Data sources (all verified 2026-11-23)

- CTFtime Kn1ghts.org — https://ctftime.org/team/453025 (7 members)
- CTFtime :!Kn^ghts — https://ctftime.org/team/157907 (2026 rating 457,
  175.732 pts; cruXipher 1st, h4ckc0n 2nd, PINK+ 6th, ZeroDay Heist 9th)
- LinkedIn Kn1ghts — https://www.linkedin.com/company/kn1ghts/ (About
  text, Aazhi CTF 2026 1st, ExploitX 1st, BLACKBOX 2026 1st)
- BLACKBOX write-ups — https://github.com/KuantumKnight/BLACKBOX_Writeups/
- In-repo field guide — `/blog/web-ctf-field-guide` (17 Nov 2026, PR #26)

Deliberately left out / unverified: member specialties, photos, personal
socials (not published, not invented); the 5 LinkedIn employees are not
named; the GitHub org link `https://github.com/Kn1ghts-org` is kept from
existing content, not independently verified live; "recruitment is
closed" kept as-is.

## 10. Build-time self-critique fixes (found while building, 2026-11-23)

Re-reading the built files as a sceptical phone visitor found three more
real problems beyond §7, all fixed before shipping:

1. **Nav anchor with no section.** The new navigation linked `#about`,
   but the about section's id was `approach` — the Zod schema's
   anchor check would have rejected the content at publish time.
   Caught by running the real `siteSchema` (see §8). Fixed by renaming
   the section id to `about`.
2. **A date helper that could crash the page.** The events/blog teasers
   called `new Date(x).toISOString()` before the safe `date()` helper;
   an empty or unparseable date would throw `RangeError` during render.
   Fixed by passing the raw value straight to `date()`, which falls
   back to "FIELD REPORT".
3. **Dead code in the homepage.** An unused `SectionHead` component
   (superseded by inline section heads) was removed. All classes the
   reused `ContactForm` and `MemberPortrait` components need
   (`.contact-form`, `.contact-fields`, `.contact-status`,
   `.contact-trap`, `.network-cta`, `.portrait-placeholder`) were
   verified present in the new `globals.css`.

Note on the accessibility/performance subagent: its full report arrived
2026-11-23 16:01 UTC (it reviewed the *old* files — the cinematic system
this redesign deletes). Its ranked checklist maps onto the new design as
follows: (1) kill the 18 s intro — done, there is no intro at all;
(2) lazy-load WebGL — moot, WebGL is deleted entirely; (3) self-host
fonts with `next/font` — done (Fraunces + Plex Mono, no render-blocking
`@import`); (4) code-split the motion stack — moot, no GSAP/Lenis on the
homepage, JS is React + one menu toggle; (5) delete grain + blur reveals
— done; (6) restore the native cursor — done, no `cursor:none`;
(7) focus/menu/skip-link — done, except one gap the report caught that
is fixed here: the skip link's target `<main>` now has `tabindex="-1"`
so focus actually moves (A4); menu has `aria-expanded`/`aria-controls`,
Esc-to-close, and focus return; focus outline is 2 px flag-red;
(8) legibility by construction — measured, not claimed: ink on paper
16.48:1, soft `#6B6659` on paper **5.17:1** (passes AA 4.5:1 — the
earlier "≥5.5:1" claim in this document was wrong and is corrected
here), and the flag red was darkened from `#C8371F` (4.71:1) to
`#B3261E` (**5.90:1** on paper) so the 11 px bold red labels pass AA
with margin; paper on ink buttons 16.48:1; (9) un-jack the scroll —
done, native scroll, no pinned horizontal track, writeup/discipline
titles are real `<h3>`s with one visible `<h1>`; (10) static + cached —
**open**: `force-dynamic` is kept on the homepage because content comes
from the CMS backend; making it static/ISR needs a revalidation
strategy and is a follow-up, not part of this PR. The report's other
notes (Firebase import graph, `ContactForm` labels, `MemberPortrait`
alt text) concern files this PR does not change; a fresh a11y pass on
the live Vercel preview is still recommended before merge.
