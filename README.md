# kn1ghts — Cybersecurity & CTF Team in India

**Official website:** [kn1ghts.org](https://kn1ghts.org/)

kn1ghts is an India-based cybersecurity team and community participating in Capture the Flag (CTF) competitions and sharing technical security field notes. The public homepage is the team's front page: real competition results, the real roster, and real writeups — no intro sequence, no gate.

- [Team](https://kn1ghts.org/team)
- [Security field notes](https://kn1ghts.org/blog)
- [Competition results](https://kn1ghts.org/pow)
- [Security policy](https://kn1ghts.org/security)

---

# KN1GHTS UI Registry

The separate management app lives in [`backend/`](backend/README.md). Its setup guide covers Firebase, email/password login, dynamic public content, contact inbox, publishing, and revision history. Start it with `npm.cmd run backend:dev` after configuring Firebase or the local emulators.

## Baseline — "The Scoreboard Broadsheet" (redesign, 2026-11-23)

The homepage is the front page of a newspaper printed the morning after the season: a giant serif headline that is a fact — "Four first places in 2026." — set over a scoreboard of the real results, with a single red flag marking every first place. No intro, no WebGL, no scroll-jacking. See [`docs/DESIGN.md`](docs/DESIGN.md) for the full critique, the directions considered, and how AI slop was avoided.

| Property | Pattern |
| --- | --- |
| Page background | `--paper: #F7F3EA` (warm paper, light theme everywhere) |
| Primary text | `--ink: #161513` |
| Secondary text | `--soft: #6B6659` (5.17:1 on paper — passes AA) |
| Accent | `--flag: #B3261E` — used only for #1 marks, the red `1` in the wordmark, flag glyphs, focus rings, and link hovers |
| Panels / hairlines | `--panel: #EFE9DB`, `--deep: #E7DFCC`, hairline `rgba(22,21,19,.16)`; sharp corners only |
| Display type | Fraunces (serif, 600/900, italic for emphasis), via `next/font` — self-hosted |
| Technical type | IBM Plex Mono, 11px to 13px, uppercase labels with restrained letter spacing |
| Spacing | Fluid page inset from 16px to 20px; sections only as tall as their content |
| Interactive state | Ink fill buttons; red on hover; 2px red focus outline with 3px offset |
| Shadows / effects | None. No gradients, no glass/blur, no glow, no grid backgrounds |
| Motion | 150ms hover transitions only; full `prefers-reduced-motion` support; homepage JS is React plus one menu toggle |

### Homepage

File: `components/home/HomePage.tsx` (server component) + `components/home/HomeHeader.tsx` (client, mobile menu only)

Pattern notes: the hero is a masthead, a kicker carrying the CTFtime source, one factual headline, a standfirst, and the four first-place finishes as a scoreboard. Results are a real `<table>` (stacked labelled rows below 720px). The roster is a table-like list with initials monograms — no portrait cards, no stock photos. Empty sections (events, weekly challenge, blog teasers) render only when platform data exists; there are no filler sections.

### Content rules

- Real data only: members, results, and writeups come from `backend/content/default.json` and link out to their public records (CTFtime, LinkedIn, GitHub). Never invent a member, role, result, or writeup.
- The wordmark is `kn` + red `1` + `ghts` — the name and what the team keeps finishing as.

## Search engine and AI search visibility

The public app now generates `/robots.txt`, `/sitemap.xml`, optional `/llms.txt`, and canonical / structured-data metadata. See [SEO and crawler deployment instructions](docs/SEO_DISCOVERY.md) for Google Search Console, Bing Webmaster Tools, OpenAI crawler access, and the Vercel project owner's deployment checklist.
